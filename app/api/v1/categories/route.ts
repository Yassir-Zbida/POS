import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const categorySchema = z.object({
  nameFr: z.string().min(1),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  color: z.string().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  parentId: z.string().optional(),
});

/** GET /api/v1/categories — returns flat list + tree structure */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const categories = await prisma.category.findMany({
      include: {
        children: { include: { children: true } },
        _count: { select: { products: true } },
      },
      where: { parentId: null },
      orderBy: { nameFr: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/categories");
  }
}

/** POST /api/v1/categories */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const category = await prisma.category.create({ data: parsed.data });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/categories");
  }
}
