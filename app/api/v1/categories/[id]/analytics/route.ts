import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { assertManagerAdminOrCashierPermission } from "@/lib/cashier-permissions";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "catalogView");
      if (denied) return denied;
    }

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        nameFr: true,
        nameEn: true,
        nameAr: true,
        color: true,
        vatRate: true,
        _count: { select: { products: true } },
      },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const months: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const saleItems = await prisma.saleItem.findMany({
      where: { product: { categoryId: id }, sale: { status: "COMPLETED" } },
      select: {
        quantity: true,
        totalPrice: true,
        sale: { select: { createdAt: true } },
      },
      orderBy: { sale: { createdAt: "asc" } },
    });

    const monthlyMap = new Map<string, { amount: number; units: number }>();
    for (const m of months) monthlyMap.set(m, { amount: 0, units: 0 });

    let totalSalesAmount = 0;
    let totalUnitsSold = 0;
    let thisMonthSalesAmount = 0;
    let thisMonthUnitsSold = 0;

    for (const item of saleItems) {
      const amount = Number(item.totalPrice);
      const units = item.quantity;
      totalSalesAmount += amount;
      totalUnitsSold += units;
      if (item.sale.createdAt >= thisMonthStart) {
        thisMonthSalesAmount += amount;
        thisMonthUnitsSold += units;
      }
      const key = `${item.sale.createdAt.getFullYear()}-${String(item.sale.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthlyMap.get(key);
      if (cur) {
        cur.amount += amount;
        cur.units += units;
      }
    }

    const monthlySales = months.map((month) => {
      const val = monthlyMap.get(month) ?? { amount: 0, units: 0 };
      return { month, amount: val.amount, units: val.units };
    });

    return NextResponse.json({
      category: {
        id: category.id,
        nameFr: category.nameFr,
        nameEn: category.nameEn,
        nameAr: category.nameAr,
        color: category.color,
        vatRate: category.vatRate,
        productsCount: category._count.products,
      },
      totals: {
        totalProducts: category._count.products,
        totalSalesAmount,
        totalUnitsSold,
        thisMonthSalesAmount,
        thisMonthUnitsSold,
      },
      monthlySales,
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/categories/[id]/analytics");
  }
}
