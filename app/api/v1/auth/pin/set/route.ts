import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const lockPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

/** GET /api/v1/auth/pin/set — check if the authenticated user has a lock-screen PIN set. */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { pinHash: true },
    });

    return NextResponse.json({ hasPinSet: !!user?.pinHash });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/auth/pin/set");
  }
}

/** POST /api/v1/auth/pin/set — set or replace the 4-digit lock-screen PIN for the authenticated user. */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = lockPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const pinHash = await hashPassword(parsed.data.pin);
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { pinHash, pinAttempts: 0, pinLockedUntil: null },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "AUTH_LOCK_PIN_SET",
      targetType: "USER",
      targetId: auth.user.id,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/pin/set");
  }
}
