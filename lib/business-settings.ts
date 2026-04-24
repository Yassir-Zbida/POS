import { prisma } from "@/lib/prisma";

const SETTINGS_ACTION = "BUSINESS_SETTINGS";

/** Latest merged business JSON from audit trail sentinel (see PUT /api/v1/business). */
export async function loadBusinessSettings(): Promise<Record<string, unknown>> {
  const record = await prisma.auditLog.findFirst({
    where: { action: SETTINGS_ACTION },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  return (record?.metadata ?? {}) as Record<string, unknown>;
}

export function getLoyaltyRedeemMadPerPoint(settings: Record<string, unknown>): number {
  const v = settings.loyaltyRedeemMadPerPoint;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return 0.1;
}
