import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";

/** POST /api/v1/hardware/test-print — acknowledge a test print request (actual printing is device-side). */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Test print is triggered from the POS settings UI using WebUSB/network ESC/POS. No server-side print queue is configured.",
  });
}
