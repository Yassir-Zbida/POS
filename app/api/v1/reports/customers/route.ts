import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/reports/customers */
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

    const [totalStats, topCustomers, creditAging] = await Promise.all([
      prisma.customer.aggregate({
        _count: true,
        _sum: { creditBalance: true, loyaltyPoints: true },
      }),

      // Top customers by revenue
      prisma.sale.groupBy({
        by: ["customerId"],
        where: {
          customerId: { not: null },
          status: { not: "REFUNDED" },
          createdAt: { gte: from, lte: to },
        },
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 10,
      }),

      // Customers with outstanding credit > 0
      prisma.customer.findMany({
        where: { creditBalance: { gt: 0 } },
        select: { id: true, name: true, phone: true, creditBalance: true },
        orderBy: { creditBalance: "desc" },
        take: 20,
      }),
    ]);

    const customerIds = topCustomers.map((c) => c.customerId).filter(Boolean) as string[];
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return NextResponse.json({
      period: { from, to },
      summary: {
        totalCustomers: totalStats._count,
        totalOutstandingCredit: totalStats._sum.creditBalance ?? 0,
        totalLoyaltyPoints: totalStats._sum.loyaltyPoints ?? 0,
        customersWithCredit: creditAging.length,
      },
      topCustomers: topCustomers.map((c) => ({
        customer: customerMap.get(c.customerId ?? "") ?? { id: c.customerId, name: "Guest", phone: null },
        totalSpent: c._sum.totalAmount,
        visits: c._count,
      })),
      creditAging,
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/reports/customers");
  }
}
