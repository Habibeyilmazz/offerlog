import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Format: scrypt:<N>:<r>:<p>:<salt>:<hash>, salt and hash base64url. No "$", so it survives .env files and docker compose
// interpolation. N=2^14, r=8, p=5 is one of OWASP's minimum scrypt settings and needs 16 MB, under Node's 32 MB default.
// Hashes made before the cost was stored (scrypt:<salt>:<hash>) used Node's default N=2^14, r=8, p=1 and still verify.
const KEYLEN = 32;
const COST = { N: 16384, r: 8, p: 5 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, COST);
  return `scrypt:${COST.N}:${COST.r}:${COST.p}:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

/** Synchronous on purpose: the login rate limiter relies on no other request running between its check and its count. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.trim().split(":");
  if (parts.length === 3) parts.splice(1, 0, "16384", "8", "1");
  const [scheme, n, r, p, salt, hash] = parts;
  const cost = { N: Number(n), r: Number(r), p: Number(p) };
  if (parts.length !== 6 || scheme !== "scrypt" || !salt || !hash) return false;
  // Bounded so a mistyped hash cannot ask for gigabytes of memory or minutes of CPU on every sign-in.
  if (!/^\d+$/.test(n + r + p) || cost.N > 2 ** 17 || cost.r > 32 || cost.p > 16) return false;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== KEYLEN) return false;
  try {
    return timingSafeEqual(scryptSync(password, Buffer.from(salt, "base64url"), KEYLEN, { ...cost, maxmem: 256 * 1024 * 1024 }), expected);
  } catch {
    return false; // N not a power of two, or zero values
  }
}
