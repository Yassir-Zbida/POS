import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(2).max(120).optional(),
  })
  .strict();

/** PATCH /api/manager/cashiers/[id] — update cashier email (and optional name). Resets PIN-only window until next full login. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.MANAGER])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const cashier = await prisma.user.findFirst({
    where: { id, role: ROLES.CASHIER, ownerManagerId: auth.user.id },
    select: { id: true, email: true },
  });
  if (!cashier) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const nextEmail = parsed.data.email.trim().toLowerCase();
  if (nextEmail !== cashier.email) {
    const taken = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } });
    if (taken && taken.id !== id) {
      return NextResponse.json({ error: "EMAIL_IN_USE" }, { status: 409 });
    }
  }

  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      email: nextEmail,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      cashierFullAuthAt: null,
    },
    select: { id: true, email: true, name: true, status: true, createdAt: true },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "CASHIER_UPDATED",
    targetType: "USER",
    targetId: id,
    metadata: { emailChanged: nextEmail !== cashier.email },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ cashier: updated });
}
