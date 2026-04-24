import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/reports/sales
 * ?from= ?to= ?cashierId= ?locationId= ?groupBy=day|week|month
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 86400000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const cashierId = searchParams.get("cashierId") ?? undefined;
    const locationId = searchParams.get("locationId") ?? undefined;

    const where = {
      status: { not: "REFUNDED" as const },
      createdAt: { gte: from, lte: to },
      ...(cashierId ? { cashierId } : {}),
      ...(locationId ? { locationId } : {}),
    };

    const [sales, paymentBreakdown, topProducts, cashierBreakdown, locationBreakdown] = await Promise.all([
      // Aggregate totals
      prisma.sale.aggregate({
        where,
        _sum: { totalAmount: true, discountAmt: true, vatAmt: true },
        _count: true,
        _avg: { totalAmount: true },
      }),

      // Payment method breakdown
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where,
        _sum: { totalAmount: true },
        _count: true,
      }),

      // Top products
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: where },
        _sum: { quantity: true, totalPrice: true },
        _count: true,
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 10,
      }),

      // Per-cashier breakdown
      prisma.sale.groupBy({
        by: ["cashierId"],
        where,
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: "desc" } },
      }),

      // Per-location breakdown
      prisma.sale.groupBy({
        by: ["locationId"],
        where,
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: "desc" } },
      }),
    ]);

    // Enrich top products with names
    const productIds = topProducts.map((t) => t.productId).filter(Boolean) as string[];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, nameFr: true, sku: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const cashierIds = cashierBreakdown.map((c) => c.cashierId).filter(Boolean) as string[];
    const cashiers = await prisma.user.findMany({
      where: { id: { in: cashierIds } },
      select: { id: true, name: true },
    });
    const cashierMap = new Map(cashiers.map((c) => [c.id, c]));

    const locationIds = locationBreakdown.map((l) => l.locationId).filter(Boolean) as string[];
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, city: true },
    });
    const locationMap = new Map(locations.map((l) => [l.id, l]));

    return NextResponse.json({
      period: { from, to },
      summary: {
        totalRevenue: sales._sum.totalAmount ?? 0,
        totalTransactions: sales._count,
        avgBasket: sales._avg.totalAmount ?? 0,
        totalDiscount: sales._sum.discountAmt ?? 0,
        totalVat: sales._sum.vatAmt ?? 0,
      },
      paymentBreakdown: paymentBreakdown.map((p) => ({
        method: p.paymentMethod,
        total: p._sum.totalAmount,
        count: p._count,
      })),
      topProducts: topProducts.map((t) => ({
        product: productMap.get(t.productId) ?? { id: t.productId, nameFr: "Unknown", sku: "" },
        totalQty: t._sum.quantity,
        totalRevenue: t._sum.totalPrice,
      })),
      cashierBreakdown: cashierBreakdown.map((c) => ({
        cashier: cashierMap.get(c.cashierId ?? "") ?? { id: c.cashierId, name: "Unknown" },
        totalRevenue: c._sum.totalAmount,
        totalTransactions: c._count,
      })),
      locationBreakdown: locationBreakdown.map((l) => ({
        location: locationMap.get(l.locationId ?? "") ?? { id: l.locationId, name: "Unknown", city: null },
        totalRevenue: l._sum.totalAmount,
        totalTransactions: l._count,
      })),
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/reports/sales");
  }
}
