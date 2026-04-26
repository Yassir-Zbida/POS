import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import argon2 from "argon2";
import { randomUUID } from "crypto";

const encoder = new TextEncoder();
const secret = encoder.encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 100;

export type AppTokenPayload = JWTPayload & {
  sub: string;
  role: string;
  status: string;
};

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function signAccessToken(payload: AppTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function signRefreshToken(payload: AppTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as AppTokenPayload;
}

/**
 * Verifies the JWT signature without enforcing expiry.
 * Only used by the lock-screen PIN verify endpoint — the PIN itself is the
 * authentication factor; the token is only needed to identify the user.
 */
export async function verifyTokenIgnoreExpiry(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    // A huge tolerance effectively disables the expiry check while still
    // requiring a valid signature (prevents forged tokens).
    clockTolerance: 999_999_999,
  });
  return payload as AppTokenPayload;
}

export function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}
