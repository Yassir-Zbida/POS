import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/reports/dashboard — KPI snapshot for owner/manager home widgets. */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startOfDay.getTime() - 86400000);

    const [
      todaySales,
      yesterdaySales,
      lowStockRows,
      creditAgg,
      openSessionCount,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { status: { not: "REFUNDED" }, createdAt: { gte: startOfDay } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: {
          status: { not: "REFUNDED" },
          createdAt: { gte: startYesterday, lt: startOfDay },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM Product WHERE isActive = 1 AND stock <= minStock LIMIT 500
      `,
      prisma.customer.aggregate({ _sum: { creditBalance: true } }),
      prisma.cashRegisterSession.count({ where: { status: "OPEN" } }),
    ]);

    const revenueToday = Number(todaySales._sum.totalAmount ?? 0);
    const revenueYesterday = Number(yesterdaySales._sum.totalAmount ?? 0);
    const trendPct =
      revenueYesterday > 0 ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 1000) / 10 : null;

    return NextResponse.json({
      asOf: now.toISOString(),
      revenueToday,
      transactionsToday: todaySales._count,
      revenueYesterday,
      transactionsYesterday: yesterdaySales._count,
      revenueTrendVsYesterdayPct: trendPct,
      lowStockProductCount: lowStockRows.length,
      outstandingCreditMad: Number(creditAgg._sum.creditBalance ?? 0),
      openCashSessions: openSessionCount,
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/reports/dashboard");
  }
}
