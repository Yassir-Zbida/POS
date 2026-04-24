import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const creditPaymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

/** GET /api/v1/customers/[id]/credit — credit balance + payment history */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true, creditBalance: true, creditPayments: { orderBy: { createdAt: "desc" } } },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/customers/[id]/credit");
  }
}

/** POST /api/v1/customers/[id]/credit — record a credit payment (reduces debt) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = creditPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { amount, note } = parsed.data;
    const newBalance = Number(customer.creditBalance) - amount;

    const [payment, updated] = await prisma.$transaction([
      prisma.creditPayment.create({
        data: { customerId: id, amount, note, cashierId: auth.user.id },
      }),
      prisma.customer.update({
        where: { id },
        data: { creditBalance: Math.max(0, newBalance) },
      }),
    ]);

    return NextResponse.json({ payment, newCreditBalance: updated.creditBalance }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/customers/[id]/credit");
  }
}
