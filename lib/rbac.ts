import { NextResponse } from "next/server";
import { getBearerToken, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

    const payload = await verifyToken(token);
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

    return { user };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

export function requireRole(userRole: string, allowedRoles: string[]) {
  return allowedRoles.includes(userRole);
}
