import { NextResponse } from "next/server";

import { credentialsBodySchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = credentialsBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  // Demo stub — replace with real auth (session, DB, etc.)
  return NextResponse.json({
    ok: true,
    message: "Login accepted (demo)",
  });
}
