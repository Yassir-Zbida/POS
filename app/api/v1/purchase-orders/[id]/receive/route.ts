import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const receiveSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      qtyReceived: z.number().int().positive(),
    }),
  ).min(1),
});

/** POST /api/v1/purchase-orders/[id]/receive — mark PO as received, update stock */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    if (order.status === "RECEIVED" || order.status === "CANCELLED") {
      return NextResponse.json({ error: `Order is already ${order.status.toLowerCase()}` }, { status: 409 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const itemMap = new Map(order.items.map((i) => [i.id, i]));

    await prisma.$transaction(async (tx) => {
      for (const { itemId, qtyReceived } of parsed.data.items) {
        const item = itemMap.get(itemId);
        if (!item) continue;

        const actualQty = Math.min(qtyReceived, item.qtyOrdered - item.qtyReceived);
        if (actualQty <= 0) continue;

        await tx.purchaseOrderItem.update({
          where: { id: itemId },
          data: { qtyReceived: { increment: actualQty } },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: actualQty } },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            type: "PURCHASE",
            qtyDelta: actualQty,
            refId: id,
            refType: "PURCHASE_ORDER",
            userId: auth.user.id,
          },
        });
      }

      // Check if fully received
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { orderId: id } });
      const fullyReceived = updatedItems.every((i) => i.qtyReceived >= i.qtyOrdered);

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: fullyReceived ? "RECEIVED" : "PARTIAL",
          receivedAt: fullyReceived ? new Date() : undefined,
        },
      });
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: { select: { id: true, nameFr: true, sku: true, stock: true } } } } },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "PO_RECEIVED",
      targetType: "PURCHASE_ORDER",
      targetId: id,
      metadata: { items: parsed.data.items },
    });

    return NextResponse.json({ order: updated });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/purchase-orders/[id]/receive");
  }
}
