import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerBusinessSchema } from "@/features/auth/schemas/register-schemas";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const SETTINGS_ACTION = "BUSINESS_SETTINGS";

/** POST /api/v1/auth/register — create manager, subscription, default location & category, initial business settings */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auth-register:${ip}`);
    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please retry later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = registerBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { businessName, ownerName, email, password, phone, city, ice, businessType } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const { user, locationId, categoryId } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: ownerName,
          phone: phone ?? null,
          passwordHash,
          role: "MANAGER",
          status: "ACTIVE",
        },
      });

      await tx.subscription.create({
        data: { managerId: user.id, status: "ACTIVE" },
      });

      const location = await tx.location.create({
        data: {
          name: businessName,
          city: city ?? null,
          phone: phone ?? null,
          managerId: user.id,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { locationId: location.id },
      });

      const category = await tx.category.create({
        data: { nameFr: "Général" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: SETTINGS_ACTION,
          targetType: "BUSINESS",
          targetId: "global",
          metadata: {
            name: businessName,
            city: city ?? null,
            ice: ice ?? null,
            phone: phone ?? null,
            email,
            businessType: businessType ?? "OTHER",
            defaultCategoryId: category.id,
            defaultLocationId: location.id,
          },
        },
      });

      return { user, locationId: location.id, categoryId: category.id };
    });

    const payload = { sub: user.id, role: user.role, status: user.status };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);
    const refreshTokenDays = 30;
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        accessTokenExpiresIn: "15m",
        refreshTokenExpiresInDays: refreshTokenDays,
        user: { id: user.id, email: user.email, role: user.role, status: user.status },
        setup: { locationId, defaultCategoryId: categoryId },
      },
      { status: 201 },
    );
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/register");
  }
}
