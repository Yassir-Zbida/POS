import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";
import { prisma } from "@/lib/prisma";

const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  nameFr: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discountAmt: z.number().min(0).default(0),
});

const parkSchema = z.object({
  label: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(cartItemSchema).min(1),
  notes: z.string().optional(),
});

const MAX_PARKED = 5;

// Parked carts are stored as AuditLog entries with action "POS_PARKED_CART".
// Each entry's metadata holds the cart snapshot. The cashier can retrieve/resume them.
const PARK_ACTION = "POS_PARKED_CART";
const UNPARK_ACTION = "POS_UNPARKED_CART";

/** GET /api/v1/pos/parked-carts — list parked carts for this cashier */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const parked = await prisma.auditLog.findMany({
      where: {
        actorUserId: auth.user.id,
        action: PARK_ACTION,
        targetType: "PARKED_CART",
      },
      orderBy: { createdAt: "desc" },
      take: MAX_PARKED,
    });

    // Filter out carts that were unparked (resumed/discarded)
    const unparked = await prisma.auditLog.findMany({
      where: { actorUserId: auth.user.id, action: UNPARK_ACTION },
      select: { targetId: true },
    });
    const unparkedIds = new Set(unparked.map((u) => u.targetId));
    const active = parked.filter((p) => !unparkedIds.has(p.id));

    return NextResponse.json({ parkedCarts: active.map((p) => ({ id: p.id, ...(p.metadata as object), parkedAt: p.createdAt })) });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/pos/parked-carts");
  }
}

/** POST /api/v1/pos/parked-carts — park (hold) the current cart */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = parkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    // Check max parked carts limit
    const existing = await prisma.auditLog.count({
      where: { actorUserId: auth.user.id, action: PARK_ACTION, targetType: "PARKED_CART" },
    });
    if (existing >= MAX_PARKED) {
      return NextResponse.json({ error: `Maximum ${MAX_PARKED} parked carts allowed` }, { status: 409 });
    }

    const log = await prisma.auditLog.create({
      data: {
        actorUserId: auth.user.id,
        action: PARK_ACTION,
        targetType: "PARKED_CART",
        targetId: `park-${Date.now()}`,
        metadata: parsed.data,
      },
    });

    return NextResponse.json({
      parkedCart: { id: log.id, ...parsed.data, parkedAt: log.createdAt },
    }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/pos/parked-carts");
  }
}
