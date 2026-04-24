import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/attributes/route";
import { GET as GET_ONE, PUT, DELETE as DELETE_ONE } from "@/app/api/v1/attributes/[id]/route";
import { POST as POST_VALUE } from "@/app/api/v1/attributes/[id]/values/route";
import { PUT as PUT_VALUE, DELETE as DELETE_VALUE } from "@/app/api/v1/attributes/[id]/values/[valueId]/route";
import { GET as GET_VARIANT, POST as POST_VARIANT } from "@/app/api/v1/products/[id]/variants/route";
import { GET as GET_VARIANT_ONE, PUT as PUT_VARIANT, DELETE as DELETE_VARIANT } from "@/app/api/v1/products/[id]/variants/[variantId]/route";
import { makeRequest, mockManagerAuth, mockCashierAuth } from "@/tests/helpers";

const MOCK_ATTR = {
  id: "attr-color",
  name: "Color",
  values: [
    { id: "val-red", attributeId: "attr-color", value: "Red", sortOrder: 0, createdAt: new Date() },
    { id: "val-blue", attributeId: "attr-color", value: "Blue", sortOrder: 1, createdAt: new Date() },
  ],
  _count: { products: 2 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_PRODUCT_VARIABLE = {
  id: "prod-1",
  type: "VARIABLE",
  nameFr: "T-Shirt",
  sku: "TSHIRT-001",
  price: 150,
  isActive: true,
  categoryId: "cat-1",
  attributes: [
    {
      productId: "prod-1",
      attributeId: "attr-color",
      attribute: MOCK_ATTR,
    },
  ],
};

// ─── Attribute CRUD ───────────────────────────────────────────────────────────

describe("GET /api/v1/attributes", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns list of attributes with their values", async () => {
    vi.mocked(prisma.attribute.findMany).mockResolvedValue([MOCK_ATTR] as never);

    const res = await GET(makeRequest("GET", "/api/v1/attributes"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.attributes).toHaveLength(1);
    expect(data.attributes[0].name).toBe("Color");
    expect(data.attributes[0].values).toHaveLength(2);
  });

  it("cashier can also read attributes", async () => {
    vi.clearAllMocks();
    mockCashierAuth();
    vi.mocked(prisma.attribute.findMany).mockResolvedValue([] as never);

    const res = await GET(makeRequest("GET", "/api/v1/attributes"));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/attributes", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates an attribute with seeded values", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.attribute.create).mockResolvedValue(MOCK_ATTR as never);

    const res = await POST(
      makeRequest("POST", "/api/v1/attributes", {
        name: "Color",
        values: [{ value: "Red" }, { value: "Blue" }],
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.attribute.name).toBe("Color");
    expect(data.attribute.values).toHaveLength(2);
  });

  it("returns 409 when attribute name already exists", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(MOCK_ATTR as never);

    const res = await POST(
      makeRequest("POST", "/api/v1/attributes", { name: "Color" }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 when name is missing", async () => {
    const res = await POST(
      makeRequest("POST", "/api/v1/attributes", {}),
    );
    expect(res.status).toBe(422);
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const res = await POST(
      makeRequest("POST", "/api/v1/attributes", { name: "Size" }),
    );
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/attributes/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns attribute with values", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(MOCK_ATTR as never);

    const res = await GET_ONE(makeRequest("GET", "/api/v1/attributes/attr-color"), {
      params: Promise.resolve({ id: "attr-color" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.attribute.values).toHaveLength(2);
  });

  it("returns 404 for unknown attribute", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(null);

    const res = await GET_ONE(makeRequest("GET", "/api/v1/attributes/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/attributes/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("renames an attribute", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(MOCK_ATTR as never);
    vi.mocked(prisma.attribute.update).mockResolvedValue({ ...MOCK_ATTR, name: "Colour" } as never);

    const res = await PUT(
      makeRequest("PUT", "/api/v1/attributes/attr-color", { name: "Colour" }),
      { params: Promise.resolve({ id: "attr-color" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.attribute.name).toBe("Colour");
  });
});

describe("DELETE /api/v1/attributes/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("deletes attribute when unused by products", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue({
      ...MOCK_ATTR,
      _count: { products: 0 },
    } as never);
    vi.mocked(prisma.attribute.delete).mockResolvedValue(MOCK_ATTR as never);

    const res = await DELETE_ONE(
      makeRequest("DELETE", "/api/v1/attributes/attr-color"),
      { params: Promise.resolve({ id: "attr-color" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/deleted/i);
  });

  it("returns 409 when attribute is used by products", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(MOCK_ATTR as never);

    const res = await DELETE_ONE(
      makeRequest("DELETE", "/api/v1/attributes/attr-color"),
      { params: Promise.resolve({ id: "attr-color" }) },
    );
    expect(res.status).toBe(409);
  });
});

// ─── Attribute Values ─────────────────────────────────────────────────────────

describe("POST /api/v1/attributes/[id]/values", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("adds a new value to an attribute", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(MOCK_ATTR as never);
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.attributeValue.create).mockResolvedValue({
      id: "val-green",
      attributeId: "attr-color",
      value: "Green",
      sortOrder: 2,
      createdAt: new Date(),
    } as never);

    const res = await POST_VALUE(
      makeRequest("POST", "/api/v1/attributes/attr-color/values", { value: "Green" }),
      { params: Promise.resolve({ id: "attr-color" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.attributeValue.value).toBe("Green");
  });

  it("returns 409 when value already exists", async () => {
    vi.mocked(prisma.attribute.findUnique).mockResolvedValue(MOCK_ATTR as never);
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue(
      MOCK_ATTR.values[0] as never,
    );

    const res = await POST_VALUE(
      makeRequest("POST", "/api/v1/attributes/attr-color/values", { value: "Red" }),
      { params: Promise.resolve({ id: "attr-color" }) },
    );
    expect(res.status).toBe(409);
  });
});

// ─── Variants with attribute combinations ────────────────────────────────────

describe("POST /api/v1/products/[id]/variants", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates a variant with attribute combination and auto-generates name", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT_VARIABLE as never);
    vi.mocked(prisma.attributeValue.findMany).mockResolvedValue([
      { id: "val-red", attributeId: "attr-color", value: "Red", attribute: { id: "attr-color", name: "Color" } },
    ] as never);
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.productVariant.create).mockResolvedValue({
      id: "var-1",
      productId: "prod-1",
      name: "Red",
      sku: "TSHIRT-RED",
      stock: 10,
      isActive: true,
      attributes: [
        {
          variantId: "var-1",
          attributeValueId: "val-red",
          attributeValue: { id: "val-red", value: "Red", attribute: { id: "attr-color", name: "Color" } },
        },
      ],
    } as never);

    const res = await POST_VARIANT(
      makeRequest("POST", "/api/v1/products/prod-1/variants", {
        attributeValueIds: ["val-red"],
        sku: "TSHIRT-RED",
        stock: 10,
      }),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.variant.name).toBe("Red");
    expect(data.variant.attributes).toHaveLength(1);
  });

  it("returns 409 when adding variant to a SIMPLE product", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      ...MOCK_PRODUCT_VARIABLE,
      type: "SIMPLE",
    } as never);

    const res = await POST_VARIANT(
      makeRequest("POST", "/api/v1/products/prod-1/variants", {
        attributeValueIds: ["val-red"],
      }),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(res.status).toBe(409);
  });

  it("returns 409 when combination already exists", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT_VARIABLE as never);
    vi.mocked(prisma.attributeValue.findMany).mockResolvedValue([
      { id: "val-red", attributeId: "attr-color", value: "Red", attribute: { id: "attr-color", name: "Color" } },
    ] as never);
    // existing variant has same combination
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([
      {
        id: "var-existing",
        name: "Red",
        attributes: [{ attributeValueId: "val-red" }],
      },
    ] as never);

    const res = await POST_VARIANT(
      makeRequest("POST", "/api/v1/products/prod-1/variants", {
        attributeValueIds: ["val-red"],
      }),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 when attributeValueIds is empty", async () => {
    const res = await POST_VARIANT(
      makeRequest("POST", "/api/v1/products/prod-1/variants", {
        attributeValueIds: [],
      }),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/products/[id]/variants", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns variants with structured attribute data", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT_VARIABLE as never);
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([
      {
        id: "var-1",
        name: "Red",
        sku: "TSHIRT-RED",
        stock: 10,
        attributes: [
          {
            variantId: "var-1",
            attributeValueId: "val-red",
            attributeValue: {
              id: "val-red",
              value: "Red",
              attribute: { id: "attr-color", name: "Color" },
            },
          },
        ],
      },
    ] as never);

    const res = await GET_VARIANT(makeRequest("GET", "/api/v1/products/prod-1/variants"), {
      params: Promise.resolve({ id: "prod-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.variants).toHaveLength(1);
    expect(data.variants[0].attributes[0].attributeValue.value).toBe("Red");
    expect(data.variants[0].attributes[0].attributeValue.attribute.name).toBe("Color");
  });
});

// ─── Attribute Value — PUT / DELETE ──────────────────────────────────────────

const MOCK_VALUE = {
  id: "val-red",
  attributeId: "attr-color",
  value: "Red",
  sortOrder: 0,
  createdAt: new Date(),
};

describe("PUT /api/v1/attributes/[id]/values/[valueId]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("updates value label and sortOrder", async () => {
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue(MOCK_VALUE as never);
    vi.mocked(prisma.attributeValue.update).mockResolvedValue({
      ...MOCK_VALUE,
      value: "Crimson",
      sortOrder: 5,
    } as never);

    const res = await PUT_VALUE(
      makeRequest("PUT", "/api/v1/attributes/attr-color/values/val-red", {
        value: "Crimson",
        sortOrder: 5,
      }),
      { params: Promise.resolve({ id: "attr-color", valueId: "val-red" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.attributeValue.value).toBe("Crimson");
    expect(data.attributeValue.sortOrder).toBe(5);
  });

  it("returns 404 for unknown value", async () => {
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue(null);

    const res = await PUT_VALUE(
      makeRequest("PUT", "/api/v1/attributes/attr-color/values/nope", { value: "X" }),
      { params: Promise.resolve({ id: "attr-color", valueId: "nope" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const res = await PUT_VALUE(
      makeRequest("PUT", "/api/v1/attributes/attr-color/values/val-red", { value: "X" }),
      { params: Promise.resolve({ id: "attr-color", valueId: "val-red" }) },
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/attributes/[id]/values/[valueId]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("deletes a value not used by any variant", async () => {
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue({
      ...MOCK_VALUE,
      _count: { variants: 0 },
    } as never);
    vi.mocked(prisma.attributeValue.delete).mockResolvedValue(MOCK_VALUE as never);

    const res = await DELETE_VALUE(
      makeRequest("DELETE", "/api/v1/attributes/attr-color/values/val-red"),
      { params: Promise.resolve({ id: "attr-color", valueId: "val-red" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/deleted/i);
  });

  it("returns 409 when value is used by variants", async () => {
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue({
      ...MOCK_VALUE,
      _count: { variants: 3 },
    } as never);

    const res = await DELETE_VALUE(
      makeRequest("DELETE", "/api/v1/attributes/attr-color/values/val-red"),
      { params: Promise.resolve({ id: "attr-color", valueId: "val-red" }) },
    );
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown value", async () => {
    vi.mocked(prisma.attributeValue.findUnique).mockResolvedValue(null);

    const res = await DELETE_VALUE(
      makeRequest("DELETE", "/api/v1/attributes/attr-color/values/nope"),
      { params: Promise.resolve({ id: "attr-color", valueId: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});

// ─── Variant — invalid attributeValueId + foreign attribute ──────────────────

describe("POST /api/v1/products/[id]/variants — validation edge cases", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns 422 when one of the attributeValueIds does not exist", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT_VARIABLE as never);
    // DB returns fewer values than requested → some IDs are invalid
    vi.mocked(prisma.attributeValue.findMany).mockResolvedValue([] as never);

    const res = await POST_VARIANT(
      makeRequest("POST", "/api/v1/products/prod-1/variants", {
        attributeValueIds: ["nonexistent-id"],
      }),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when attribute value does not belong to this product", async () => {
    // Product only has Color attribute; we pass a Size value
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT_VARIABLE as never);
    vi.mocked(prisma.attributeValue.findMany).mockResolvedValue([
      {
        id: "val-large",
        attributeId: "attr-size",   // ← different from product's attr-color
        value: "Large",
        attribute: { id: "attr-size", name: "Size" },
      },
    ] as never);

    const res = await POST_VARIANT(
      makeRequest("POST", "/api/v1/products/prod-1/variants", {
        attributeValueIds: ["val-large"],
      }),
      { params: Promise.resolve({ id: "prod-1" }) },
    );
    expect(res.status).toBe(422);
  });
});

// ─── Variant — GET / PUT / DELETE /[variantId] ───────────────────────────────

const MOCK_VARIANT = {
  id: "var-1",
  productId: "prod-1",
  name: "Red",
  sku: "TSHIRT-RED",
  barcode: null,
  priceOverride: null,
  costOverride: null,
  stock: 10,
  minStock: 0,
  isActive: true,
  attributes: [
    {
      variantId: "var-1",
      attributeValueId: "val-red",
      attributeValue: {
        id: "val-red",
        value: "Red",
        attribute: { id: "attr-color", name: "Color" },
      },
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/v1/products/[id]/variants/[variantId]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns a single variant with attribute data", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(MOCK_VARIANT as never);

    const res = await GET_VARIANT_ONE(
      makeRequest("GET", "/api/v1/products/prod-1/variants/var-1"),
      { params: Promise.resolve({ id: "prod-1", variantId: "var-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.variant.id).toBe("var-1");
    expect(data.variant.attributes[0].attributeValue.value).toBe("Red");
  });

  it("returns 404 for unknown variant", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(null);

    const res = await GET_VARIANT_ONE(
      makeRequest("GET", "/api/v1/products/prod-1/variants/nope"),
      { params: Promise.resolve({ id: "prod-1", variantId: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/products/[id]/variants/[variantId]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("updates stock and priceOverride", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(MOCK_VARIANT as never);
    vi.mocked(prisma.productVariant.update).mockResolvedValue({
      ...MOCK_VARIANT,
      stock: 50,
      priceOverride: 175,
    } as never);

    const res = await PUT_VARIANT(
      makeRequest("PUT", "/api/v1/products/prod-1/variants/var-1", {
        stock: 50,
        priceOverride: 175,
      }),
      { params: Promise.resolve({ id: "prod-1", variantId: "var-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.variant.stock).toBe(50);
    expect(data.variant.priceOverride).toBe(175);
  });

  it("returns 404 for unknown variant", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(null);

    const res = await PUT_VARIANT(
      makeRequest("PUT", "/api/v1/products/prod-1/variants/nope", { stock: 5 }),
      { params: Promise.resolve({ id: "prod-1", variantId: "nope" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const res = await PUT_VARIANT(
      makeRequest("PUT", "/api/v1/products/prod-1/variants/var-1", { stock: 5 }),
      { params: Promise.resolve({ id: "prod-1", variantId: "var-1" }) },
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/products/[id]/variants/[variantId]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("hard-deletes a variant with no sale history", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue({
      ...MOCK_VARIANT,
      _count: { saleItems: 0 },
    } as never);
    vi.mocked(prisma.productVariant.delete).mockResolvedValue(MOCK_VARIANT as never);

    const res = await DELETE_VARIANT(
      makeRequest("DELETE", "/api/v1/products/prod-1/variants/var-1"),
      { params: Promise.resolve({ id: "prod-1", variantId: "var-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/deleted/i);
    expect(vi.mocked(prisma.productVariant.delete)).toHaveBeenCalled();
  });

  it("soft-deactivates a variant that has sale history", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue({
      ...MOCK_VARIANT,
      _count: { saleItems: 5 },
    } as never);
    vi.mocked(prisma.productVariant.update).mockResolvedValue({
      ...MOCK_VARIANT,
      isActive: false,
    } as never);

    const res = await DELETE_VARIANT(
      makeRequest("DELETE", "/api/v1/products/prod-1/variants/var-1"),
      { params: Promise.resolve({ id: "prod-1", variantId: "var-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/deactivated/i);
    expect(vi.mocked(prisma.productVariant.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it("returns 404 for unknown variant", async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(null);

    const res = await DELETE_VARIANT(
      makeRequest("DELETE", "/api/v1/products/prod-1/variants/nope"),
      { params: Promise.resolve({ id: "prod-1", variantId: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});
