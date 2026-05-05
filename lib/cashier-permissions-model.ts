import { NextResponse } from "next/server";

const R_CASHIER = "CASHIER";

/** Keys stored in `User.cashierPermissions` JSON (partial overrides allowed; null JSON = full access). */
export const CASHIER_PERMISSION_KEYS = [
  "posCheckout",
  "salesView",
  "saleLookupById",
  "catalogView",
  "productAdd",
  "productEdit",
  "productDelete",
  "categoriesManage",
  "customersView",
  "customersEdit",
  "creditCollect",
  "sessionsManage",
] as const;

export type CashierPermissionKey = (typeof CASHIER_PERMISSION_KEYS)[number];

export type CashierPermissions = Record<CashierPermissionKey, boolean>;

export const DEFAULT_CASHIER_PERMISSIONS: CashierPermissions = {
  posCheckout: true,
  salesView: true,
  saleLookupById: true,
  catalogView: true,
  productAdd: true,
  productEdit: true,
  productDelete: true,
  categoriesManage: true,
  customersView: true,
  customersEdit: true,
  creditCollect: true,
  sessionsManage: true,
};

export function parseCashierPermissionsJson(raw: unknown): Partial<CashierPermissions> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<CashierPermissions> = {};
  for (const k of CASHIER_PERMISSION_KEYS) {
    if (typeof o[k] === "boolean") (out as Record<string, boolean>)[k] = o[k];
  }
  return out;
}

export function getCashierPermissions(user: {
  role: string;
  cashierPermissions?: unknown;
}): CashierPermissions {
  if (user.role !== R_CASHIER) return { ...DEFAULT_CASHIER_PERMISSIONS };
  if (user.cashierPermissions == null) return { ...DEFAULT_CASHIER_PERMISSIONS };
  const merged: CashierPermissions = {
    ...DEFAULT_CASHIER_PERMISSIONS,
    ...parseCashierPermissionsJson(user.cashierPermissions),
  };

  // Permission hierarchy:
  // Product management or categories implies catalog visibility.
  if (merged.productAdd || merged.productEdit || merged.productDelete || merged.categoriesManage) {
    merged.catalogView = true;
  }
  // Editing customers or collecting credit implies customer visibility.
  if (merged.customersEdit || merged.creditCollect) {
    merged.customersView = true;
  }
  // Looking up receipt by id implies being able to view sales list.
  if (merged.saleLookupById) {
    merged.salesView = true;
  }

  return merged;
}

export function hasCashierPermission(
  user: { role: string; cashierPermissions?: unknown },
  key: CashierPermissionKey,
): boolean {
  return getCashierPermissions(user)[key];
}

export function cashierPermissionDenied() {
  return NextResponse.json({ error: "Forbidden", code: "PERMISSION_DENIED" }, { status: 403 });
}

export function assertManagerAdminOrCashierPermission(
  user: { role: string; cashierPermissions?: unknown },
  key: CashierPermissionKey,
): NextResponse | null {
  if (user.role === "ADMIN" || user.role === "MANAGER") return null;
  if (user.role === R_CASHIER && hasCashierPermission(user, key)) return null;
  return cashierPermissionDenied();
}

export function assertStaffCatalogView(user: { role: string; cashierPermissions?: unknown }): NextResponse | null {
  return assertManagerAdminOrCashierPermission(user, "catalogView");
}

export function assertStaffProductMutate(
  user: { role: string; cashierPermissions?: unknown },
  key: "productAdd" | "productEdit" | "productDelete",
): NextResponse | null {
  return assertManagerAdminOrCashierPermission(user, key);
}

export function permissionsForApiResponse(user: {
  role: string;
  cashierPermissions?: unknown;
}): CashierPermissions | null {
  if (user.role !== R_CASHIER) return null;
  return getCashierPermissions(user);
}
