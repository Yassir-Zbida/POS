import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/v1/purchase-orders/[id]/route";
import { makeRequest, mockManagerAuth } from "@/tests/helpers";

const MOCK_PO = {
  id: "po-1", supplierId: "sup-1",
  supplier: { id: "sup-1", name: "Supplier Maroc" },
  status: "PENDING", totalCost: 1200, notes: null,
  receivedAt: null, createdById: "manager-1",
  items: [
    { id: "poi-1", orderId: "po-1", productId: "prod-1", variantId: null,
      qtyOrdered: 10, qtyReceived: 0, unitCost: 120,
      product: { id: "prod-1", nameFr: "Parfum Test", sku: "SKU-001", barcode: null, stock: 5 }, variant: null },
  ],
  createdAt: new Date(), updatedAt: new Date(),
};

describe("GET /api/v1/purchase-orders/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns the purchase order", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(MOCK_PO as never);

    const req = makeRequest("GET", "/api/v1/purchase-orders/po-1");
    const res = await GET(req, { params: Promise.resolve({ id: "po-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order.id).toBe("po-1");
    expect(json.order.items).toHaveLength(1);
  });

  it("returns 404 for unknown PO", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(null);

    const req = makeRequest("GET", "/api/v1/purchase-orders/bad-id");
    const res = await GET(req, { params: Promise.resolve({ id: "bad-id" }) });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/purchase-orders/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("updates notes on a pending PO", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(MOCK_PO as never);
    vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({ ...MOCK_PO, notes: "Urgent" } as never);

    const req = makeRequest("PUT", "/api/v1/purchase-orders/po-1", { notes: "Urgent" });
    const res = await PUT(req, { params: Promise.resolve({ id: "po-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order.notes).toBe("Urgent");
  });

  it("returns 409 when trying to modify a received PO", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({ ...MOCK_PO, status: "RECEIVED" } as never);

    const req = makeRequest("PUT", "/api/v1/purchase-orders/po-1", { notes: "Change" });
    const res = await PUT(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(409);
  });

  it("cancels a pending PO", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(MOCK_PO as never);
    vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({ ...MOCK_PO, status: "CANCELLED" } as never);

    const req = makeRequest("PUT", "/api/v1/purchase-orders/po-1", { status: "CANCELLED" });
    const res = await PUT(req, { params: Promise.resolve({ id: "po-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order.status).toBe("CANCELLED");
  });
});
