import { createHash, randomInt } from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export function generateOtpDigits(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
  return createHash("sha256").update(`${code}:${secret}`).digest("hex");
}

export { OTP_TTL_MS, MAX_OTP_ATTEMPTS };
