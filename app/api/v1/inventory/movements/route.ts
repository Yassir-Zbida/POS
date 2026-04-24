import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/inventory/movements
 * ?productId= ?type= ?from= ?to= ?page= ?limit=
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
    const skip = (page - 1) * limit;

    const where = {
      ...(productId ? { productId } : {}),
      ...(type ? { type: type as never } : {}),
      ...((from || to)
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, nameFr: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return NextResponse.json({ movements, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/inventory/movements");
  }
}
