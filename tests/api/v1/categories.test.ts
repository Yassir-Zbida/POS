import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/categories/route";
import { DELETE } from "@/app/api/v1/categories/[id]/route";
import { makeRequest, mockManagerAuth } from "@/tests/helpers";

const MOCK_CAT = {
  id: "cat-1", nameFr: "Parfumerie", nameEn: "Perfumery", nameAr: null,
  color: "#7c3aed", vatRate: 20, parentId: null,
  children: [], parent: null, _count: { products: 5 },
  createdAt: new Date(), updatedAt: new Date(),
};

describe("GET /api/v1/categories", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns root categories with children", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([MOCK_CAT] as never);

    const req = makeRequest("GET", "/api/v1/categories");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.categories).toHaveLength(1);
    expect(json.categories[0].nameFr).toBe("Parfumerie");
  });
});

describe("POST /api/v1/categories", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates a category", async () => {
    vi.mocked(prisma.category.create).mockResolvedValue(MOCK_CAT as never);

    const req = makeRequest("POST", "/api/v1/categories", { nameFr: "Parfumerie" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.category.nameFr).toBe("Parfumerie");
  });

  it("returns 422 for missing nameFr", async () => {
    const req = makeRequest("POST", "/api/v1/categories", { nameEn: "Only English" });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/categories/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("deletes category with no products", async () => {
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.category.delete).mockResolvedValue(MOCK_CAT as never);

    const req = makeRequest("DELETE", "/api/v1/categories/cat-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "cat-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 409 when category has products", async () => {
    vi.mocked(prisma.product.count).mockResolvedValue(3);

    const req = makeRequest("DELETE", "/api/v1/categories/cat-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "cat-1" }) });

    expect(res.status).toBe(409);
  });
});
