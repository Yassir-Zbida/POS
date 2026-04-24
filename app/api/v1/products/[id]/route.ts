import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const updateSchema = z.object({
  type: z.enum(["SIMPLE", "VARIABLE", "SERVICE"]).optional(),
  nameFr: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  /// Replace the full set of attributes (pass empty array to remove all)
  attributeIds: z.array(z.string()).optional(),
});

/** GET /api/v1/products/[id] */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        attributes: {
          include: {
            attribute: {
              include: { values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } },
            },
          },
        },
        variants: {
          include: {
            attributes: { include: { attributeValue: { include: { attribute: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
        movements: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/products/[id]");
  }
}

/** PUT /api/v1/products/[id] */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { attributeIds, ...rest } = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        // Replace all attribute links when attributeIds is provided
        ...(attributeIds !== undefined
          ? {
              attributes: {
                deleteMany: {},
                create: attributeIds.map((attributeId) => ({ attributeId })),
              },
            }
          : {}),
      },
      include: {
        category: true,
        attributes: {
          include: {
            attribute: {
              include: { values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } },
            },
          },
        },
        variants: {
          include: {
            attributes: { include: { attributeValue: { include: { attribute: true } } } },
          },
        },
      },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "PRODUCT_UPDATED",
      targetType: "PRODUCT",
      targetId: product.id,
      metadata: parsed.data,
    });

    return NextResponse.json({ product });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/products/[id]");
  }
}

/** DELETE /api/v1/products/[id] — soft delete */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await prisma.product.update({ where: { id }, data: { isActive: false } });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "PRODUCT_DELETED",
      targetType: "PRODUCT",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/products/[id]");
  }
}
