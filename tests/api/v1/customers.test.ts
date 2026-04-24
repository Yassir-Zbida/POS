import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/customers/route";
import { POST as POST_CREDIT } from "@/app/api/v1/customers/[id]/credit/route";
import { makeRequest, mockManagerAuth, mockCashierAuth } from "@/tests/helpers";

const MOCK_CUSTOMER = {
  id: "cust-1", name: "Ahmed Benali", phone: "+212600000001",
  email: "ahmed@test.com", city: "Casablanca", notes: null, tags: null,
  creditBalance: 0, loyaltyPoints: 50,
  _count: { sales: 5 }, createdAt: new Date(), updatedAt: new Date(),
};

describe("GET /api/v1/customers", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns customer list", async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([MOCK_CUSTOMER] as never);
    vi.mocked(prisma.customer.count).mockResolvedValue(1);

    const req = makeRequest("GET", "/api/v1/customers");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.customers).toHaveLength(1);
  });

  it("searches by phone", async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([MOCK_CUSTOMER] as never);
    vi.mocked(prisma.customer.count).mockResolvedValue(1);

    const req = makeRequest("GET", "/api/v1/customers?search=+212600000001");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });
});

describe("POST /api/v1/customers", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates customer successfully", async () => {
    vi.mocked(prisma.customer.create).mockResolvedValue(MOCK_CUSTOMER as never);

    const req = makeRequest("POST", "/api/v1/customers", {
      name: "Ahmed Benali",
      phone: "+212600000001",
      email: "ahmed@test.com",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.customer.name).toBe("Ahmed Benali");
  });

  it("returns 422 for invalid email", async () => {
    const req = makeRequest("POST", "/api/v1/customers", { name: "Test", email: "not-an-email" });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("cashier can also create customers", async () => {
    vi.clearAllMocks();
    mockCashierAuth();
    vi.mocked(prisma.customer.create).mockResolvedValue(MOCK_CUSTOMER as never);

    const req = makeRequest("POST", "/api/v1/customers", { name: "Ahmed Benali" });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

describe("POST /api/v1/customers/[id]/credit", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("records a credit payment and reduces balance", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      ...MOCK_CUSTOMER, creditBalance: 500,
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (ops: unknown[]) => ops);
    vi.mocked(prisma.creditPayment.create).mockResolvedValue({ id: "cp-1", amount: 200 } as never);
    vi.mocked(prisma.customer.update).mockResolvedValue({ ...MOCK_CUSTOMER, creditBalance: 300 } as never);

    // Simulate transaction resolving
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          creditPayment: { create: vi.fn().mockResolvedValue({ id: "cp-1" }) },
          customer: { update: vi.fn().mockResolvedValue({ creditBalance: 300 }) },
        } as never);
      }
      return fn;
    });

    const req = makeRequest("POST", "/api/v1/customers/cust-1/credit", { amount: 200 });
    const res = await POST_CREDIT(req, { params: Promise.resolve({ id: "cust-1" }) });

    expect(res.status).toBe(201);
  });

  it("returns 404 if customer not found", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    const req = makeRequest("POST", "/api/v1/customers/bad-id/credit", { amount: 100 });
    const res = await POST_CREDIT(req, { params: Promise.resolve({ id: "bad-id" }) });

    expect(res.status).toBe(404);
  });
});
