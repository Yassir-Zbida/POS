import type { PrismaClient } from "@prisma/client";

type Where = {
  status: { not: "REFUNDED" };
  createdAt: { gte: Date; lte: Date };
  cashierId?: string;
  locationId?: string;
};

/** Shared aggregates for sales report JSON and CSV export. */
export async function buildSalesReportData(
  prisma: PrismaClient,
  from: Date,
  to: Date,
  cashierId?: string,
  locationId?: string,
) {
  const where: Where = {
    status: { not: "REFUNDED" },
    createdAt: { gte: from, lte: to },
    ...(cashierId ? { cashierId } : {}),
    ...(locationId ? { locationId } : {}),
  };

  const [sales, paymentBreakdown, topProducts, cashierBreakdown, locationBreakdown] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true, discountAmt: true, vatAmt: true },
      _count: true,
      _avg: { totalAmount: true },
    }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where,
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: where },
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 10,
    }),
    prisma.sale.groupBy({
      by: ["cashierId"],
      where,
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: "desc" } },
    }),
    prisma.sale.groupBy({
      by: ["locationId"],
      where,
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: "desc" } },
    }),
  ]);

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

  return {
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
  };
}
