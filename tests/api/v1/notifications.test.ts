import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/v1/notifications/route";
import { PATCH } from "@/app/api/v1/notifications/[id]/read/route";
import { PATCH as READ_ALL } from "@/app/api/v1/notifications/read-all/route";
import { makeRequest, mockCashierAuth, mockManagerAuth } from "@/tests/helpers";

const MOCK_NOTIF = {
  id: "notif-1", type: "LOW_STOCK", title: "Low stock",
  message: "Product X stock is 1 (min: 5)", isRead: false,
  refType: "PRODUCT", refId: "prod-1", triggeredAt: new Date(),
};

describe("GET /api/v1/notifications", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("returns all notifications", async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([MOCK_NOTIF] as never);
    vi.mocked(prisma.notification.count).mockResolvedValue(1).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const req = makeRequest("GET", "/api/v1/notifications");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.notifications).toHaveLength(1);
    expect(json.unreadCount).toBeDefined();
  });

  it("filters unread only", async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([MOCK_NOTIF] as never);
    vi.mocked(prisma.notification.count).mockResolvedValue(1);

    const req = makeRequest("GET", "/api/v1/notifications?unreadOnly=true");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.notification.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isRead: false } }),
    );
  });
});

describe("PATCH /api/v1/notifications/[id]/read", () => {
  beforeEach(() => { vi.clearAllMocks(); mockCashierAuth(); });

  it("marks notification as read", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(MOCK_NOTIF as never);
    vi.mocked(prisma.notification.update).mockResolvedValue({ ...MOCK_NOTIF, isRead: true } as never);

    const req = makeRequest("PATCH", "/api/v1/notifications/notif-1/read");
    const res = await PATCH(req, { params: Promise.resolve({ id: "notif-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 404 for unknown notification", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null);

    const req = makeRequest("PATCH", "/api/v1/notifications/bad-id/read");
    const res = await PATCH(req, { params: Promise.resolve({ id: "bad-id" }) });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/notifications/read-all", () => {
  beforeEach(() => { vi.clearAllMocks(); mockManagerAuth(); });

  it("marks all unread notifications as read", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });

    const req = makeRequest("PATCH", "/api/v1/notifications/read-all");
    const res = await READ_ALL(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.marked).toBe(5);
  });
});
