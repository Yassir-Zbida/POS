import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import {
  databaseUnavailableResponse,
  internalErrorResponse,
  isDatabaseConnectionError,
} from "@/lib/api-route-errors";

const addValueSchema = z.object({
  value: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

/** POST /api/v1/attributes/[id]/values — add a value to an attribute */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: attributeId } = await params;
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
    if (!attribute) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = addValueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const existing = await prisma.attributeValue.findUnique({
      where: { attributeId_value: { attributeId, value: parsed.data.value } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Value "${parsed.data.value}" already exists in this attribute` },
        { status: 409 },
      );
    }

    const attributeValue = await prisma.attributeValue.create({
      data: { attributeId, ...parsed.data },
    });

    return NextResponse.json({ attributeValue }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/attributes/[id]/values");
  }
}
