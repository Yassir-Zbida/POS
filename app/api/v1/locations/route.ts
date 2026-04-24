import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const createLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  managerId: z.string().optional(),
});

/** GET /api/v1/locations ?includeInactive=true ?page= ?limit= */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
    const skip = (page - 1) * limit;

    const where = includeInactive ? {} : { isActive: true };

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where,
        include: {
          manager: { select: { id: true, name: true, email: true } },
          _count: { select: { users: true, sessions: true, sales: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.location.count({ where }),
    ]);

    return NextResponse.json({
      locations,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/locations");
  }
}

/** POST /api/v1/locations */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const location = await prisma.location.create({
      data: parsed.data,
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "LOCATION_CREATED",
      targetType: "LOCATION",
      targetId: location.id,
      metadata: { name: location.name, city: location.city },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/locations");
  }
}
