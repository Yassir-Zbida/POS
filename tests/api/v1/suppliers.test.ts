import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/suppliers/route";
import { POST as RECEIVE } from "@/app/api/v1/purchase-orders/[id]/receive/route";
import { GET as GET_ORDERS, POST as CREATE_ORDER } from "@/app/api/v1/purchase-orders/route";
import { makeRequest, mockManagerAuth, mockCashierAuth } from "@/tests/helpers";

const MOCK_SUPPLIER = {
  id: "sup-1", name: "Supplier Maroc", phone: "+212600000002",
  email: "sup@test.com", address: "Casablanca", notes: null,
  _count: { purchaseOrders: 2 }, createdAt: new Date(), updatedAt: new Date(),
};

const MOCK_PO = {
  id: "po-1", supplierId: "sup-1",
  supplier: { id: "sup-1", name: "Supplier Maroc" },
  status: "PENDING", totalCost: 1200, notes: null,
  receivedAt: null, createdById: "manager-1",
  items: [
    { id: "poi-1", orderId: "po-1", productId: "prod-1", variantId: null,
      qtyOrdered: 10, qtyReceived: 0, unitCost: 120,
      product: { id: "prod-1", nameFr: "Parfum Test", sku: "SKU-001" } },
  ],
  createdAt: new Date(), updatedAt: new Date(),
};

describe("GET /api/v1/suppliers", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns supplier list", async () => {
    vi.mocked(prisma.supplier.findMany).mockResolvedValue([MOCK_SUPPLIER] as never);

    const req = makeRequest("GET", "/api/v1/suppliers");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.suppliers).toHaveLength(1);
  });
});

describe("POST /api/v1/suppliers", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates a supplier", async () => {
    vi.mocked(prisma.supplier.create).mockResolvedValue(MOCK_SUPPLIER as never);

    const req = makeRequest("POST", "/api/v1/suppliers", { name: "Supplier Maroc", email: "sup@test.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.supplier.name).toBe("Supplier Maroc");
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();
    const req = makeRequest("POST", "/api/v1/suppliers", { name: "Test" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/purchase-orders", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates a purchase order with correct total cost", async () => {
    vi.mocked(prisma.purchaseOrder.create).mockResolvedValue(MOCK_PO as never);

    const req = makeRequest("POST", "/api/v1/purchase-orders", {
      supplierId: "sup-1",
      items: [{ productId: "prod-1", qtyOrdered: 10, unitCost: 120 }],
    });
    const res = await CREATE_ORDER(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.purchaseOrder.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalCost: 1200 }) }),
    );
  });
});

describe("POST /api/v1/purchase-orders/[id]/receive", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("receives items and updates stock", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(MOCK_PO as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          purchaseOrderItem: { update: vi.fn(), findMany: vi.fn().mockResolvedValue([{ ...MOCK_PO.items[0], qtyReceived: 10 }]) },
          product: { update: vi.fn() },
          inventoryMovement: { create: vi.fn() },
          purchaseOrder: { update: vi.fn() },
        } as never);
      }
      return fn;
    });
    vi.mocked(prisma.purchaseOrder.findUnique)
      .mockResolvedValueOnce(MOCK_PO as never)
      .mockResolvedValueOnce({ ...MOCK_PO, status: "RECEIVED" } as never);

    const req = makeRequest("POST", "/api/v1/purchase-orders/po-1/receive", {
      items: [{ itemId: "poi-1", qtyReceived: 10 }],
    });
    const res = await RECEIVE(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(200);
  });

  it("returns 409 when already received", async () => {
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
      ...MOCK_PO, status: "RECEIVED",
    } as never);

    const req = makeRequest("POST", "/api/v1/purchase-orders/po-1/receive", {
      items: [{ itemId: "poi-1", qtyReceived: 5 }],
    });
    const res = await RECEIVE(req, { params: Promise.resolve({ id: "po-1" }) });

    expect(res.status).toBe(409);
  });
});
