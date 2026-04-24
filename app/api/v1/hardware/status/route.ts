import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { loadBusinessSettings } from "@/lib/business-settings";

/** GET /api/v1/hardware/status — printer config snapshot (ESC/POS bridge is client-side; this is for dashboards). */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await loadBusinessSettings();
  return NextResponse.json({
    printerIp: settings.printerIp ?? null,
    printerType: settings.printerType ?? null,
    receiptFooterConfigured: Boolean(settings.receiptFooter),
    escPosNote: "Receipt bytes are generated in the browser or a local bridge; this API only exposes configuration.",
  });
}
