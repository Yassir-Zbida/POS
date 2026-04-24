import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/products/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/v1/products/[id]/route";
import { makeRequest, mockManagerAuth, mockCashierAuth } from "@/tests/helpers";

const MOCK_PRODUCT = {
  id: "prod-1",
  nameFr: "Parfum Test",
  nameEn: "Test Perfume",
  nameAr: null,
  sku: "SKU-001",
  barcode: "1234567890",
  price: 250,
  costPrice: 120,
  vatRate: 20,
  stock: 10,
  minStock: 2,
  imageUrl: null,
  isActive: true,
  categoryId: "cat-1",
  category: { id: "cat-1", nameFr: "Parfum" },
  variants: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/v1/products", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns paginated product list", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([MOCK_PRODUCT] as never);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const req = makeRequest("GET", "/api/v1/products");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.products).toHaveLength(1);
    expect(json.meta.total).toBe(1);
  });

  it("returns single product by barcode", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT as never);

    const req = makeRequest("GET", "/api/v1/products?barcode=1234567890");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.barcode).toBe("1234567890");
  });

  it("returns 404 when barcode not found", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    const req = makeRequest("GET", "/api/v1/products?barcode=NOTEXIST");
    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  it("returns 401 when no token", async () => {
    const req = makeRequest("GET", "/api/v1/products", undefined, "");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/products", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates a product successfully", async () => {
    vi.mocked(prisma.product.create).mockResolvedValue(MOCK_PRODUCT as never);

    const req = makeRequest("POST", "/api/v1/products", {
      nameFr: "Parfum Test",
      sku: "SKU-001",
      price: 250,
      categoryId: "cat-1",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.product.nameFr).toBe("Parfum Test");
  });

  it("returns 422 when required fields missing", async () => {
    const req = makeRequest("POST", "/api/v1/products", { nameFr: "" });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 403 for cashier role", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const req = makeRequest("POST", "/api/v1/products", {
      nameFr: "Test", sku: "SKU-X", price: 100, categoryId: "cat-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/products/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns product by id", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ ...MOCK_PRODUCT, movements: [] } as never);

    const req = makeRequest("GET", "/api/v1/products/prod-1");
    const res = await GET_ONE(req, { params: Promise.resolve({ id: "prod-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.id).toBe("prod-1");
  });

  it("returns 404 when not found", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    const req = makeRequest("GET", "/api/v1/products/nonexistent");
    const res = await GET_ONE(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/products/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("updates product price", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT as never);
    vi.mocked(prisma.product.update).mockResolvedValue({ ...MOCK_PRODUCT, price: 300 } as never);

    const req = makeRequest("PUT", "/api/v1/products/prod-1", { price: 300 });
    const res = await PUT(req, { params: Promise.resolve({ id: "prod-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.product.price).toBe(300);
  });
});

describe("DELETE /api/v1/products/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("soft-deletes a product", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(MOCK_PRODUCT as never);
    vi.mocked(prisma.product.update).mockResolvedValue({ ...MOCK_PRODUCT, isActive: false } as never);

    const req = makeRequest("DELETE", "/api/v1/products/prod-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "prod-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(vi.mocked(prisma.product.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });
});
