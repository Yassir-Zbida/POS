import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const refundSchema = z.object({
  reason: z.string().min(1),
  itemIds: z.array(z.string()).optional(), // if empty → full refund
});

/** POST /api/v1/sales/[id]/refund */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Only managers can process refunds" }, { status: 403 });
    }

    const { id } = await params;
    const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    if (sale.status === "REFUNDED") {
      return NextResponse.json({ error: "Sale already fully refunded" }, { status: 409 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { reason, itemIds } = parsed.data;
    const itemsToRefund = itemIds?.length
      ? sale.items.filter((i) => itemIds.includes(i.id))
      : sale.items;

    const isFullRefund = itemsToRefund.length === sale.items.length;

    await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of itemsToRefund) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            type: "RETURN",
            qtyDelta: item.quantity,
            refId: sale.id,
            refType: "REFUND",
            note: reason,
            userId: auth.user.id,
          },
        });
      }

      await tx.sale.update({
        where: { id },
        data: { status: isFullRefund ? "REFUNDED" : "PARTIAL_REFUND" },
      });
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "SALE_REFUNDED",
      targetType: "SALE",
      targetId: id,
      metadata: { reason, isFullRefund, itemIds },
    });

    return NextResponse.json({ success: true, isFullRefund });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/sales/[id]/refund");
  }
}
