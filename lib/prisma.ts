import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** True when this PrismaClient instance includes generated delegates (avoids stale singleton after `prisma generate`). */
function clientHasOtpChallenge(client: PrismaClient) {
  return typeof (client as { otpChallenge?: { deleteMany: unknown } }).otpChallenge?.deleteMany === "function";
}

function getOrCreatePrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && clientHasOtpChallenge(cached)) return cached;
  const fresh = new PrismaClient();
  globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = getOrCreatePrisma();
