import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getBearerToken, verifyPassword, verifyTokenIgnoreExpiry } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 5;

/** POST /api/v1/auth/pin/verify — verify lock-screen PIN without issuing a new session. */
export async function POST(request: Request) {
  try {
    // The lock-screen may present an expired access token (the inactivity timeout
    // and the token TTL are both 15 min). We verify the signature but skip the
    // expiry check — the 4-digit PIN is the actual authentication factor here.
    const rawToken = getBearerToken(request.headers.get("authorization"));
    if (!rawToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let tokenPayload: Awaited<ReturnType<typeof verifyTokenIgnoreExpiry>>;
    try {
      tokenPayload = await verifyTokenIgnoreExpiry(rawToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = tokenPayload.sub;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = verifyPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 422 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pinHash: true, pinAttempts: true, pinLockedUntil: true },
    });

    if (!user?.pinHash) {
      return NextResponse.json(
        { error: "No PIN configured for this account" },
        { status: 404 },
      );
    }

    // Lockout check
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingSeconds = Math.ceil(
        (user.pinLockedUntil.getTime() - Date.now()) / 1000,
      );
      return NextResponse.json(
        { error: "Too many attempts", remainingSeconds },
        { status: 423 },
      );
    }

    const ok = await verifyPassword(user.pinHash, parsed.data.pin);

    if (ok) {
      await prisma.user.update({
        where: { id: userId },
        data: { pinAttempts: 0, pinLockedUntil: null },
      });

      await writeAuditLog({
        actorUserId: userId,
        action: "AUTH_LOCK_PIN_VERIFY_OK",
        targetType: "USER",
        targetId: userId,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ ok: true });
    }

    // Wrong PIN
    const nextAttempts = (user.pinAttempts ?? 0) + 1;
    const shouldLock = nextAttempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: userId },
      data: {
        pinAttempts: shouldLock ? 0 : nextAttempts,
        pinLockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null,
      },
    });

    return NextResponse.json(
      {
        error: "Wrong PIN",
        attemptsLeft: shouldLock ? 0 : MAX_ATTEMPTS - nextAttempts,
        locked: shouldLock,
        // Include remaining seconds so the client can start the countdown
        // immediately on the locking attempt (no need for a 4th request)
        remainingSeconds: shouldLock ? LOCKOUT_MINUTES * 60 : undefined,
      },
      { status: 401 },
    );
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/pin/verify");
  }
}
