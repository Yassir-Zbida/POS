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

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  isActive: z.boolean().optional(),
  managerId: z.string().nullable().optional(),
});

/** GET /api/v1/locations/[id] */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        users: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { sessions: true, sales: true, purchaseOrders: true } },
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ location });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/locations/[id]");
  }
}

/** PUT /api/v1/locations/[id] */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const location = await prisma.location.update({
      where: { id },
      data: parsed.data,
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "LOCATION_UPDATED",
      targetType: "LOCATION",
      targetId: id,
      metadata: parsed.data,
    });

    return NextResponse.json({ location });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/locations/[id]");
  }
}

/** DELETE /api/v1/locations/[id] — soft-delete (sets isActive=false) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
      return NextResponse.json({ error: "Forbidden – admin only" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Block deactivation if there is an OPEN session at this location
    const openSession = await prisma.cashRegisterSession.findFirst({
      where: { locationId: id, status: "OPEN" },
    });
    if (openSession) {
      return NextResponse.json(
        { error: "Cannot deactivate a location with an open cash session" },
        { status: 409 },
      );
    }

    await prisma.location.update({ where: { id }, data: { isActive: false } });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "LOCATION_DEACTIVATED",
      targetType: "LOCATION",
      targetId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ message: "Location deactivated" });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/locations/[id]");
  }
}
