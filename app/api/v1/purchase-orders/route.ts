import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const poItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qtyOrdered: z.number().int().positive(),
  unitCost: z.number().positive(),
});

const createPoSchema = z.object({
  supplierId: z.string().optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const locationId = searchParams.get("locationId") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(locationId ? { locationId } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/purchase-orders");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createPoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { supplierId, locationId, notes, items } = parsed.data;
    const totalCost = items.reduce((sum, i) => sum + i.qtyOrdered * i.unitCost, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        locationId,
        notes,
        totalCost,
        createdById: auth.user.id,
        items: { create: items },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/purchase-orders");
  }
}
