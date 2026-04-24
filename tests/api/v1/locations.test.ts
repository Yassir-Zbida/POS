import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { GET, POST } from "@/app/api/v1/locations/route";
import { GET as GET_ONE, PUT, DELETE as DELETE_ONE } from "@/app/api/v1/locations/[id]/route";
import { makeRequest, mockManagerAuth, mockCashierAuth, MANAGER_USER } from "@/tests/helpers";

const MOCK_LOCATION = {
  id: "loc-1",
  name: "Casablanca Branch",
  address: "123 Rue Mohammed V",
  phone: "+212600000001",
  city: "Casablanca",
  isActive: true,
  managerId: MANAGER_USER.id,
  manager: { id: MANAGER_USER.id, name: MANAGER_USER.name, email: MANAGER_USER.email },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/v1/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManagerAuth();
  });

  it("returns paginated locations", async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([MOCK_LOCATION] as never);
    vi.mocked(prisma.location.count).mockResolvedValue(1);

    const res = await GET(makeRequest("GET", "/api/v1/locations"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.locations).toHaveLength(1);
    expect(data.locations[0].name).toBe("Casablanca Branch");
    expect(data.meta.total).toBe(1);
  });

  it("returns 403 for cashiers", async () => {
    vi.clearAllMocks();
    mockCashierAuth();

    const res = await GET(makeRequest("GET", "/api/v1/locations"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManagerAuth();
  });

  it("creates a location", async () => {
    vi.mocked(prisma.location.create).mockResolvedValue(MOCK_LOCATION as never);

    const res = await POST(
      makeRequest("POST", "/api/v1/locations", {
        name: "Casablanca Branch",
        city: "Casablanca",
        phone: "+212600000001",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.location.name).toBe("Casablanca Branch");
  });

  it("returns 422 when name is missing", async () => {
    const res = await POST(
      makeRequest("POST", "/api/v1/locations", { city: "Rabat" }),
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/locations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManagerAuth();
  });

  it("returns a single location", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue({
      ...MOCK_LOCATION,
      users: [],
      _count: { sessions: 2, sales: 15, purchaseOrders: 1 },
    } as never);

    const res = await GET_ONE(makeRequest("GET", "/api/v1/locations/loc-1"), {
      params: Promise.resolve({ id: "loc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.location.id).toBe("loc-1");
    expect(data.location._count.sales).toBe(15);
  });

  it("returns 404 for unknown id", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue(null);

    const res = await GET_ONE(makeRequest("GET", "/api/v1/locations/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/locations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManagerAuth();
  });

  it("updates location fields", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue(MOCK_LOCATION as never);
    vi.mocked(prisma.location.update).mockResolvedValue({
      ...MOCK_LOCATION,
      city: "Rabat",
    } as never);

    const res = await PUT(
      makeRequest("PUT", "/api/v1/locations/loc-1", { city: "Rabat" }),
      { params: Promise.resolve({ id: "loc-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.location.city).toBe("Rabat");
  });

  it("returns 404 if location does not exist", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue(null);

    const res = await PUT(
      makeRequest("PUT", "/api/v1/locations/nope", { name: "X" }),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/locations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only ADMIN can delete — mock as ADMIN role
    vi.mocked(verifyToken).mockResolvedValue({
      sub: MANAGER_USER.id,
      role: "ADMIN",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...MANAGER_USER,
      role: "ADMIN",
    } as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
  });

  it("deactivates a location when no open sessions", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue(MOCK_LOCATION as never);
    vi.mocked(prisma.cashRegisterSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.location.update).mockResolvedValue({
      ...MOCK_LOCATION,
      isActive: false,
    } as never);

    const res = await DELETE_ONE(
      makeRequest("DELETE", "/api/v1/locations/loc-1"),
      { params: Promise.resolve({ id: "loc-1" }) },
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/deactivated/i);
  });

  it("returns 409 when location has an open session", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue(MOCK_LOCATION as never);
    vi.mocked(prisma.cashRegisterSession.findFirst).mockResolvedValue({
      id: "sess-1",
      status: "OPEN",
    } as never);

    const res = await DELETE_ONE(
      makeRequest("DELETE", "/api/v1/locations/loc-1"),
      { params: Promise.resolve({ id: "loc-1" }) },
    );
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown location", async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValue(null);

    const res = await DELETE_ONE(
      makeRequest("DELETE", "/api/v1/locations/nope"),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});
