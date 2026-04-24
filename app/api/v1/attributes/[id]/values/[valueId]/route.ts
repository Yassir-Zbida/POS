import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const updateValueSchema = z.object({
  value: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

/** PUT /api/v1/attributes/[id]/values/[valueId] */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; valueId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { valueId } = await params;
    const existing = await prisma.attributeValue.findUnique({ where: { id: valueId } });
    if (!existing) {
      return NextResponse.json({ error: "Attribute value not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateValueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const attributeValue = await prisma.attributeValue.update({
      where: { id: valueId },
      data: parsed.data,
    });

    return NextResponse.json({ attributeValue });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/attributes/[id]/values/[valueId]");
  }
}

/** DELETE /api/v1/attributes/[id]/values/[valueId] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; valueId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { valueId } = await params;
    const existing = await prisma.attributeValue.findUnique({
      where: { id: valueId },
      include: { _count: { select: { variants: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attribute value not found" }, { status: 404 });
    }

    if (existing._count.variants > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — this value is used by ${existing._count.variants} variant(s). Update those variants first.`,
        },
        { status: 409 },
      );
    }

    await prisma.attributeValue.delete({ where: { id: valueId } });
    return NextResponse.json({ message: "Attribute value deleted" });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "DELETE /api/v1/attributes/[id]/values/[valueId]");
  }
}
