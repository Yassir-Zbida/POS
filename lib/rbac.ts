import { NextResponse } from "next/server";
import { getBearerToken, verifyToken, type AppTokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";
import { isPasswordSetupExemptApiRoute } from "@/lib/must-change-password";

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
} as const;

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  BANNED: "BANNED",
  SUSPENDED: "SUSPENDED",
} as const;

export async function requireAuth(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  let payload: AppTokenPayload;
  try {
    payload = await verifyToken(token);
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
    if (user.status !== USER_STATUS.ACTIVE) {
      return { error: NextResponse.json({ error: "User is not active" }, { status: 403 }) };
    }

    if (user.role === ROLES.MANAGER) {
      const subscription = await prisma.subscription.findUnique({ where: { managerId: user.id } });
      if (subscription && subscription.status !== "ACTIVE") {
        return { error: NextResponse.json({ error: "Subscription is not active" }, { status: 403 }) };
      }
    }

    if (user.role === ROLES.CASHIER && user.ownerManagerId) {
      const manager = await prisma.user.findUnique({ where: { id: user.ownerManagerId } });
      if (!manager || manager.status !== USER_STATUS.ACTIVE) {
        return { error: NextResponse.json({ error: "Manager is not active" }, { status: 403 }) };
      }
      const managerSubscription = await prisma.subscription.findUnique({ where: { managerId: manager.id } });
      if (managerSubscription && managerSubscription.status !== "ACTIVE") {
        return { error: NextResponse.json({ error: "Manager subscription is not active" }, { status: 403 }) };
      }
    }

    const pathname = new URL(request.url).pathname;
    if (
      user.mustChangePassword &&
      user.role === ROLES.MANAGER &&
      !isPasswordSetupExemptApiRoute(request.method, pathname)
    ) {
      return {
        error: NextResponse.json(
          { error: "Password change required", code: "MUST_CHANGE_PASSWORD" },
          { status: 403 }
        ),
      };
    }

    return { user };
  } catch (e) {
    if (isDatabaseConnectionError(e)) return { error: databaseUnavailableResponse() };
    console.error("[requireAuth]", e);
    return { error: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
  }
}

export function requireRole(userRole: string, allowedRoles: string[]) {
  return allowedRoles.includes(userRole);
}
