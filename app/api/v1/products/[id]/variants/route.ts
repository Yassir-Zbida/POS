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

const variantSchema = z.object({
  /// attributeValueIds are the IDs of the AttributeValue records that
  /// define this variant (e.g., [redId, largeId]).
  /// The label (name) is auto-generated from the values when not provided.
  attributeValueIds: z.array(z.string()).min(1, "At least one attribute value is required"),
  name: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  priceOverride: z.number().positive().optional(),
  costOverride: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const VARIANT_INCLUDE = {
  attributes: {
    include: {
      attributeValue: {
        include: { attribute: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

/** GET /api/v1/products/[id]/variants */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      include: VARIANT_INCLUDE,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ variants });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/products/[id]/variants");
  }
}

/** POST /api/v1/products/[id]/variants
 *
 * Creates a new variant for a VARIABLE product. Pass the AttributeValue IDs
 * that make up this variant combination (e.g., Color=Red + Size=Large).
 * The variant name is auto-generated ("Red / Large") unless overridden.
 *
 * Example body:
 * {
 *   "attributeValueIds": ["attr-val-red-id", "attr-val-large-id"],
 *   "sku": "TSHIRT-RED-L",
 *   "priceOverride": 160,
 *   "stock": 25
 * }
 */
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

    const { id: productId } = await params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { attributes: { include: { attribute: true } } },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.type !== "VARIABLE") {
      return NextResponse.json(
        { error: "Variants can only be added to VARIABLE products. Change the product type first." },
        { status: 409 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = variantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { attributeValueIds, name: customName, sku, barcode, priceOverride, costOverride, stock, minStock, isActive } = parsed.data;

    // Validate all attribute value IDs exist and belong to this product's attributes
    const attributeValues = await prisma.attributeValue.findMany({
      where: { id: { in: attributeValueIds } },
      include: { attribute: true },
    });

    if (attributeValues.length !== attributeValueIds.length) {
      return NextResponse.json(
        { error: "One or more attribute value IDs are invalid" },
        { status: 422 },
      );
    }

    const productAttributeIds = product.attributes.map((pa) => pa.attributeId);
    const foreignAttr = attributeValues.find(
      (av) => !productAttributeIds.includes(av.attributeId),
    );
    if (foreignAttr) {
      return NextResponse.json(
        {
          error: `Attribute "${foreignAttr.attribute.name}" is not assigned to this product. Add it to the product's attributes first.`,
        },
        { status: 422 },
      );
    }

    // Auto-generate label from attribute values (sorted by attribute name for consistency)
    const sortedValues = [...attributeValues].sort((a, b) =>
      a.attribute.name.localeCompare(b.attribute.name),
    );
    const autoName = sortedValues.map((av) => av.value).join(" / ");
    const variantName = customName ?? autoName;

    // Check for duplicate combination on this product
    const existingVariants = await prisma.productVariant.findMany({
      where: { productId },
      include: { attributes: true },
    });

    const valueIdSet = new Set(attributeValueIds);
    const duplicate = existingVariants.find((v) => {
      const vSet = new Set(v.attributes.map((a) => a.attributeValueId));
      return (
        vSet.size === valueIdSet.size && [...vSet].every((id) => valueIdSet.has(id))
      );
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `A variant with this exact attribute combination already exists: "${duplicate.name}"` },
        { status: 409 },
      );
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: variantName,
        sku,
        barcode,
        priceOverride,
        costOverride,
        stock,
        minStock,
        isActive,
        attributes: {
          create: attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
        },
      },
      include: VARIANT_INCLUDE,
    });

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: "VARIANT_CREATED",
      targetType: "PRODUCT_VARIANT",
      targetId: variant.id,
      metadata: { productId, variantName, attributeValueIds },
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/products/[id]/variants");
  }
}
