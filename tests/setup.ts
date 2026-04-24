import { vi } from "vitest";

// Mock Prisma globally so tests never need a real database
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), fields: { minStock: "minStock" } },
    productVariant: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    customer: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    creditPayment: { create: vi.fn(), findMany: vi.fn() },
    sale: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    saleItem: { groupBy: vi.fn() },
    inventoryMovement: { findMany: vi.fn(), create: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    cashRegisterSession: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    cashMovement: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    coupon: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    supplier: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    purchaseOrder: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    purchaseOrderItem: { findMany: vi.fn(), update: vi.fn() },
    notification: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    location: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    subscription: { findUnique: vi.fn() },
    refreshToken: { create: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

// Mock audit logger
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth helpers
vi.mock("@/lib/auth", () => ({
  getBearerToken: vi.fn((h: string | null) => (h?.startsWith("Bearer ") ? h.slice(7) : null)),
  verifyToken: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));
