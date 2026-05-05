import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { USER_STATUS, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";
import { isCashierPinLoginAllowed } from "@/lib/cashier-login-policy";
import { getCashierPermissions } from "@/lib/cashier-permissions-model";

const bodySchema = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{4}$/),
  rememberMe: z.boolean().optional(),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/** POST /api/v1/auth/cashier-pin-login — cashier signs in with email + 4-digit PIN (within full-auth window). */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`cashier-pin-login:${ip}`);
    if (rate.limited) {
      return NextResponse.json(
        { error: "TOO_MANY_ATTEMPTS" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 422 });
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mustChangePassword: true,
        pinHash: true,
        pinAttempts: true,
        pinLockedUntil: true,
        ownerManagerId: true,
        cashierFullAuthAt: true,
        cashierPermissions: true,
      },
    });

    if (!user || user.role !== ROLES.CASHIER || !user.pinHash) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return NextResponse.json({ error: "ACCOUNT_INACTIVE" }, { status: 403 });
    }

    if (!user.ownerManagerId) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const manager = await prisma.user.findUnique({
      where: { id: user.ownerManagerId },
      select: { id: true, status: true },
    });
    if (!manager || manager.status !== USER_STATUS.ACTIVE) {
      return NextResponse.json({ error: "MANAGER_INACTIVE" }, { status: 403 });
    }

    const subscription = await prisma.subscription.findUnique({ where: { managerId: manager.id } });
    if (subscription && subscription.status !== "ACTIVE") {
      return NextResponse.json({ error: "SUBSCRIPTION_INACTIVE" }, { status: 403 });
    }

    if (!isCashierPinLoginAllowed(user.cashierFullAuthAt)) {
      return NextResponse.json({ code: "FULL_LOGIN_REQUIRED" }, { status: 403 });
    }

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json({ error: "PIN_LOCKED", remainingSeconds }, { status: 423 });
    }

    const ok = await verifyPassword(user.pinHash, parsed.data.pin);
    if (!ok) {
      const nextAttempts = (user.pinAttempts ?? 0) + 1;
      const shouldLock = nextAttempts >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: shouldLock ? 0 : nextAttempts,
          pinLockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
        },
      });
      await writeAuditLog({
        actorUserId: user.id,
        action: "AUTH_CASHIER_PIN_FAILED",
        targetType: "USER",
        targetId: user.id,
        metadata: { attempts: nextAttempts, locked: shouldLock },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          attemptsLeft: shouldLock ? 0 : MAX_ATTEMPTS - nextAttempts,
          locked: shouldLock,
          remainingSeconds: shouldLock ? LOCKOUT_MINUTES * 60 : undefined,
        },
        { status: 401 },
      );
    }

    const rememberMe = parsed.data.rememberMe ?? false;
    const refreshTokenDays = rememberMe ? 100 : 7;
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

    const payload = {
      sub: user.id,
      role: user.role,
      status: user.status,
    };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: 0, pinLockedUntil: null },
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "AUTH_CASHIER_PIN_LOGIN",
      targetType: "USER",
      targetId: user.id,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresInDays: refreshTokenDays,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        ownerManagerId: user.ownerManagerId,
        mustChangePassword: user.mustChangePassword,
        cashierPermissions: getCashierPermissions(user),
      },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/cashier-pin-login");
  }
}
