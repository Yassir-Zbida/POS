import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

/** GET /api/admin/subscriptions — list all merchant subscriptions with stats */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  type SubStatusFilter = "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
  const validStatuses: SubStatusFilter[] = ["ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"];
  const statusFilter = validStatuses.includes(status as SubStatusFilter)
    ? (status as SubStatusFilter)
    : undefined;

  try {
    const where = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            manager: {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            },
          }
        : {}),
    };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          manager: {
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [groupedStats, expiringSoon, totalAll] = await Promise.all([
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          endedAt: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.subscription.count(),
    ]);

    const statsMap = Object.fromEntries(
      groupedStats.map((s) => [s.status, s._count._all])
    );

    const stats = {
      total: totalAll,
      active: statsMap["ACTIVE"] ?? 0,
      pastDue: statsMap["PAST_DUE"] ?? 0,
      suspended: statsMap["SUSPENDED"] ?? 0,
      canceled: statsMap["CANCELED"] ?? 0,
      expiringSoon,
    };

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        managerId: s.managerId,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        merchant: s.manager,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats,
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/admin/subscriptions");
  }
}
