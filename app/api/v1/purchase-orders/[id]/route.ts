import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const updateSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(["CANCELLED"]).optional(),
});

/** GET /api/v1/purchase-orders/[id] */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: { select: { id: true, nameFr: true, nameEn: true, sku: true, barcode: true, stock: true } },
            variant: true,
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/purchase-orders/[id]");
  }
}

/** PUT /api/v1/purchase-orders/[id] — update notes or cancel */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

    if (existing.status === "RECEIVED") {
      return NextResponse.json({ error: "Cannot modify a fully received purchase order" }, { status: 409 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: parsed.data,
      include: { supplier: true, items: true },
    });

    return NextResponse.json({ order });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/purchase-orders/[id]");
  }
}
