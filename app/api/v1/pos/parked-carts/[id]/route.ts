import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";
import { prisma } from "@/lib/prisma";

const PARK_ACTION = "POS_PARKED_CART";
const UNPARK_ACTION = "POS_UNPARKED_CART";

/** GET /api/v1/pos/parked-carts/[id] — resume a parked cart */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const log = await prisma.auditLog.findFirst({
      where: { id, actorUserId: auth.user.id, action: PARK_ACTION },
    });

    if (!log) return NextResponse.json({ error: "Parked cart not found" }, { status: 404 });

    return NextResponse.json({ parkedCart: { id: log.id, ...(log.metadata as object), parkedAt: log.createdAt } });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/pos/parked-carts/[id]");
  }
}

/** DELETE /api/v1/pos/parked-carts/[id] — discard or resume (unpark) a parked cart */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const log = await prisma.auditLog.findFirst({
      where: { id, actorUserId: auth.user.id, action: PARK_ACTION },
    });

    if (!log) return NextResponse.json({ error: "Parked cart not found" }, { status: 404 });

    // Mark as unparked (we don't delete audit logs)
    await prisma.auditLog.create({
      data: {
        actorUserId: auth.user.id,
        action: UNPARK_ACTION,
        targetType: "PARKED_CART",
        targetId: id,
        metadata: { unparkedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({ success: true, cart: log.metadata });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/pos/parked-carts/[id]");
  }
}
