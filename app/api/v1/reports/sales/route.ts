import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { buildSalesReportData } from "@/lib/reports/sales-report-data";
import { rowsToCsv } from "@/lib/csv-export";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/reports/sales
 * ?from= ?to= ?cashierId= ?locationId= ?format=json|csv
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
    const format = searchParams.get("format") ?? "json";

    const data = await buildSalesReportData(prisma, from, to, cashierId, locationId);

    if (format === "csv") {
      const flat: Record<string, unknown>[] = [];
      flat.push({
        section: "summary",
        totalRevenue: data.summary.totalRevenue,
        totalTransactions: data.summary.totalTransactions,
        avgBasket: data.summary.avgBasket,
        totalDiscount: data.summary.totalDiscount,
        totalVat: data.summary.totalVat,
      });
      for (const p of data.paymentBreakdown) {
        flat.push({ section: "payment", method: p.method, total: p.total, count: p.count });
      }
      for (const t of data.topProducts) {
        flat.push({
          section: "topProduct",
          productId: t.product.id,
          nameFr: t.product.nameFr,
          sku: t.product.sku,
          totalQty: t.totalQty,
          totalRevenue: t.totalRevenue,
        });
      }
      const csv = rowsToCsv(["section", "method", "total", "count", "productId", "nameFr", "sku", "totalQty", "totalRevenue", "avgBasket", "totalDiscount", "totalVat", "totalTransactions"], flat);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sales-report.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/reports/sales");
  }
}
