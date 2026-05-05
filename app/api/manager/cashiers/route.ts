import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getCashierPermissions } from "@/lib/cashier-permissions-model";

const createCashierSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(200),
  /** 4-digit PIN for quick cashier sign-in (email remembered on device). */
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.MANAGER])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cashiers = await prisma.user.findMany({
    where: { role: ROLES.CASHIER, ownerManagerId: auth.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      createdAt: true,
      pinHash: true,
      cashierFullAuthAt: true,
      cashierPermissions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const payload = cashiers.map(({ pinHash, cashierFullAuthAt, cashierPermissions, ...rest }) => ({
    ...rest,
    cashierPermissions: getCashierPermissions({ role: ROLES.CASHIER, cashierPermissions }),
    hasPin: Boolean(pinHash),
    pinQuickLoginActive:
      Boolean(pinHash) &&
      cashierFullAuthAt != null &&
      Date.now() - cashierFullAuthAt.getTime() <= 30 * 24 * 60 * 60 * 1000,
  }));

  return NextResponse.json({ cashiers: payload });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.MANAGER])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCashierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const pinHash = await hashPassword(parsed.data.pin);

  let cashier;
  try {
    cashier = await prisma.user.create({
      data: {
        email: parsed.data.email.trim().toLowerCase(),
        name: parsed.data.name.trim(),
        passwordHash: await hashPassword(parsed.data.password),
        pinHash,
        pinAttempts: 0,
        pinLockedUntil: null,
        role: ROLES.CASHIER,
        status: "ACTIVE",
        ownerManagerId: auth.user.id,
        cashierFullAuthAt: null,
      },
      select: { id: true, email: true, name: true, role: true, status: true, ownerManagerId: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "EMAIL_IN_USE" }, { status: 409 });
    }
    throw e;
  }

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "CASHIER_CREATED",
    targetType: "USER",
    targetId: cashier.id,
    metadata: { email: cashier.email },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ cashier }, { status: 201 });
}
