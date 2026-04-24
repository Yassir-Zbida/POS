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

const createAttributeSchema = z.object({
  name: z.string().min(1, "Attribute name is required"),
  /// Optionally seed initial values when creating the attribute
  values: z
    .array(z.object({ value: z.string().min(1), sortOrder: z.number().int().default(0) }))
    .optional(),
});

/** GET /api/v1/attributes — list all global attributes with their values */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";

    const attributes = await prisma.attribute.findMany({
      where: search
        ? { name: { contains: search } }
        : undefined,
      include: {
        values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ attributes });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/attributes");
  }
}

/** POST /api/v1/attributes */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createAttributeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    // Check for duplicate name
    const existing = await prisma.attribute.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return NextResponse.json(
        { error: `Attribute "${parsed.data.name}" already exists` },
        { status: 409 },
      );
    }

    const attribute = await prisma.attribute.create({
      data: {
        name: parsed.data.name,
        values: parsed.data.values
          ? { create: parsed.data.values }
          : undefined,
      },
      include: { values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "ATTRIBUTE_CREATED",
      targetType: "ATTRIBUTE",
      targetId: attribute.id,
      metadata: { name: attribute.name, valueCount: attribute.values.length },
    });

    return NextResponse.json({ attribute }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/attributes");
  }
}
