import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import {
  assertManagerAdminOrCashierPermission,
  getCashierIdsForManager,
} from "@/lib/cashier-permissions";
import { loadBusinessSettings, getLoyaltyRedeemMadPerPoint } from "@/lib/business-settings";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discountAmt: z.number().min(0).default(0),
});

const createSaleSchema = z.object({
  sessionId: z.string().optional(),
  locationId: z.string().optional(),
  customerId: z.string().optional(),
  couponId: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "CREDIT"]).default("CASH"),
  amountTendered: z.number().positive().optional(),
  discountAmt: z.number().min(0).default(0),
  /** Redeem loyalty points (requires customerId). MAD value = points × loyaltyRedeemMadPerPoint from business settings (default 0.1). */
  loyaltyPointsToRedeem: z.number().int().min(0).max(1_000_000).optional(),
  notes: z.string().optional(),
});

/** GET /api/v1/sales ?sessionId= ?customerId= ?from= ?to= ?page= ?limit= */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? undefined;
    const locationId = searchParams.get("locationId") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const cashierId = searchParams.get("cashierId") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const includeCredit = searchParams.get("includeCredit");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
    const skip = (page - 1) * limit;

    let where: Prisma.SaleWhereInput = {
      ...(sessionId ? { sessionId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(includeCredit === "false" ? { paymentMethod: { not: "CREDIT" } } : {}),
      ...((from || to)
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "salesView");
      if (denied) return denied;
      where = { ...where, cashierId: auth.user.id };
    } else if (auth.user.role === ROLES.MANAGER) {
      const teamIds = await getCashierIdsForManager(auth.user.id);
      const targetCashierId = cashierId && teamIds.includes(cashierId) ? cashierId : undefined;
      where =
        teamIds.length > 0
          ? targetCashierId
            ? { ...where, cashierId: targetCashierId }
            : { ...where, cashierId: { in: teamIds } }
          : { ...where, id: "___manager_no_cashiers___" };
    }

    const [sales, total, totals] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } },
          coupon: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
      prisma.sale.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
    ]);

    return NextResponse.json({
      sales,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: { totalAmount: Number(totals._sum.totalAmount ?? 0) },
    });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/sales");
  }
}

/** POST /api/v1/sales — create a sale (checkout) */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { items, sessionId, locationId, customerId, couponId, paymentMethod, amountTendered, discountAmt, loyaltyPointsToRedeem, notes } =
      parsed.data;

    if (auth.user.role === ROLES.CASHIER) {
      const denied = assertManagerAdminOrCashierPermission(auth.user, "posCheckout");
      if (denied) return denied;
    }

    if (paymentMethod === "CREDIT") {
      if (!customerId) {
        return NextResponse.json(
          { error: "customerId is required when payment method is CREDIT" },
          { status: 400 },
        );
      }
      if (auth.user.role === ROLES.CASHIER) {
        const denied = assertManagerAdminOrCashierPermission(auth.user, "creditCollect");
        if (denied) return denied;
      }
    }

    // Validate products + build item data
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Stock check
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.nameFr}" (available: ${product.stock})` },
          { status: 409 },
        );
      }
    }

    // Compute totals
    const itemsWithTotals = items.map((item) => ({
      ...item,
      totalPrice: item.unitPrice * item.quantity - item.discountAmt,
    }));

    const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.totalPrice, 0);
    const cartDiscount = discountAmt ?? 0;
    const remainderAfterCart = subtotal - cartDiscount;
    if (remainderAfterCart < 0) {
      return NextResponse.json({ error: "Cart discount cannot exceed subtotal" }, { status: 400 });
    }

    let loyaltyMad = 0;
    let loyaltyPointsUsed = 0;
    if (loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
      if (!customerId) {
        return NextResponse.json({ error: "customerId is required to redeem loyalty points" }, { status: 400 });
      }
      const settings = await loadBusinessSettings();
      const madPerPoint = getLoyaltyRedeemMadPerPoint(settings);
      loyaltyPointsUsed = loyaltyPointsToRedeem;
      loyaltyMad = loyaltyPointsUsed * madPerPoint;
      if (loyaltyMad > remainderAfterCart + 1e-9) {
        return NextResponse.json(
          { error: "Loyalty discount exceeds amount available after cart discount" },
          { status: 400 },
        );
      }
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { loyaltyPoints: true } });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      if (customer.loyaltyPoints < loyaltyPointsUsed) {
        return NextResponse.json({ error: "Insufficient loyalty points" }, { status: 409 });
      }
    }

    const totalDiscountForSale = cartDiscount + loyaltyMad;
    const afterDiscount = subtotal - totalDiscountForSale;
    const vatRate = 0.2; // 20% VAT default
    const vatAmt = afterDiscount * vatRate;
    const totalAmount = afterDiscount + vatAmt;
    const changeGiven = paymentMethod === "CASH" && amountTendered ? amountTendered - totalAmount : undefined;

    // Validate coupon if provided
    let coupon = null;
    if (couponId) {
      coupon = await prisma.coupon.findUnique({ where: { id: couponId, isActive: true } });
      if (!coupon) return NextResponse.json({ error: "Invalid or inactive coupon" }, { status: 400 });
      const now = new Date();
      if (coupon.validFrom && coupon.validFrom > now) {
        return NextResponse.json({ error: "Coupon not yet valid" }, { status: 400 });
      }
      if (coupon.validTo && coupon.validTo < now) {
        return NextResponse.json({ error: "Coupon expired" }, { status: 400 });
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }
    }

    // Persist everything in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          sessionId,
          locationId,
          cashierId: auth.user.id,
          customerId,
          couponId,
          subtotal,
          discountAmt: totalDiscountForSale,
          vatAmt,
          totalAmount,
          paymentMethod,
          amountTendered,
          changeGiven,
          notes,
          items: {
            create: itemsWithTotals.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountAmt: i.discountAmt,
              totalPrice: i.totalPrice,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } },
          customer: { select: { id: true, name: true } },
          coupon: { select: { id: true, code: true } },
        },
      });

      // Deduct stock + log movements
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: "SALE",
            qtyDelta: -item.quantity,
            refId: newSale.id,
            refType: "SALE",
            userId: auth.user.id,
          },
        });
      }

      // Update coupon usage
      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      }

      if (customerId) {
        const pointsEarned = Math.floor(totalAmount / 10);
        const netLoyalty = pointsEarned - loyaltyPointsUsed;
        const custData: { loyaltyPoints?: { increment: number }; creditBalance?: { increment: number } } = {};
        if (netLoyalty !== 0) custData.loyaltyPoints = { increment: netLoyalty };
        if (paymentMethod === "CREDIT") custData.creditBalance = { increment: totalAmount };
        if (Object.keys(custData).length > 0) {
          await tx.customer.update({ where: { id: customerId }, data: custData });
        }
      }

      return newSale;
    });

    // Trigger low-stock notifications after the transaction
    for (const item of items) {
      const updated = await prisma.product.findUnique({ where: { id: item.productId }, select: { stock: true, minStock: true, nameFr: true } });
      if (updated && updated.stock <= updated.minStock) {
        const notifType = updated.stock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK";
        await prisma.notification.create({
          data: {
            type: notifType,
            title: notifType === "OUT_OF_STOCK" ? "Out of stock" : "Low stock",
            message: `"${updated.nameFr}" stock is ${updated.stock} (min: ${updated.minStock})`,
            refType: "PRODUCT",
            refId: item.productId,
          },
        }).catch(() => null);
      }
    }

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "SALE_CREATED",
      targetType: "SALE",
      targetId: sale.id,
      metadata: {
        totalAmount,
        paymentMethod,
        itemCount: items.length,
        loyaltyPointsRedeemed: loyaltyPointsUsed || undefined,
        loyaltyDiscountMad: loyaltyMad || undefined,
      },
    });

    return NextResponse.json(
      {
        sale,
        summary: {
          subtotal,
          discountAmt: cartDiscount,
          loyaltyDiscountMad: loyaltyMad,
          loyaltyPointsRedeemed: loyaltyPointsUsed,
          totalDiscount: totalDiscountForSale,
          vatAmt,
          totalAmount,
          changeGiven,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/sales");
  }
}
