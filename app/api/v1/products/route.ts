import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const productSchema = z.object({
  type: z.enum(["SIMPLE", "VARIABLE", "SERVICE"]).default("SIMPLE"),
  nameFr: z.string().min(1),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  price: z.number().positive(),
  costPrice: z.number().positive().optional(),
  vatRate: z.number().min(0).max(100).default(20),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().min(1),
  /// IDs of global attributes to attach (for VARIABLE products)
  attributeIds: z.array(z.string()).optional(),
});

/** GET /api/v1/products
 * ?search=  ?categoryId=  ?barcode=  ?lowStock=true  ?page=  ?limit=
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const barcode = searchParams.get("barcode") ?? undefined;
    const lowStock = searchParams.get("lowStock") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
    const skip = (page - 1) * limit;

    if (barcode) {
      const product = await prisma.product.findUnique({
        where: { barcode },
        include: { category: true, variants: true },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      return NextResponse.json({ product });
    }

    // lowStock uses raw SQL because Prisma cannot compare two columns (stock <= minStock)
    if (lowStock) {
      const products = await prisma.$queryRaw<
        Array<{ id: string; nameFr: string; nameEn: string | null; sku: string; barcode: string | null; price: number; stock: number; minStock: number; categoryId: string; isActive: boolean }>
      >`
        SELECT id, nameFr, nameEn, nameAr, sku, barcode, price, costPrice, vatRate, stock, minStock, imageUrl, isActive, categoryId, createdAt, updatedAt
        FROM Product
        WHERE isActive = 1 AND stock <= minStock
        ${categoryId ? prisma.$queryRaw`AND categoryId = ${categoryId}` : prisma.$queryRaw``}
        ORDER BY stock ASC
        LIMIT ${limit} OFFSET ${skip}
      `;
      return NextResponse.json({ products, meta: { total: products.length, page, limit, pages: 1 } });
    }

    const where = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { nameFr: { contains: search } },
              { nameEn: { contains: search } },
              { nameAr: { contains: search } },
              { sku: { contains: search } },
              { barcode: { contains: search } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, variants: true },
        orderBy: { nameFr: "asc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/products");
  }
}

/** POST /api/v1/products */
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

    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { price, costPrice, vatRate, attributeIds, ...rest } = parsed.data;

    const product = await prisma.product.create({
      data: {
        ...rest,
        price,
        costPrice: costPrice ?? null,
        vatRate,
        attributes: attributeIds?.length
          ? { create: attributeIds.map((attributeId) => ({ attributeId })) }
          : undefined,
      },
      include: {
        category: true,
        attributes: { include: { attribute: { include: { values: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] } } } } },
      },
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "PRODUCT_CREATED",
      targetType: "PRODUCT",
      targetId: product.id,
      metadata: { nameFr: product.nameFr, sku: product.sku },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/products");
  }
}
