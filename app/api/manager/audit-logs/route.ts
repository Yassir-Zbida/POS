import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCashierIdsForManager } from "@/lib/cashier-permissions";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** GET /api/manager/audit-logs ?page=&limit=&actorId= */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const teamIds = await getCashierIdsForManager(auth.user.id);
    const allowedActorIds = new Set([auth.user.id, ...teamIds]);

    const { searchParams } = new URL(request.url);
    const actorIdFilter = searchParams.get("actorId") ?? undefined;
    if (actorIdFilter && !allowedActorIds.has(actorIdFilter)) {
      return NextResponse.json({ error: "Invalid actor" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30", 10));
    const skip = (page - 1) * limit;

    const where = {
      actorUserId: {
        in: actorIdFilter ? [actorIdFilter] : [...allowedActorIds],
      },
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, email: true, name: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/manager/audit-logs");
  }
}
