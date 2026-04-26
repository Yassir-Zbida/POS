import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "BANNED", "SUSPENDED"]).optional(),
  subscriptionStatus: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"]).optional(),
  subscriptionEndedAt: z.string().datetime().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/merchants/[id] — full merchant detail */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const merchant = await prisma.user.findUnique({
    where: { id, role: ROLES.MANAGER },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      subscriptions: {
        select: { id: true, status: true, startedAt: true, endedAt: true, updatedAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
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
          address: true,
          city: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  return NextResponse.json({
    merchant: {
      ...merchant,
      subscription: merchant.subscriptions[0] ?? null,
      subscriptions: undefined,
    },
  });
}

/** PUT /api/admin/merchants/[id] — update merchant info & subscription */
export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({
    where: { id, role: ROLES.MANAGER },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const { subscriptionStatus, subscriptionEndedAt, ...userFields } = parsed.data;

  const merchant = await prisma.user.update({
    where: { id },
    data: {
      ...userFields,
      ...(subscriptionStatus !== undefined
        ? {
            subscriptions: {
              upsert: {
                where: { managerId: id },
                update: {
                  status: subscriptionStatus,
                  endedAt:
                    subscriptionEndedAt !== undefined
                      ? subscriptionEndedAt
                        ? new Date(subscriptionEndedAt)
                        : null
                      : undefined,
                },
                create: {
                  status: subscriptionStatus,
                  startedAt: new Date(),
                  endedAt: subscriptionEndedAt ? new Date(subscriptionEndedAt) : undefined,
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      updatedAt: true,
      subscriptions: {
        select: { id: true, status: true, startedAt: true, endedAt: true },
        take: 1,
      },
    },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "MERCHANT_UPDATED",
    targetType: "USER",
    targetId: id,
    metadata: parsed.data as Record<string, unknown>,
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({
    merchant: {
      ...merchant,
      subscription: merchant.subscriptions[0] ?? null,
      subscriptions: undefined,
    },
  });
}

/** DELETE /api/admin/merchants/[id] — permanently delete merchant and all related data */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const merchant = await prisma.user.findUnique({
    where: { id, role: ROLES.MANAGER },
    select: {
      id: true,
      email: true,
      managedLocations: { select: { id: true } },
    },
  });
  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const locationIds = merchant.managedLocations.map((loc) => loc.id);

  // Delete merchant and all related data in a transaction
  // Order matters: delete child records before parent records
  await prisma.$transaction([
    // Delete all data related to the merchant's locations
    ...(locationIds.length > 0
      ? [
          // Delete sales related to these locations
          prisma.sale.deleteMany({
            where: { locationId: { in: locationIds } },
          }),
          // Delete cash register sessions
          prisma.cashRegisterSession.deleteMany({
            where: { locationId: { in: locationIds } },
          }),
          // Delete purchase orders
          prisma.purchaseOrder.deleteMany({
            where: { locationId: { in: locationIds } },
          }),
        ]
      : []),
    // Delete all cashiers (staff) and their refresh tokens
    prisma.refreshToken.deleteMany({
      where: { user: { ownerManagerId: id } },
    }),
    prisma.user.deleteMany({
      where: { ownerManagerId: id },
    }),
    // Delete all locations managed by this merchant
    prisma.location.deleteMany({
      where: { managerId: id },
    }),
    // Delete merchant's subscriptions and refresh tokens
    prisma.subscription.deleteMany({
      where: { managerId: id },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId: id },
    }),
    // Finally, delete the merchant user
    prisma.user.delete({
      where: { id },
    }),
  ]);

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "MERCHANT_DELETED",
    targetType: "USER",
    targetId: id,
    metadata: { email: merchant.email, locationCount: locationIds.length },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true });
}
