import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { assertManagerAdminOrCashierPermission } from "@/lib/cashier-permissions";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/** GET /api/v1/customers ?search= ?page= ?limit= */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "customersView");
      if (denied) return denied;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const hasCredit = searchParams.get("hasCredit") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
    const skip = (page - 1) * limit;

    const where = {
      ...(hasCredit ? { creditBalance: { gt: 0 } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true, name: true, phone: true, email: true, city: true,
          creditBalance: true, loyaltyPoints: true, tags: true,
          _count: { select: { sales: true } },
          createdAt: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/customers");
  }
}

/** POST /api/v1/customers */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "customersEdit");
      if (denied) return denied;
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { tags, ...rest } = parsed.data;
    const customer = await prisma.customer.create({
      data: { ...rest, tags: tags ? JSON.stringify(tags) : null },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/customers");
  }
}
