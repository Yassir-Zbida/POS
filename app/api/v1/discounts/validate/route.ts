import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const validateSchema = z.object({
  code: z.string().min(1),
  cartTotal: z.number().positive(),
});

/** POST /api/v1/discounts/validate — validate coupon and return discount amount */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { code, cartTotal } = parsed.data;
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ valid: false, error: "Coupon not found or inactive" }, { status: 200 });
    }

    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
      return NextResponse.json({ valid: false, error: "Coupon not yet active" }, { status: 200 });
    }
    if (coupon.validTo && coupon.validTo < now) {
      return NextResponse.json({ valid: false, error: "Coupon has expired" }, { status: 200 });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: "Coupon usage limit reached" }, { status: 200 });
    }

    const discountAmt =
      coupon.type === "PERCENT"
        ? Math.min(cartTotal, (cartTotal * Number(coupon.value)) / 100)
        : Math.min(cartTotal, Number(coupon.value));

    return NextResponse.json({
      valid: true,
      coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value },
      discountAmt: parseFloat(discountAmt.toFixed(2)),
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/discounts/validate");
  }
}
