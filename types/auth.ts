export const AUTH_ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

import type { CashierPermissions } from "@/lib/cashier-permissions-model";

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
  status: string;
  name?: string | null;
  ownerManagerId?: string | null;
  /** True until merchant changes password after admin-created account */
  mustChangePassword?: boolean;
  /** Effective permissions for CASHIER (from DB JSON + defaults). Omitted for other roles. */
  cashierPermissions?: CashierPermissions | null;
};
