import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/mailer";
import { buildMerchantWelcomeEmail } from "@/lib/email-templates/merchant-welcome-email";
import { getEmailFromByLocale, getLocaleFromRequest } from "@/lib/email-request-helpers";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

/** ISO datetime or date-only YYYY-MM-DD (HTML date input) */
const subscriptionEndSchema = z
  .union([z.string().datetime(), z.string().date()])
  .optional()
  .nullable();

const createMerchantSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  subscriptionStatus: z
    .enum(["ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"])
    .default("ACTIVE"),
  subscriptionEndedAt: subscriptionEndSchema,
});

/** GET /api/admin/merchants — list all managers with subscription & counts */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const subStatus = searchParams.get("subStatus") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  type UserStatusFilter = "ACTIVE" | "BANNED" | "SUSPENDED";
  const statusFilter = (["ACTIVE", "BANNED", "SUSPENDED"] as const).includes(
    status as UserStatusFilter
  )
    ? (status as UserStatusFilter)
    : undefined;

  const where = {
    role: "MANAGER" as const,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [merchants, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        subscriptions: {
          select: { id: true, status: true, startedAt: true, endedAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            cashiers: true,
            managedLocations: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const formatted = merchants
    .map((m) => ({
      ...m,
      subscription: m.subscriptions[0] ?? null,
      subscriptions: undefined,
    }))
    .filter((m) => !subStatus || m.subscription?.status === subStatus);

  // Stats
  const allManagers = await prisma.user.findMany({
    where: { role: ROLES.MANAGER },
    select: {
      status: true,
      subscriptions: {
        select: { status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const stats = {
    total: allManagers.length,
    active: allManagers.filter((m) => m.status === "ACTIVE").length,
    suspended: allManagers.filter((m) => m.status === "SUSPENDED").length,
    banned: allManagers.filter((m) => m.status === "BANNED").length,
    subActive: allManagers.filter((m) => m.subscriptions[0]?.status === "ACTIVE").length,
    subPastDue: allManagers.filter((m) => m.subscriptions[0]?.status === "PAST_DUE").length,
    subSuspended: allManagers.filter((m) => m.subscriptions[0]?.status === "SUSPENDED").length,
  };

  return NextResponse.json({
    merchants: formatted,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    stats,
  });
}

function firstZodFormMessage(issues: { message: string }[]): string {
  if (!issues.length) return "Invalid payload";
  return issues[0]!.message;
}

/** POST /api/admin/merchants — create a new merchant account */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json(
      { error: "Only platform administrators can create merchant accounts." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createMerchantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        message: firstZodFormMessage(parsed.error.issues),
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { subscriptionEndedAt: endRaw, ...rest } = parsed.data;
  const endedAt = endRaw
    ? new Date(endRaw.includes("T") ? endRaw : `${endRaw}T00:00:00.000Z`)
    : undefined;
  if (endRaw && Number.isNaN(endedAt?.getTime())) {
    return NextResponse.json({ error: "Invalid subscription end date" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: rest.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }

    const merchant = await prisma.user.create({
      data: {
        email: rest.email,
        name: rest.name,
        phone: rest.phone,
        passwordHash: await hashPassword(rest.password),
        role: "MANAGER",
        status: "ACTIVE",
        mustChangePassword: true,
        subscriptions: {
          create: {
            status: rest.subscriptionStatus,
            startedAt: new Date(),
            endedAt: endedAt,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        subscriptions: {
          select: { id: true, status: true, startedAt: true, endedAt: true },
          take: 1,
        },
      },
    });

    try {
      await writeAuditLog({
        actorUserId: auth.user.id,
        action: "MERCHANT_CREATED",
        targetType: "USER",
        targetId: merchant.id,
        metadata: { email: merchant.email, name: merchant.name },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
    } catch (e) {
      console.error("[POST /api/admin/merchants] writeAuditLog failed (merchant was created):", e);
    }

    // Send welcome email (do not block creation on SMTP failures)
    try {
      const locale = getLocaleFromRequest(request);
      const emailContent = buildMerchantWelcomeEmail({
        locale,
        merchantName: merchant.name ?? "Merchant",
        email: rest.email,
        password: rest.password,
      });
      await sendEmail({
        to: rest.email.toLowerCase(),
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        from: getEmailFromByLocale(locale),
      });
    } catch (e) {
      console.error("[POST /api/admin/merchants] welcome email failed (merchant was created):", e);
    }

    const { subscriptions, ...m } = merchant;
    return NextResponse.json(
      {
        merchant: {
          ...m,
          subscription: subscriptions[0] ?? null,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    if (isDatabaseConnectionError(e)) {
      return databaseUnavailableResponse();
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email already exists", code: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }
    return internalErrorResponse(e, "POST /api/admin/merchants");
  }
}
