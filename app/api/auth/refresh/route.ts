import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshSchema } from "@/features/auth/schemas/auth-schemas";
import { signAccessToken, signRefreshToken, verifyToken } from "@/lib/auth";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { refreshToken } = parsed.data;
    const dbToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });

    if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    await verifyToken(refreshToken);

    const payload = { sub: dbToken.user.id, role: dbToken.user.role, status: dbToken.user.status };
    const newAccessToken = await signAccessToken(payload);
    const newRefreshToken = await signRefreshToken(payload);

    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: dbToken.id }, data: { revokedAt: new Date() } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: dbToken.user.id,
          expiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "auth/refresh");
  }
}
