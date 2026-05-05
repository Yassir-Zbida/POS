import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/rbac";

import { hasCashierPermission } from "./cashier-permissions-model";

export async function getCashierIdsForManager(managerId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { ownerManagerId: managerId, role: ROLES.CASHIER },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Whether a cashier may view a sale by id (own sale, or team sale if `saleLookupById`). */
export async function cashierCanViewSaleById(
  user: { id: string; role: string; ownerManagerId: string | null; cashierPermissions?: unknown },
  saleCashierId: string | null,
): Promise<boolean> {
  if (user.role !== ROLES.CASHIER) return false;
  if (!saleCashierId) return false;
  if (saleCashierId === user.id) return true;
  if (!hasCashierPermission(user, "saleLookupById")) return false;
  if (!user.ownerManagerId) return false;
  const other = await prisma.user.findFirst({
    where: { id: saleCashierId, role: ROLES.CASHIER, ownerManagerId: user.ownerManagerId },
    select: { id: true },
  });
  return Boolean(other);
}

export * from "./cashier-permissions-model";
