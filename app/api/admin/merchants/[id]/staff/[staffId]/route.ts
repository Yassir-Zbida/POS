import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string; staffId: string }> };

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "BANNED", "SUSPENDED"]),
});

/** PATCH /api/admin/merchants/[id]/staff/[staffId] — update cashier status */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, staffId } = await params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const staff = await prisma.user.findUnique({
    where: { id: staffId, role: ROLES.CASHIER, ownerManagerId: id },
    select: { id: true, email: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: staffId },
    data: { status: parsed.data.status },
    select: { id: true, email: true, name: true, status: true },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "MERCHANT_STAFF_STATUS_UPDATED",
    targetType: "USER",
    targetId: staffId,
    metadata: { merchantId: id, status: parsed.data.status },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ staff: updated });
}

/** DELETE /api/admin/merchants/[id]/staff/[staffId] — remove cashier from merchant */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, staffId } = await params;

  const staff = await prisma.user.findUnique({
    where: { id: staffId, role: ROLES.CASHIER, ownerManagerId: id },
    select: { id: true, email: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: staffId },
    data: { status: "BANNED", ownerManagerId: null },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "MERCHANT_STAFF_REMOVED",
    targetType: "USER",
    targetId: staffId,
    metadata: { merchantId: id, email: staff.email },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true });
}
