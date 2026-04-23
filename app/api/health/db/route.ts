import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "reachable" });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
