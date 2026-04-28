import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/** POST /api/v1/auth/change-password — authenticated user sets a new password (required when mustChangePassword). */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid account state" }, { status: 400 });
    }

    const ok = await verifyPassword(user.passwordHash, currentPassword);
    if (!ok) {
      return NextResponse.json({ error: "INVALID_CURRENT_PASSWORD" }, { status: 401 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "NEW_PASSWORD_SAME_AS_OLD" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: false,
      },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/change-password");
  }
}
