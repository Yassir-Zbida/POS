import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshSchema } from "@/features/auth/schemas/auth-schemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = refreshSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.refreshToken.updateMany({
    where: { token: parsed.data.refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
