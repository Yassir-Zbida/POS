import { AUTH_ROLES, type AuthRole } from "@/types/auth";

export function dashboardHomeForRole(role: AuthRole) {
  switch (role) {
    case AUTH_ROLES.ADMIN:
      return "/dashboard/admin" as const;
    case AUTH_ROLES.MANAGER:
      return "/dashboard/manager" as const;
    case AUTH_ROLES.CASHIER:
      return "/dashboard/cashier" as const;
  }
}

type RouteRule = {
  prefix: string;
  roles: readonly AuthRole[];
};

export const DASHBOARD_ROUTE_RULES: readonly RouteRule[] = [
  { prefix: "/dashboard/admin", roles: [AUTH_ROLES.ADMIN] },
  { prefix: "/dashboard/manager", roles: [AUTH_ROLES.MANAGER] },
  { prefix: "/dashboard/cashier", roles: [AUTH_ROLES.CASHIER] },

  // Shared pages
  { prefix: "/dashboard/settings", roles: [AUTH_ROLES.ADMIN, AUTH_ROLES.MANAGER, AUTH_ROLES.CASHIER] },

  // Manager pages
  {
    prefix: "/dashboard/reports",
    roles: [AUTH_ROLES.MANAGER],
  },
  {
    prefix: "/dashboard/sales",
    roles: [AUTH_ROLES.MANAGER],
  },
  {
    prefix: "/dashboard/inventory",
    roles: [AUTH_ROLES.MANAGER],
  },
  {
    prefix: "/dashboard/products",
    roles: [AUTH_ROLES.MANAGER],
  },
  {
    prefix: "/dashboard/categories",
    roles: [AUTH_ROLES.MANAGER],
  },
  {
    prefix: "/dashboard/customers",
    roles: [AUTH_ROLES.MANAGER],
  },

  // Cashier pages
  { prefix: "/dashboard/cash-register", roles: [AUTH_ROLES.CASHIER] },
];

export function isAllowedDashboardPath(pathname: string, role: AuthRole) {
  const rule = DASHBOARD_ROUTE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (!rule) return false;
  return rule.roles.includes(role);
}

