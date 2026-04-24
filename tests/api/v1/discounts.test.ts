import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/discounts/coupons/route";
import { POST as VALIDATE } from "@/app/api/v1/discounts/validate/route";
import { makeRequest, mockManagerAuth, mockCashierAuth } from "@/tests/helpers";

const MOCK_COUPON = {
  id: "coup-1", code: "WELCOME10", type: "PERCENT", value: 10,
  scope: "ALL", scopeId: null, maxUses: 100, usedCount: 5,
  validFrom: null, validTo: null, isActive: true,
  createdAt: new Date(), updatedAt: new Date(),
};

describe("GET /api/v1/discounts/coupons", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns coupon list for managers", async () => {
    vi.mocked(prisma.coupon.findMany).mockResolvedValue([MOCK_COUPON] as never);

    const req = makeRequest("GET", "/api/v1/discounts/coupons");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.coupons).toHaveLength(1);
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const req = makeRequest("GET", "/api/v1/discounts/coupons");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/discounts/coupons", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("creates a percent coupon", async () => {
    vi.mocked(prisma.coupon.create).mockResolvedValue(MOCK_COUPON as never);

    const req = makeRequest("POST", "/api/v1/discounts/coupons", {
      code: "WELCOME10", type: "PERCENT", value: 10,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.coupon.code).toBe("WELCOME10");
  });

  it("returns 422 for code too short", async () => {
    const req = makeRequest("POST", "/api/v1/discounts/coupons", {
      code: "AB", type: "PERCENT", value: 10,
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/discounts/validate", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("validates a percent coupon and returns discount amount", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(MOCK_COUPON as never);

    const req = makeRequest("POST", "/api/v1/discounts/validate", {
      code: "WELCOME10", cartTotal: 500,
    });
    const res = await VALIDATE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.valid).toBe(true);
    expect(json.discountAmt).toBe(50); // 10% of 500
  });

  it("returns valid=false for inactive coupon", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);

    const req = makeRequest("POST", "/api/v1/discounts/validate", {
      code: "BADCODE", cartTotal: 200,
    });
    const res = await VALIDATE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.valid).toBe(false);
  });

  it("returns valid=false for exhausted coupon", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      ...MOCK_COUPON, maxUses: 10, usedCount: 10,
    } as never);

    const req = makeRequest("POST", "/api/v1/discounts/validate", {
      code: "WELCOME10", cartTotal: 300,
    });
    const res = await VALIDATE(req);
    const json = await res.json();

    expect(json.valid).toBe(false);
  });

  it("caps fixed coupon at cart total", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      ...MOCK_COUPON, type: "FIXED", value: 999,
    } as never);

    const req = makeRequest("POST", "/api/v1/discounts/validate", {
      code: "WELCOME10", cartTotal: 100,
    });
    const res = await VALIDATE(req);
    const json = await res.json();

    expect(json.discountAmt).toBe(100); // capped at cart total
  });
});
