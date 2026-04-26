import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const updateSchema = z.object({
  name: z.string().min(2).optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "BANNED", "SUSPENDED"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/users/[id] — full user detail */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
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
          select: { id: true, name: true, email: true, status: true },
        },
        location: {
          select: { id: true, name: true, city: true, address: true, isActive: true },
        },
        cashiers: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        managedLocations: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        subscriptions: {
          select: { id: true, status: true, startedAt: true, endedAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { cashiers: true, managedLocations: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        subscription: user.subscriptions[0] ?? null,
        subscriptions: undefined,
      },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/admin/users/[id]");
  }
}

/** PUT /api/admin/users/[id] — update user profile */
export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "USER_UPDATED",
      targetType: "USER",
      targetId: id,
      metadata: parsed.data as Record<string, unknown>,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ user });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/admin/users/[id]");
  }
}

/** DELETE /api/admin/users/[id] — permanently delete a user and all related data */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        managedLocations: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting yourself
    if (id === auth.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const locationIds = user.managedLocations.map((l) => l.id);

    if (user.role === "MANAGER") {
      // Full cascade delete for managers (same as merchant delete)
      await prisma.$transaction([
        ...(locationIds.length > 0
          ? [
              prisma.sale.deleteMany({ where: { locationId: { in: locationIds } } }),
              prisma.cashRegisterSession.deleteMany({ where: { locationId: { in: locationIds } } }),
              prisma.purchaseOrder.deleteMany({ where: { locationId: { in: locationIds } } }),
            ]
          : []),
        prisma.refreshToken.deleteMany({ where: { user: { ownerManagerId: id } } }),
        prisma.user.deleteMany({ where: { ownerManagerId: id } }),
        prisma.location.deleteMany({ where: { managerId: id } }),
        prisma.subscription.deleteMany({ where: { managerId: id } }),
        prisma.refreshToken.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
    } else {
      // Simpler delete for admins and cashiers
      await prisma.$transaction([
        prisma.refreshToken.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
    }

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "USER_DELETED",
      targetType: "USER",
      targetId: id,
      metadata: { email: user.email, role: user.role },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/admin/users/[id]");
  }
}
