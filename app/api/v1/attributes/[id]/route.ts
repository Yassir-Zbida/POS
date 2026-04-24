import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const updateAttributeSchema = z.object({
  name: z.string().min(1).optional(),
});

/** GET /api/v1/attributes/[id] */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
        _count: { select: { products: true } },
      },
    });

    if (!attribute) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    return NextResponse.json({ attribute });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/attributes/[id]");
  }
}

/** PUT /api/v1/attributes/[id] — rename the attribute */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.attribute.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateAttributeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const attribute = await prisma.attribute.update({
      where: { id },
      data: parsed.data,
      include: { values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "ATTRIBUTE_UPDATED",
      targetType: "ATTRIBUTE",
      targetId: id,
      metadata: parsed.data,
    });

    return NextResponse.json({ attribute });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/attributes/[id]");
  }
}

/** DELETE /api/v1/attributes/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.attribute.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — this attribute is used by ${existing._count.products} product(s). Remove it from those products first.`,
        },
        { status: 409 },
      );
    }

    await prisma.attribute.delete({ where: { id } });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "ATTRIBUTE_DELETED",
      targetType: "ATTRIBUTE",
      targetId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ message: "Attribute deleted" });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/attributes/[id]");
  }
}
