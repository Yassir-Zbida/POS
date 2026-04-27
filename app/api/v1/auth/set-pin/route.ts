import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { setPinSchema } from "@/features/auth/schemas/register-schemas";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** POST /api/v1/auth/set-pin — authenticated user sets or replaces checkout PIN (argon2-hashed). */
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

    const parsed = setPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const pinHash = await hashPassword(parsed.data.pin);
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { pinHash },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "AUTH_PIN_SET",
      targetType: "USER",
      targetId: auth.user.id,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/set-pin");
  }
}
