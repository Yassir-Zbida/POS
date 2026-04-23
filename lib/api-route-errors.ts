import { NextResponse } from "next/server";

/** True when Prisma cannot reach MySQL (wrong host/port, DB down, Docker hostname on host, etc.). */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error && typeof (error as { name: unknown }).name === "string" ? (error as { name: string }).name : "";
  if (name === "PrismaClientInitializationError") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|P1001|ECONNREFUSED|ENOTFOUND/i.test(message);
}

export function databaseUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Database unavailable. Host: start MySQL first (`docker compose up -d mysql`), then use DATABASE_URL with 127.0.0.1:3307 for `npm run dev`. Docker app: wait until MySQL is healthy; compose sets DATABASE_URL to mysql:3306.",
    },
    { status: 503 },
  );
}

export function internalErrorResponse(error: unknown, logLabel: string): NextResponse {
  console.error(`[api] ${logLabel}`, error);
  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json(
    { error: process.env.NODE_ENV === "development" ? message : "Internal server error" },
    { status: 500 },
  );
}
