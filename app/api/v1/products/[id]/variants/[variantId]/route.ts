import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  priceOverride: z.number().positive().nullable().optional(),
  costOverride: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const VARIANT_INCLUDE = {
  attributes: {
    include: {
      attributeValue: {
        include: { attribute: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

/** GET /api/v1/products/[id]/variants/[variantId] */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { variantId } = await params;
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: VARIANT_INCLUDE,
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json({ variant });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/products/[id]/variants/[variantId]");
  }
}

/** PUT /api/v1/products/[id]/variants/[variantId]
 * Update price override, stock, SKU, barcode, etc.
 * Attribute combination cannot be changed here — delete and recreate the variant instead.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { variantId } = await params;
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateVariantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: parsed.data,
      include: VARIANT_INCLUDE,
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "VARIANT_UPDATED",
      targetType: "PRODUCT_VARIANT",
      targetId: variantId,
      metadata: parsed.data,
    });

    return NextResponse.json({ variant });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/products/[id]/variants/[variantId]");
  }
}

/** DELETE /api/v1/products/[id]/variants/[variantId] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { variantId } = await params;
    const existing = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { _count: { select: { saleItems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    // Soft-delete if it has sales history, hard-delete otherwise
    if (existing._count.saleItems > 0) {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Variant deactivated (has sale history)" });
    }

    await prisma.productVariant.delete({ where: { id: variantId } });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "VARIANT_DELETED",
      targetType: "PRODUCT_VARIANT",
      targetId: variantId,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ message: "Variant deleted" });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/products/[id]/variants/[variantId]");
  }
}
