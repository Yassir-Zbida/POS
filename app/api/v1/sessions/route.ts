import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const openSessionSchema = z.object({
  floatOpen: z.number().min(0),
  notes: z.string().optional(),
});

/** GET /api/v1/sessions ?status=OPEN|CLOSED ?page= ?limit= */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "OPEN" | "CLOSED" | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const skip = (page - 1) * limit;

    const where = {
      cashierId: auth.user.role === "CASHIER" ? auth.user.id : undefined,
      ...(status ? { status } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.cashRegisterSession.findMany({
        where,
        include: {
          cashier: { select: { id: true, name: true, email: true } },
          _count: { select: { sales: true, cashMovements: true } },
        },
        orderBy: { openedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.cashRegisterSession.count({ where }),
    ]);

    return NextResponse.json({ sessions, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/sessions");
  }
}

/** POST /api/v1/sessions — open a new cash session */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    // Block if cashier already has an open session
    const existing = await prisma.cashRegisterSession.findFirst({
      where: { cashierId: auth.user.id, status: "OPEN" },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have an open session", sessionId: existing.id }, { status: 409 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = openSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const session = await prisma.cashRegisterSession.create({
      data: { cashierId: auth.user.id, floatOpen: parsed.data.floatOpen, notes: parsed.data.notes },
      include: { cashier: { select: { id: true, name: true } } },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "SESSION_OPENED",
      targetType: "CASH_SESSION",
      targetId: session.id,
      metadata: { floatOpen: parsed.data.floatOpen },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/sessions");
  }
}
