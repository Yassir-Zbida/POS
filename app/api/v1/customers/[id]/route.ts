import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { assertManagerAdminOrCashierPermission } from "@/lib/cashier-permissions";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "customersView");
      if (denied) return denied;
    }

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, totalAmount: true, paymentMethod: true, status: true, createdAt: true },
        },
        creditPayments: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/customers/[id]");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "customersEdit");
      if (denied) return denied;
    }

    const { id } = await params;
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { tags, ...rest } = parsed.data;
    const customer = await prisma.customer.update({
      where: { id },
      data: { ...rest, ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}) },
    });

    return NextResponse.json({ customer });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/customers/[id]");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "customersEdit");
      if (denied) return denied;
    } else if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/customers/[id]");
  }
}
