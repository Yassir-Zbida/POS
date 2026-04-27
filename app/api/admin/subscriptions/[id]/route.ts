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

const endDateSchema = z
  .union([z.string().datetime(), z.string().date()])
  .optional()
  .nullable();

const schema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"]).optional(),
  endedAt: endDateSchema,
});

/** PATCH /api/admin/subscriptions/[id] — update status and/or expiry date */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = await params;

  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const { endedAt: endRaw, status } = parsed.data;
  let endedAt: Date | null | undefined = undefined;

  if (endRaw !== undefined) {
    if (endRaw === null) {
      endedAt = null;
    } else {
      const d = new Date(endRaw.includes("T") ? endRaw : `${endRaw}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      endedAt = d;
    }
  }

  try {
    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(endedAt !== undefined ? { endedAt } : {}),
      },
      include: {
        manager: {
          select: { id: true, email: true, name: true, status: true },
        },
      },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "SUBSCRIPTION_UPDATED",
      targetType: "SUBSCRIPTION",
      targetId: id,
      metadata: {
        status,
        endedAt: endedAt instanceof Date ? endedAt.toISOString() : endedAt,
      },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      subscription: {
        id: updated.id,
        managerId: updated.managerId,
        status: updated.status,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        merchant: updated.manager,
      },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PATCH /api/admin/subscriptions/[id]");
  }
}
