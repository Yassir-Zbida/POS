import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const addStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/merchants/[id]/staff — list cashiers for a merchant */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const merchant = await prisma.user.findUnique({
    where: { id, role: ROLES.MANAGER },
    select: { id: true },
  });
  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const staff = await prisma.user.findMany({
    where: { role: ROLES.CASHIER, ownerManagerId: id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ staff });
}

/** POST /api/admin/merchants/[id]/staff — add a cashier to a merchant */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const merchant = await prisma.user.findUnique({
    where: { id, role: ROLES.MANAGER },
    select: { id: true },
  });
  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
  }

  const staff = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash: await hashPassword(parsed.data.password),
      role: ROLES.CASHIER,
      status: "ACTIVE",
      ownerManagerId: id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "MERCHANT_STAFF_ADDED",
    targetType: "USER",
    targetId: staff.id,
    metadata: { merchantId: id, email: staff.email },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ staff }, { status: 201 });
}
