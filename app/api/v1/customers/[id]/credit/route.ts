import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { assertManagerAdminOrCashierPermission } from "@/lib/cashier-permissions";
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

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "customersView");
      if (denied) return denied;
    }

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        creditBalance: true,
        creditPayments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            amount: true,
            note: true,
            createdAt: true,
            cashier: { select: { id: true, name: true, email: true } },
          },
        },
        sales: {
          where: { paymentMethod: "CREDIT" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            status: true,
            cashier: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    let runningBalance = 0;
    const ledger = [
      ...customer.sales.map((s) => ({
        kind: "SALE_CREDIT" as const,
        id: s.id,
        amount: Number(s.totalAmount),
        createdAt: s.createdAt,
        status: s.status,
        cashier: s.cashier,
      })),
      ...customer.creditPayments.map((p) => ({
        kind: "PAYMENT" as const,
        id: p.id,
        amount: Number(p.amount),
        createdAt: p.createdAt,
        note: p.note,
        cashier: p.cashier,
      })),
    ]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry) => {
        if (entry.kind === "SALE_CREDIT") runningBalance += entry.amount;
        else runningBalance = Math.max(0, runningBalance - entry.amount);
        return { ...entry, balanceAfter: runningBalance };
      })
      .reverse();

    const totalCreditSales = customer.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalPaid = customer.creditPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        creditBalance: customer.creditBalance,
      },
      summary: {
        totalCreditSales,
        totalPaid,
        remainingBalance: Number(customer.creditBalance),
      },
      ledger,
    });
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

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "creditCollect");
      if (denied) return denied;
    }

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
