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

export function getBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}
