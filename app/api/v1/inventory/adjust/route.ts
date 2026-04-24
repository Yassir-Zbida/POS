import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const adjustSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qtyDelta: z.number().int(),
  type: z.enum(["ADJUSTMENT", "DAMAGE", "RESTOCK"]).default("ADJUSTMENT"),
  note: z.string().optional(),
});

/** POST /api/v1/inventory/adjust — manual stock adjustment */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { productId, variantId, qtyDelta, type, note } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const newStock = product.stock + qtyDelta;
    if (newStock < 0) {
      return NextResponse.json({ error: "Stock cannot go below zero" }, { status: 400 });
    }

    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: { productId, variantId, type, qtyDelta, note, userId: auth.user.id },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
      ...(variantId
        ? [prisma.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: qtyDelta } },
          })]
        : []),
    ]);

    // Auto-create low-stock notification
    if (newStock <= product.minStock) {
      const notifType = newStock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK";
      await prisma.notification.create({
        data: {
          type: notifType,
          title: notifType === "OUT_OF_STOCK" ? "Out of stock" : "Low stock alert",
          message: `Product "${product.nameFr}" — stock is now ${newStock} (min: ${product.minStock})`,
          refType: "PRODUCT",
          refId: productId,
        },
      });
    }

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "STOCK_ADJUSTED",
      targetType: "PRODUCT",
      targetId: productId,
      metadata: { qtyDelta, type, note, newStock },
    });

    return NextResponse.json({ movement, newStock });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/inventory/adjust");
  }
}
