import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { hashOtpCode, MAX_OTP_ATTEMPTS } from "@/lib/otp-challenge";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { USER_STATUS } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const bodySchema = z.object({
  channel: z.enum(["EMAIL", "SMS"]),
  target: z.string().min(3).max(200),
  purpose: z.enum(["REGISTER", "LOGIN", "LOGIN_2FA", "VERIFY_PHONE"]).default("REGISTER"),
  code: z.string().regex(/^\d{6}$/),
  /** When true with purpose LOGIN and channel EMAIL, returns JWT pair after successful verification (passwordless email login). */
  issueSession: z.boolean().optional(),
  rememberMe: z.boolean().optional(),
});

/** POST /api/v1/auth/otp/verify — validate the latest non-consumed OTP for the target. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auth-otp-verify:${ip}`);
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

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { channel, purpose, code } = parsed.data;
    const target =
      channel === "EMAIL" ? parsed.data.target.trim().toLowerCase() : parsed.data.target.trim().replace(/\s+/g, "");

    const row = await prisma.otpChallenge.findFirst({
      where: { target, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!row) {
      return NextResponse.json({ error: "No active verification code. Request a new one." }, { status: 400 });
    }

    if (row.attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json({ error: "Too many failed attempts. Request a new code." }, { status: 429 });
    }

    if (hashOtpCode(code) !== row.codeHash) {
      await prisma.otpChallenge.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    await prisma.otpChallenge.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    const { issueSession, rememberMe } = parsed.data;

    if (issueSession) {
      if ((purpose !== "LOGIN" && purpose !== "LOGIN_2FA") || channel !== "EMAIL") {
        return NextResponse.json(
          { error: "issueSession is only supported for EMAIL channel and LOGIN / LOGIN_2FA purpose" },
          { status: 400 },
        );
      }

      const user = await prisma.user.findUnique({ where: { email: target } });
      if (!user) {
        return NextResponse.json({ error: "No account for this email" }, { status: 404 });
      }
      if (user.status !== USER_STATUS.ACTIVE) {
        return NextResponse.json({ error: `User status is ${user.status}` }, { status: 403 });
      }

      if (user.role === "MANAGER") {
        const subscription = await prisma.subscription.findUnique({ where: { managerId: user.id } });
        if (subscription && subscription.status !== "ACTIVE") {
          return NextResponse.json({ error: "Subscription is not active" }, { status: 403 });
        }
      }

      if (user.role === "CASHIER" && user.ownerManagerId) {
        const manager = await prisma.user.findUnique({ where: { id: user.ownerManagerId } });
        if (!manager || manager.status !== USER_STATUS.ACTIVE) {
          return NextResponse.json({ error: "Manager is not active" }, { status: 403 });
        }
        const managerSubscription = await prisma.subscription.findUnique({ where: { managerId: manager.id } });
        if (managerSubscription && managerSubscription.status !== "ACTIVE") {
          return NextResponse.json({ error: "Manager subscription is not active" }, { status: 403 });
        }
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
        action: "AUTH_OTP_LOGIN",
        targetType: "USER",
        targetId: user.id,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({
        verified: true,
        target,
        purpose,
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        accessTokenExpiresIn: "15m",
        refreshTokenExpiresInDays: refreshTokenDays,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
        },
      });
    }

    return NextResponse.json({ verified: true, target, purpose });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/otp/verify");
  }
}
