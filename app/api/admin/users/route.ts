import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

type UserRoleFilter = "ADMIN" | "MANAGER" | "CASHIER";
type UserStatusFilter = "ACTIVE" | "BANNED" | "SUSPENDED";

/** GET /api/admin/users — list all users with search, role/status filters, pagination & stats */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const roleParam = searchParams.get("role") ?? "";
    const statusParam = searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const roleFilter = (["ADMIN", "MANAGER", "CASHIER"] as const).includes(
      roleParam as UserRoleFilter
    )
      ? (roleParam as UserRoleFilter)
      : undefined;

    const statusFilter = (["ACTIVE", "BANNED", "SUSPENDED"] as const).includes(
      statusParam as UserStatusFilter
    )
      ? (statusParam as UserStatusFilter)
      : undefined;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          otpEnabled: true,
          failedLoginAttempts: true,
          lockoutUntil: true,
          createdAt: true,
          updatedAt: true,
          ownerManager: {
            select: { id: true, name: true, email: true },
          },
          location: {
            select: { id: true, name: true, city: true },
          },
          _count: {
            select: { cashiers: true, managedLocations: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Stats (full table scan, fast for typical user counts)
    const allUsers = await prisma.user.findMany({
      select: { role: true, status: true },
    });

    const stats = {
      total: allUsers.length,
      active: allUsers.filter((u) => u.status === "ACTIVE").length,
      banned: allUsers.filter((u) => u.status === "BANNED").length,
      suspended: allUsers.filter((u) => u.status === "SUSPENDED").length,
      admins: allUsers.filter((u) => u.role === "ADMIN").length,
      managers: allUsers.filter((u) => u.role === "MANAGER").length,
      cashiers: allUsers.filter((u) => u.role === "CASHIER").length,
    };

    return NextResponse.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats,
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/admin/users");
  }
}
