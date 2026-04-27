import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/api-route-errors";
import { getBearerToken, verifyToken } from "@/lib/auth";
import { z } from "zod/v4";

const SYSTEM_ACTOR_ID = process.env.SYSTEM_ACTOR_USER_ID ?? "";

const bodySchema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(8000).optional(),
  url: z.string().max(1000).optional(),
  componentStack: z.string().max(8000).optional(),
  level: z.enum(["error", "warning", "info"]).default("error"),
  context: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { message, stack, url, componentStack, level, context } = parsed.data;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    // Try to identify the actor from the Authorization header (optional)
    let actorUserId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = getBearerToken(authHeader);
      if (token) {
        try {
          const payload = await verifyToken(token);
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, status: true },
          });
          if (user?.status === "ACTIVE") actorUserId = user.id;
        } catch {
          // ignore — unauthenticated error reports are fine
        }
      }
    }

    // Fall back to a system actor when there's no authenticated user
    if (!actorUserId) {
      if (!SYSTEM_ACTOR_ID) {
        // If no system actor is configured, skip persisting but ack the request
        return NextResponse.json({ ok: true });
      }
      actorUserId = SYSTEM_ACTOR_ID;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: level === "error" ? "CLIENT_ERROR" : level === "warning" ? "CLIENT_WARNING" : "CLIENT_INFO",
        targetType: "CLIENT",
        targetId: url ?? "unknown",
        metadata: {
          message,
          stack: stack ?? null,
          componentStack: componentStack ?? null,
          url: url ?? null,
          context: context ?? null,
        } as Prisma.InputJsonValue,
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    // Silently fail — we never want error tracking to break the user experience
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
