import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/inventory/low-stock — products where stock <= minStock */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const products = await prisma.$queryRaw<
      Array<{ id: string; nameFr: string; sku: string; stock: number; minStock: number; categoryId: string }>
    >`
      SELECT id, nameFr, sku, stock, minStock, categoryId
      FROM Product
      WHERE isActive = 1 AND stock <= minStock
      ORDER BY stock ASC
    `;

    return NextResponse.json({ products, count: products.length });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/inventory/low-stock");
  }
}
