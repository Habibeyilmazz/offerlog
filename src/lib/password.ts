import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Format: scrypt:<salt>:<hash>, both base64url. No "$", so it survives .env files and docker compose interpolation.
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("base64url")}:${scryptSync(password, salt, KEYLEN).toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.trim().split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== KEYLEN) return false;
  return timingSafeEqual(scryptSync(password, Buffer.from(salt, "base64url"), KEYLEN), expected);
}
