import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    ownerManagerId: user.ownerManagerId,
  });
}
