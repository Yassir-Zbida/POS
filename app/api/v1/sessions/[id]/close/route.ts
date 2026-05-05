import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { assertManagerAdminOrCashierPermission, getCashierIdsForManager } from "@/lib/cashier-permissions";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const closeSchema = z.object({
  floatClose: z.number().min(0),
  notes: z.string().optional(),
});

/** POST /api/v1/sessions/[id]/close */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const session = await prisma.cashRegisterSession.findUnique({
      where: { id },
      include: { sales: { select: { totalAmount: true, paymentMethod: true } } },
    });

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "CLOSED") {
      return NextResponse.json({ error: "Session is already closed" }, { status: 409 });
    }

    if (auth.user.role === ROLES.CASHIER) {
      if (session.cashierId !== auth.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const denied = assertManagerAdminOrCashierPermission(auth.user, "sessionsManage");
      if (denied) return denied;
    } else if (auth.user.role === ROLES.MANAGER) {
      const teamIds = await getCashierIdsForManager(auth.user.id);
      if (!session.cashierId || !teamIds.includes(session.cashierId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = closeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { floatClose, notes } = parsed.data;

    // Calculate expected cash: opening float + cash movements + cash sales
    const cashSalesTotal = session.sales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);

    const cashMovements = await prisma.cashMovement.findMany({ where: { sessionId: id } });
    const movementsNet = cashMovements.reduce((sum, m) => {
      return sum + (m.type === "CASH_IN" ? Number(m.amount) : -Number(m.amount));
    }, 0);

    const expectedCash = Number(session.floatOpen) + cashSalesTotal + movementsNet;
    const variance = floatClose - expectedCash;

    const closed = await prisma.cashRegisterSession.update({
      where: { id },
      data: { status: "CLOSED", floatClose, variance, closedAt: new Date(), notes },
    });

    // Notify if variance exceeds 50 MAD threshold
    if (Math.abs(variance) > 50) {
      await prisma.notification.create({
        data: {
          type: "SESSION_VARIANCE",
          title: "Cash variance detected",
          message: `Session ${id}: expected ${expectedCash.toFixed(2)} dh, counted ${floatClose.toFixed(2)} dh (variance: ${variance.toFixed(2)} dh)`,
          refType: "SESSION",
          refId: id,
        },
      });
    }

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "SESSION_CLOSED",
      targetType: "CASH_SESSION",
      targetId: id,
      metadata: { floatClose, expectedCash, variance },
    });

    return NextResponse.json({
      session: closed,
      summary: { floatOpen: session.floatOpen, cashSalesTotal, movementsNet, expectedCash, floatClose, variance },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/sessions/[id]/close");
  }
}
