import os from "os";
import { NextResponse } from "next/server";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!requireRole(auth.user.role, [ROLES.ADMIN])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timestamp = new Date().toISOString();

  // ── Database probe ──────────────────────────────────────────────────────────
  const dbStart = Date.now();
  let dbStatus: "ok" | "error" = "ok";
  let dbMessage: string | undefined;
  let dbLatency = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (e) {
    dbStatus = "error";
    dbLatency = Date.now() - dbStart;
    dbMessage = e instanceof Error ? e.message : "Unknown database error";
  }

  // ── Process memory ──────────────────────────────────────────────────────────
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024);

  // ── Process CPU usage ───────────────────────────────────────────────────────
  const cpuUsage = process.cpuUsage();

  // ── Uptime ──────────────────────────────────────────────────────────────────
  const uptimeSeconds = Math.floor(process.uptime());

  // ── OS / System info ────────────────────────────────────────────────────────
  const cpus = os.cpus();
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();

  const systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model?.trim() ?? "Unknown",
    loadAvg: os.loadavg(), // [1m, 5m, 15m]
    totalMemoryMB: toMB(totalMemBytes),
    freeMemoryMB: toMB(freeMemBytes),
    usedMemoryMB: toMB(totalMemBytes - freeMemBytes),
    osUptime: Math.floor(os.uptime()), // OS uptime in seconds
  };

  // ── Database table counts ───────────────────────────────────────────────────
  let dbTables: Record<string, number> | null = null;
  try {
    const [users, subscriptions, sales, products, locations, auditLogs, customers, suppliers] =
      await Promise.all([
        prisma.user.count(),
        prisma.subscription.count(),
        prisma.sale.count(),
        prisma.product.count(),
        prisma.location.count(),
        prisma.auditLog.count(),
        prisma.customer.count(),
        prisma.supplier.count(),
      ]);
    dbTables = { users, subscriptions, sales, products, locations, auditLogs, customers, suppliers };
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    timestamp,
    environment: process.env.NODE_ENV ?? "unknown",
    nodeVersion: process.version,
    uptimeSeconds,
    pid: process.pid,
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency,
        ...(dbMessage ? { message: dbMessage } : {}),
      },
      api: {
        status: "ok" as const,
        latency: 0,
      },
    },
    memory: {
      rss: toMB(mem.rss),
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      external: toMB(mem.external),
      arrayBuffers: toMB(mem.arrayBuffers),
    },
    cpu: {
      userMs: Math.round(cpuUsage.user / 1000),
      systemMs: Math.round(cpuUsage.system / 1000),
    },
    system: systemInfo,
    dbTables,
  });
}
