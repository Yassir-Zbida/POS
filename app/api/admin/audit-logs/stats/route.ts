import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError, databaseUnavailableResponse, internalErrorResponse } from "@/lib/api-route-errors";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      last24hCount,
      last7dCount,
      errorCount,
      errorLast24h,
      byAction,
      byTargetType,
      topActors,
      recentErrors,
      dailyActivity,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: last7d } } }),
      prisma.auditLog.count({ where: { action: { contains: "ERROR" } } }),
      prisma.auditLog.count({
        where: { action: { contains: "ERROR" }, createdAt: { gte: last24h } },
      }),

      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      prisma.auditLog.groupBy({
        by: ["targetType"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),

      prisma.auditLog.groupBy({
        by: ["actorUserId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
        where: { createdAt: { gte: last30d } },
      }),

      prisma.auditLog.findMany({
        where: { action: { contains: "ERROR" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),

      // 14 days of daily counts
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          DATE(createdAt) as \`date\`,
          COUNT(*) as \`count\`
        FROM AuditLog
        WHERE createdAt >= ${new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt) ASC
      `,
    ]);

    // Resolve actor names for topActors
    const actorIds = topActors.map((a) => a.actorUserId);
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const topActorsWithInfo = topActors.map((a) => ({
      actorUserId: a.actorUserId,
      count: a._count.id,
      actor: actorMap.get(a.actorUserId) ?? null,
    }));

    return NextResponse.json({
      total,
      last24hCount,
      last7dCount,
      errorCount,
      errorLast24h,
      byAction: byAction.map((b) => ({ action: b.action, count: b._count.id })),
      byTargetType: byTargetType.map((b) => ({
        targetType: b.targetType,
        count: b._count.id,
      })),
      topActors: topActorsWithInfo,
      recentErrors,
      dailyActivity: dailyActivity.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "admin/audit-logs/stats:GET");
  }
}
