import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/v1/auth/otp-settings — return the current user's OTP enabled state. */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { otpEnabled: true },
    });

    return NextResponse.json({ otpEnabled: user?.otpEnabled ?? false });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/auth/otp-settings");
  }
}

/** POST /api/v1/auth/otp-settings — enable or disable 2FA OTP for the authenticated user.
 *  Body: { enabled: boolean }
 */
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

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).enabled !== "boolean"
    ) {
      return NextResponse.json({ error: "Body must be { enabled: boolean }" }, { status: 422 });
    }

    const enabled = (body as { enabled: boolean }).enabled;

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { otpEnabled: enabled },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: enabled ? "AUTH_OTP_ENABLED" : "AUTH_OTP_DISABLED",
      targetType: "USER",
      targetId: auth.user.id,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ otpEnabled: enabled });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/auth/otp-settings");
  }
}
