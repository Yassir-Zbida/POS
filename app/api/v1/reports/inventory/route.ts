import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/reports/inventory */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [products, lowStock, movementSummary] = await Promise.all([
      // Stock value summary
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true, nameFr: true, sku: true, stock: true, minStock: true,
          price: true, costPrice: true, category: { select: { id: true, nameFr: true } },
        },
      }),

      // Low stock
      prisma.$queryRaw<Array<{ id: string; nameFr: string; stock: number; minStock: number }>>`
        SELECT id, nameFr, stock, minStock FROM Product WHERE isActive = 1 AND stock <= minStock ORDER BY stock ASC
      `,

      // Movement summary (last 30 days)
      prisma.inventoryMovement.groupBy({
        by: ["type"],
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        _sum: { qtyDelta: true },
        _count: true,
      }),
    ]);

    const totalStockValue = products.reduce((sum, p) => {
      return sum + p.stock * Number(p.costPrice ?? p.price);
    }, 0);

    const totalRetailValue = products.reduce((sum, p) => sum + p.stock * Number(p.price), 0);

    const belowMinCount = products.filter((p) => p.stock <= p.minStock).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    return NextResponse.json({
      summary: {
        totalProducts: products.length,
        totalStockValue: parseFloat(totalStockValue.toFixed(2)),
        totalRetailValue: parseFloat(totalRetailValue.toFixed(2)),
        belowMinCount,
        outOfStockCount,
      },
      lowStock,
      movementSummary: movementSummary.map((m) => ({
        type: m.type,
        totalQty: m._sum.qtyDelta,
        count: m._count,
      })),
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/reports/inventory");
  }
}
