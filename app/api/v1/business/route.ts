import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { loadBusinessSettings } from "@/lib/business-settings";
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
  /** MAD discount per loyalty point redeemed at checkout (default 0.1 in sales route). */
  loyaltyRedeemMadPerPoint: z.number().min(0).max(1000).optional(),
  receiptFooter: z.string().optional(),
  printerIp: z.string().optional(),
  printerType: z.enum(["USB", "LAN"]).optional(),
  lowStockAlertEmail: z.boolean().optional(),
  sessionVarianceThreshold: z.number().min(0).optional(),
});

const SETTINGS_ACTION = "BUSINESS_SETTINGS";

/** GET /api/v1/business — read store settings */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const settings = await loadBusinessSettings();
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
    const existing = await loadBusinessSettings();
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
