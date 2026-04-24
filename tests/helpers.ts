import { vi } from "vitest";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const MANAGER_USER = {
  id: "manager-1",
  email: "manager@test.com",
  name: "Test Manager",
  role: "MANAGER",
  status: "ACTIVE",
  ownerManagerId: null,
};

export const CASHIER_USER = {
  id: "cashier-1",
  email: "cashier@test.com",
  name: "Test Cashier",
  role: "CASHIER",
  status: "ACTIVE",
  ownerManagerId: "manager-1",
};

/** Makes requireAuth return a MANAGER user */
export function mockManagerAuth() {
  vi.mocked(verifyToken).mockResolvedValue({
    sub: MANAGER_USER.id,
    role: MANAGER_USER.role,
    status: MANAGER_USER.status,
  } as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(MANAGER_USER as never);
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
}

/** Makes requireAuth return a CASHIER user */
export function mockCashierAuth() {
  vi.mocked(verifyToken).mockResolvedValue({
    sub: CASHIER_USER.id,
    role: CASHIER_USER.role,
    status: CASHIER_USER.status,
  } as never);
  vi.mocked(prisma.user.findUnique)
    .mockResolvedValueOnce(CASHIER_USER as never)   // cashier
    .mockResolvedValueOnce(MANAGER_USER as never);   // owner manager
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
}

/** Build a minimal Next.js Request */
export function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  token = "valid-token",
): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
