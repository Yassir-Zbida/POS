import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const movementSchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: z.number().positive(),
  reason: z.string().optional(),
});

/** GET /api/v1/sessions/[id]/movements */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const movements = await prisma.cashMovement.findMany({
      where: { sessionId: id },
      include: { cashier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ movements });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/sessions/[id]/movements");
  }
}

/** POST /api/v1/sessions/[id]/movements — log cash in/out */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const session = await prisma.cashRegisterSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "CLOSED") {
      return NextResponse.json({ error: "Session is closed" }, { status: 409 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = movementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const movement = await prisma.cashMovement.create({
      data: { sessionId: id, cashierId: auth.user.id, ...parsed.data },
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/sessions/[id]/movements");
  }
}
