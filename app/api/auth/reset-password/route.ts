import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resetPasswordBodySchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth";
import { hashResetToken } from "@/lib/reset-password";
import { databaseUnavailableResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resetPasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const tokenHash = hashResetToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    if (record.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "User is not active" }, { status: 403 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockoutUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isDatabaseConnectionError(err)) return databaseUnavailableResponse();
    console.error("[auth/reset-password]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? `Server error: ${message}. Run \`npx prisma migrate deploy\` (or migrate dev) and \`npx prisma generate\` if the DB or client is out of date.`
          : "Something went wrong. Please try again later.",
      },
      { status: 500 },
    );
  }
}
