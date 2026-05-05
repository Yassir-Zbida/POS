import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { cashierCanViewSaleById, getCashierIdsForManager } from "@/lib/cashier-permissions";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, nameFr: true, nameEn: true, nameAr: true, sku: true, barcode: true } },
            variant: true,
          },
        },
        customer: true,
        cashier: { select: { id: true, name: true } },
        session: { select: { id: true, floatOpen: true, status: true } },
        coupon: true,
      },
    });

    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    if (auth.user.role === ROLES.CASHIER) {
      const ok = await cashierCanViewSaleById(auth.user, sale.cashierId ?? null);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (auth.user.role === ROLES.MANAGER) {
      const teamIds = await getCashierIdsForManager(auth.user.id);
      const cid = sale.cashierId;
      if (!cid || !teamIds.includes(cid)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ sale });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/sales/[id]");
  }
}
