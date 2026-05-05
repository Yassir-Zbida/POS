import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { getCashierIdsForManager } from "@/lib/cashier-permissions";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const session = await prisma.cashRegisterSession.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        cashMovements: { orderBy: { createdAt: "asc" } },
        _count: { select: { sales: true } },
        sales: {
          select: { id: true, totalAmount: true, paymentMethod: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    if (auth.user.role === ROLES.CASHIER && session.cashierId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (auth.user.role === ROLES.MANAGER) {
      const teamIds = await getCashierIdsForManager(auth.user.id);
      if (!session.cashierId || !teamIds.includes(session.cashierId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ session });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/sessions/[id]");
  }
}
