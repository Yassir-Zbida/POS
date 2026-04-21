import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(openApiDocument);
}
