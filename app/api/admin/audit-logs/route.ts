import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError, databaseUnavailableResponse, internalErrorResponse } from "@/lib/api-route-errors";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const search = searchParams.get("search") ?? "";
    const action = searchParams.get("action") ?? "";
    const targetType = searchParams.get("targetType") ?? "";
    const actorId = searchParams.get("actorId") ?? "";
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";

    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (actorId) where.actorUserId = actorId;

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.createdAt = dateFilter;
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { targetType: { contains: search } },
        { targetId: { contains: search } },
        { ipAddress: { contains: search } },
        { actor: { name: { contains: search } } },
        { actor: { email: { contains: search } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "admin/audit-logs:GET");
  }
}
