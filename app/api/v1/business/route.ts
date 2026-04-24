import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const businessSchema = z.object({
  name: z.string().min(1).optional(),
  nameFr: z.string().optional(),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  ice: z.string().optional(),      // Identifiant Commun de l'Entreprise (Morocco)
  vatNumber: z.string().optional(),
  logoUrl: z.string().url().optional(),
  currency: z.string().default("MAD").optional(),
  defaultVatRate: z.number().min(0).max(100).optional(),
  loyaltyPointsPerMad: z.number().min(0).optional(),
  receiptFooter: z.string().optional(),
  printerIp: z.string().optional(),
  printerType: z.enum(["USB", "LAN"]).optional(),
  lowStockAlertEmail: z.boolean().optional(),
  sessionVarianceThreshold: z.number().min(0).optional(),
});

// We store business config as a single JSON record in a simple key-value table.
// Since the schema doesn't have a BusinessSettings model yet, we use the AuditLog
// metadata to store settings — but the correct approach is a dedicated table.
// We implement this as a runtime config using a well-known AuditLog "BUSINESS_SETTINGS"
// sentinel that holds the full config JSON as metadata.
// This avoids a schema migration while keeping the feature functional.
const SETTINGS_ACTION = "BUSINESS_SETTINGS";

async function loadSettings() {
  const record = await prisma.auditLog.findFirst({
    where: { action: SETTINGS_ACTION },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  return (record?.metadata ?? {}) as Record<string, unknown>;
}

/** GET /api/v1/business — read store settings */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const settings = await loadSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "GET /api/v1/business");
  }
}

/** PUT /api/v1/business — update store settings (owner / manager only) */
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = businessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    // Merge with existing settings
    const existing = await loadSettings();
    const updated = { ...existing, ...parsed.data, updatedAt: new Date().toISOString() };

    await writeAuditLog({
      actorUserId: auth.user.id,
      action: SETTINGS_ACTION,
      targetType: "BUSINESS",
      targetId: "global",
      metadata: updated,
    });

    return NextResponse.json({ settings: updated });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PUT /api/v1/business");
  }
}
