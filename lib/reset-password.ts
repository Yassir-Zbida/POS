import { createHash, randomBytes } from "crypto";

export const RESET_TOKEN_TTL_MINUTES = 30;

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export function getAppUrl() {
  return process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

