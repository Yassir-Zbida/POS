import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pinLoginSchema } from "@/features/auth/schemas/register-schemas";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** POST /api/v1/auth/pin — cashier/manager quick login with 4–8 digit PIN (must be set via POST /api/v1/auth/set-pin). */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auth-pin:${ip}`);
    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many attempts. Please retry later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = pinLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or PIN" }, { status: 400 });
    }

    const { email, pin, rememberMe } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.pinHash) {
      return NextResponse.json({ error: "PIN login not enabled for this account" }, { status: 401 });
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 423 });
    }

    const ok = await verifyPassword(user.pinHash, pin);
    if (!ok) {
      const nextFailed = user.failedLoginAttempts + 1;
      const shouldLock = nextFailed >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextFailed,
          lockoutUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
        },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: `User status is ${user.status}` }, { status: 403 });
    }

    const payload = { sub: user.id, role: user.role, status: user.status };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    const refreshTokenDays = rememberMe ? 100 : 7;
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "AUTH_PIN_LOGIN",
      targetType: "USER",
      targetId: user.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresInDays: refreshTokenDays,
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/pin");
  }
}
