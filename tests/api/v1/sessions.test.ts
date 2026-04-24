import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/v1/sessions/route";
import { POST as CLOSE } from "@/app/api/v1/sessions/[id]/close/route";
import { POST as ADD_MOVEMENT } from "@/app/api/v1/sessions/[id]/movements/route";
import { makeRequest, mockCashierAuth, mockManagerAuth, CASHIER_USER } from "@/tests/helpers";

const MOCK_SESSION = {
  id: "sess-1",
  cashierId: CASHIER_USER.id,
  cashier: { id: CASHIER_USER.id, name: CASHIER_USER.name },
  location: { id: "loc-1", name: "Casablanca", city: "Casablanca" },
  locationId: "loc-1",
  status: "OPEN",
  floatOpen: 500,
  floatClose: null,
  variance: null,
  notes: null,
  openedAt: new Date(),
  closedAt: null,
  _count: { sales: 0, cashMovements: 0 },
};

describe("POST /api/v1/sessions — open session", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("opens a new session", async () => {
    vi.mocked(prisma.cashRegisterSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.cashRegisterSession.create).mockResolvedValue(MOCK_SESSION as never);

    const req = makeRequest("POST", "/api/v1/sessions", { floatOpen: 500 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.session.floatOpen).toBe(500);
  });

  it("stores locationId when provided", async () => {
    vi.mocked(prisma.cashRegisterSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.cashRegisterSession.create).mockResolvedValue(MOCK_SESSION as never);

    const req = makeRequest("POST", "/api/v1/sessions", { floatOpen: 500, locationId: "loc-1" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.cashRegisterSession.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ locationId: "loc-1" }),
      }),
    );
    expect(json.session.location.id).toBe("loc-1");
  });

  it("returns 409 if cashier already has open session", async () => {
    vi.mocked(prisma.cashRegisterSession.findFirst).mockResolvedValue(MOCK_SESSION as never);

    const req = makeRequest("POST", "/api/v1/sessions", { floatOpen: 500 });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });

  it("returns 422 for negative floatOpen", async () => {
    vi.mocked(prisma.cashRegisterSession.findFirst).mockResolvedValue(null);

    const req = makeRequest("POST", "/api/v1/sessions", { floatOpen: -100 });
    const res = await POST(req);

    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/sessions", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns all sessions for managers", async () => {
    vi.mocked(prisma.cashRegisterSession.findMany).mockResolvedValue([MOCK_SESSION] as never);
    vi.mocked(prisma.cashRegisterSession.count).mockResolvedValue(1);

    const res = await GET(makeRequest("GET", "/api/v1/sessions"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sessions).toHaveLength(1);
    expect(json.meta.total).toBe(1);
  });

  it("filters sessions by locationId", async () => {
    vi.mocked(prisma.cashRegisterSession.findMany).mockResolvedValue([MOCK_SESSION] as never);
    vi.mocked(prisma.cashRegisterSession.count).mockResolvedValue(1);

    const res = await GET(makeRequest("GET", "/api/v1/sessions?locationId=loc-1"));
    await res.json();

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.cashRegisterSession.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationId: "loc-1" }),
      }),
    );
  });

  it("cashier only sees their own sessions", async () => {
    vi.clearAllMocks();
    mockCashierAuth();
    vi.mocked(prisma.cashRegisterSession.findMany).mockResolvedValue([MOCK_SESSION] as never);
    vi.mocked(prisma.cashRegisterSession.count).mockResolvedValue(1);

    const res = await GET(makeRequest("GET", "/api/v1/sessions"));
    await res.json();

    expect(vi.mocked(prisma.cashRegisterSession.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cashierId: CASHIER_USER.id }),
      }),
    );
  });
});

describe("POST /api/v1/sessions/[id]/close", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("closes session and calculates variance", async () => {
    vi.mocked(prisma.cashRegisterSession.findUnique).mockResolvedValue({
      ...MOCK_SESSION,
      sales: [
        { totalAmount: 300, paymentMethod: "CASH" },
        { totalAmount: 200, paymentMethod: "CARD" },
      ],
    } as never);
    vi.mocked(prisma.cashMovement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.cashRegisterSession.update).mockResolvedValue({
      ...MOCK_SESSION,
      status: "CLOSED",
      floatClose: 800,
      variance: 0,
    } as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/v1/sessions/sess-1/close", { floatClose: 800 });
    const res = await CLOSE(req, { params: Promise.resolve({ id: "sess-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    // floatOpen(500) + cashSales(300) = expectedCash(800), floatClose(800) → variance 0
    expect(json.summary.expectedCash).toBe(800);
    expect(json.summary.variance).toBe(0);
  });

  it("returns 409 if already closed", async () => {
    vi.mocked(prisma.cashRegisterSession.findUnique).mockResolvedValue({
      ...MOCK_SESSION, status: "CLOSED",
    } as never);

    const req = makeRequest("POST", "/api/v1/sessions/sess-1/close", { floatClose: 500 });
    const res = await CLOSE(req, { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/v1/sessions/[id]/movements", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("adds a cash-in movement", async () => {
    vi.mocked(prisma.cashRegisterSession.findUnique).mockResolvedValue(MOCK_SESSION as never);
    vi.mocked(prisma.cashMovement.create).mockResolvedValue({
      id: "mov-1", type: "CASH_IN", amount: 100,
    } as never);

    const req = makeRequest("POST", "/api/v1/sessions/sess-1/movements", {
      type: "CASH_IN", amount: 100, reason: "Owner deposit",
    });
    const res = await ADD_MOVEMENT(req, { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(201);
  });

  it("returns 422 for invalid movement type", async () => {
    vi.mocked(prisma.cashRegisterSession.findUnique).mockResolvedValue(MOCK_SESSION as never);

    const req = makeRequest("POST", "/api/v1/sessions/sess-1/movements", {
      type: "INVALID", amount: 100,
    });
    const res = await ADD_MOVEMENT(req, { params: Promise.resolve({ id: "sess-1" }) });

    expect(res.status).toBe(422);
  });
});
