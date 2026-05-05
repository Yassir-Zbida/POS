import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getCashierPermissions, parseCashierPermissionsJson } from "@/lib/cashier-permissions-model";

const patchSchema = z
  .object({
    posCheckout: z.boolean().optional(),
    salesView: z.boolean().optional(),
    saleLookupById: z.boolean().optional(),
    catalogView: z.boolean().optional(),
    productAdd: z.boolean().optional(),
    productEdit: z.boolean().optional(),
    productDelete: z.boolean().optional(),
    categoriesManage: z.boolean().optional(),
    customersView: z.boolean().optional(),
    customersEdit: z.boolean().optional(),
    creditCollect: z.boolean().optional(),
    sessionsManage: z.boolean().optional(),
  })
  .strict();

/** PATCH /api/manager/cashiers/[id]/permissions — merge permission flags for a cashier */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.MANAGER])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const cashier = await prisma.user.findFirst({
    where: { id, role: ROLES.CASHIER, ownerManagerId: auth.user.id },
    select: { id: true, cashierPermissions: true },
  });
  if (!cashier) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const partial = parseCashierPermissionsJson(parsed.data);
  const current = getCashierPermissions({ role: ROLES.CASHIER, cashierPermissions: cashier.cashierPermissions });
  const next = { ...current, ...partial };

  await prisma.user.update({
    where: { id },
    data: { cashierPermissions: next },
  });

  await writeAuditLog({
    actorUserId: auth.user.id,
    action: "CASHIER_PERMISSIONS_UPDATED",
    targetType: "USER",
    targetId: id,
    metadata: { keys: Object.keys(partial) },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ cashierPermissions: next });
}
