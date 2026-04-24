import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  value: z.number().positive().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    return NextResponse.json({ coupon });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/discounts/coupons/[id]");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { validFrom, validTo, ...rest } = parsed.data;
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...rest,
        ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
        ...(validTo ? { validTo: new Date(validTo) } : {}),
      },
    });

    return NextResponse.json({ coupon });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/discounts/coupons/[id]");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/discounts/coupons/[id]");
  }
}
