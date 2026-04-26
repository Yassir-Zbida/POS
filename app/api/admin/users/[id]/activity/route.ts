import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]/activity
 * Returns paginated audit log entries for a specific user (login events, status changes, etc.)
 */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const userExists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10)));
    const skip = (page - 1) * limit;

    // Fetch audit logs where this user is the actor
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { actorUserId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where: { actorUserId: id } }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/admin/users/[id]/activity");
  }
}
