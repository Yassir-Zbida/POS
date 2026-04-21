import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const manager = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!manager || manager.role !== "MANAGER") {
    return NextResponse.json({ error: "Manager not found" }, { status: 404 });
  }

  const subscription = await prisma.subscription.upsert({
    where: { managerId: id },
    update: { status: parsed.data.status },
    create: { managerId: id, status: parsed.data.status, startedAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "SUBSCRIPTION_STATUS_UPDATED",
    targetType: "SUBSCRIPTION",
    targetId: subscription.id,
    metadata: { managerId: id, status: parsed.data.status },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ subscription });
}
