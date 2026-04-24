import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ status: z.enum(["ACTIVE", "BANNED", "SUSPENDED"]) });

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
  const updated = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, email: true, role: true, status: true },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "USER_STATUS_UPDATED",
    targetType: "USER",
    targetId: id,
    metadata: { status: parsed.data.status },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ user: updated });
}
