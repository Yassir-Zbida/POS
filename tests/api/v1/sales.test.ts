import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/sales/route";
import { POST as REFUND } from "@/app/api/v1/sales/[id]/refund/route";
import { GET as GET_SALES_REPORT } from "@/app/api/v1/reports/sales/route";
import { makeRequest, mockCashierAuth, mockManagerAuth, CASHIER_USER } from "@/tests/helpers";

const MOCK_PRODUCT = {
  id: "prod-1", nameFr: "Parfum Test", sku: "SKU-001", stock: 10, minStock: 2,
};

const MOCK_SALE = {
  id: "sale-1",
  cashierId: CASHIER_USER.id,
  cashier: { id: CASHIER_USER.id, name: "Test Cashier" },
  customerId: null, customer: null, couponId: null, coupon: null,
  sessionId: null,
  subtotal: 250, discountAmt: 0, vatAmt: 50, totalAmount: 300,
  paymentMethod: "CASH", amountTendered: 300, changeGiven: 0,
  notes: null, status: "COMPLETED",
  items: [{ id: "item-1", productId: "prod-1", quantity: 1, unitPrice: 250, discountAmt: 0, totalPrice: 250, product: { id: "prod-1", nameFr: "Parfum Test", sku: "SKU-001" } }],
  createdAt: new Date(), updatedAt: new Date(),
};

describe("POST /api/v1/sales — checkout", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("creates a sale and deducts stock", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([MOCK_PRODUCT] as never);
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ ...MOCK_PRODUCT, stock: 9, minStock: 2, nameFr: "Parfum Test" } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          sale: { create: vi.fn().mockResolvedValue(MOCK_SALE) },
          product: { update: vi.fn() },
          inventoryMovement: { create: vi.fn() },
          coupon: { update: vi.fn() },
          customer: { update: vi.fn() },
        } as never);
      }
      return fn;
    });
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/v1/sales", {
      items: [{ productId: "prod-1", quantity: 1, unitPrice: 250 }],
      paymentMethod: "CASH",
      amountTendered: 300,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.summary.totalAmount).toBeGreaterThan(0);
  });

  it("returns 404 if product does not exist", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const req = makeRequest("POST", "/api/v1/sales", {
      items: [{ productId: "nonexistent", quantity: 1, unitPrice: 100 }],
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("returns 409 if insufficient stock", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ ...MOCK_PRODUCT, stock: 0 }] as never);

    const req = makeRequest("POST", "/api/v1/sales", {
      items: [{ productId: "prod-1", quantity: 5, unitPrice: 250 }],
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });

  it("returns 422 for empty items array", async () => {
    const req = makeRequest("POST", "/api/v1/sales", { items: [] });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/sales", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("returns sales list scoped to cashier", async () => {
    vi.mocked(prisma.sale.findMany).mockResolvedValue([MOCK_SALE] as never);
    vi.mocked(prisma.sale.count).mockResolvedValue(1);

    const req = makeRequest("GET", "/api/v1/sales");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sales).toHaveLength(1);
    expect(vi.mocked(prisma.sale.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ cashierId: CASHIER_USER.id }) }),
    );
  });

  it("filters by locationId when provided", async () => {
    vi.clearAllMocks();
    mockManagerAuth();
    vi.mocked(prisma.sale.findMany).mockResolvedValue([MOCK_SALE] as never);
    vi.mocked(prisma.sale.count).mockResolvedValue(1);

    const res = await GET(makeRequest("GET", "/api/v1/sales?locationId=loc-1"));
    await res.json();

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.sale.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationId: "loc-1" }),
      }),
    );
  });

  it("stores locationId on the sale when checkout includes it", async () => {
    vi.clearAllMocks();
    mockCashierAuth();
    vi.mocked(prisma.product.findMany).mockResolvedValue([MOCK_PRODUCT] as never);
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ ...MOCK_PRODUCT, stock: 9, nameFr: "Parfum Test" } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          sale: { create: vi.fn().mockResolvedValue({ ...MOCK_SALE, locationId: "loc-1" }) },
          product: { update: vi.fn() },
          inventoryMovement: { create: vi.fn() },
          coupon: { update: vi.fn() },
          customer: { update: vi.fn() },
        } as never);
      }
      return fn;
    });
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const res = await POST(
      makeRequest("POST", "/api/v1/sales", {
        items: [{ productId: "prod-1", quantity: 1, unitPrice: 250 }],
        locationId: "loc-1",
        paymentMethod: "CASH",
      }),
    );

    expect(res.status).toBe(201);
    // Verify locationId was passed through to the transaction
    const txFn = vi.mocked(prisma.$transaction).mock.calls[0][0] as Function;
    const mockTx = {
      sale: { create: vi.fn().mockResolvedValue({ ...MOCK_SALE, locationId: "loc-1" }) },
      product: { update: vi.fn() },
      inventoryMovement: { create: vi.fn() },
      coupon: { update: vi.fn() },
      customer: { update: vi.fn() },
    };
    await txFn(mockTx);
    expect(mockTx.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locationId: "loc-1" }) }),
    );
  });
});

describe("GET /api/v1/reports/sales", () => {
  const EMPTY_AGGREGATE = {
    _sum: { totalAmount: 0, discountAmt: 0, vatAmt: 0 },
    _count: 0,
    _avg: { totalAmount: 0 },
  };

  // Helper that wires up a full set of empty mocks for a manager context
  function setupReportMocks() {
    vi.resetAllMocks(); // resetAllMocks clears the mockResolvedValueOnce queue; clearAllMocks does not
    mockManagerAuth();
    vi.mocked(prisma.sale.aggregate).mockResolvedValue(EMPTY_AGGREGATE as never);
    vi.mocked(prisma.sale.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.saleItem.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.product.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValue([] as never);
  }

  it("returns sales report with locationBreakdown", async () => {
    setupReportMocks();

    // Override groupBy to return location data on the third call
    vi.mocked(prisma.sale.groupBy)
      .mockResolvedValueOnce([] as never)   // paymentBreakdown
      .mockResolvedValueOnce([] as never)   // cashierBreakdown
      .mockResolvedValueOnce([              // locationBreakdown
        { locationId: "loc-1", _sum: { totalAmount: 5000 }, _count: 20 },
      ] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValue([
      { id: "loc-1", name: "Casablanca", city: "Casablanca" },
    ] as never);

    const res = await GET_SALES_REPORT(makeRequest("GET", "/api/v1/reports/sales"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.locationBreakdown).toHaveLength(1);
    expect(json.locationBreakdown[0].location.name).toBe("Casablanca");
    expect(json.locationBreakdown[0].totalTransactions).toBe(20);
  });

  it("filters the report by locationId", async () => {
    setupReportMocks();

    const res = await GET_SALES_REPORT(
      makeRequest("GET", "/api/v1/reports/sales?locationId=loc-1"),
    );
    await res.json();

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.sale.aggregate)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationId: "loc-1" }),
      }),
    );
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const res = await GET_SALES_REPORT(makeRequest("GET", "/api/v1/reports/sales"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/sales/[id]/refund", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("processes a full refund", async () => {
    vi.mocked(prisma.sale.findUnique).mockResolvedValue(MOCK_SALE as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          product: { update: vi.fn() },
          inventoryMovement: { create: vi.fn() },
          sale: { update: vi.fn() },
        } as never);
      }
      return fn;
    });

    const req = makeRequest("POST", "/api/v1/sales/sale-1/refund", { reason: "Customer request" });
    const res = await REFUND(req, { params: Promise.resolve({ id: "sale-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isFullRefund).toBe(true);
  });

  it("returns 403 for cashier role", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const req = makeRequest("POST", "/api/v1/sales/sale-1/refund", { reason: "test" });
    const res = await REFUND(req, { params: Promise.resolve({ id: "sale-1" }) });

    expect(res.status).toBe(403);
  });

  it("returns 409 when already refunded", async () => {
    vi.mocked(prisma.sale.findUnique).mockResolvedValue({ ...MOCK_SALE, status: "REFUNDED" } as never);

    const req = makeRequest("POST", "/api/v1/sales/sale-1/refund", { reason: "test" });
    const res = await REFUND(req, { params: Promise.resolve({ id: "sale-1" }) });

    expect(res.status).toBe(409);
  });
});
