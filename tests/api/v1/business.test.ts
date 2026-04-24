import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/v1/business/route";
import { makeRequest, mockManagerAuth, mockCashierAuth } from "@/tests/helpers";

const MOCK_SETTINGS = {
  name: "Hssabaty Boutique",
  city: "Casablanca",
  ice: "001234567000000",
  currency: "MAD",
  defaultVatRate: 20,
  loyaltyPointsPerMad: 0.1,
  receiptFooter: "Merci pour votre visite !",
};

describe("GET /api/v1/business", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns business settings", async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({ metadata: MOCK_SETTINGS } as never);

    const req = makeRequest("GET", "/api/v1/business");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings.name).toBe("Hssabaty Boutique");
  });

  it("returns empty settings when none saved yet", async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);

    const req = makeRequest("GET", "/api/v1/business");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings).toEqual({});
  });

  it("cashier can read settings", async () => {
    vi.clearAllMocks();
    mockCashierAuth();
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({ metadata: MOCK_SETTINGS } as never);

    const req = makeRequest("GET", "/api/v1/business");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/v1/business", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("saves business settings and merges with existing", async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({ metadata: MOCK_SETTINGS } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const req = makeRequest("PUT", "/api/v1/business", {
      name: "New Name",
      city: "Rabat",
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.settings.name).toBe("New Name");
    expect(json.settings.ice).toBe("001234567000000"); // preserved from existing
  });

  it("returns 403 for cashier", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const req = makeRequest("PUT", "/api/v1/business", { name: "Hack" });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid email", async () => {
    vi.clearAllMocks();
    mockManagerAuth();
    const req = makeRequest("PUT", "/api/v1/business", { email: "not-an-email" });
    const res = await PUT(req);
    expect(res.status).toBe(422);
  });
});
