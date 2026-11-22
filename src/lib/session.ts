import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, lt } from "drizzle-orm";
import { db } from "../db/index.ts";
import { sessions } from "../db/schema.ts";

const COOKIE = "offerlog_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Keyed by the password hash, so changing or removing OFFERLOG_PASSWORD_HASH signs out every existing session.
const digest = (token: string) => createHmac("sha256", process.env.OFFERLOG_PASSWORD_HASH ?? "").update(token).digest("hex");

export async function startSession(): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_MS);
  db().delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();
  db().insert(sessions).values({ tokenHash: digest(token), expiresAt: expires.toISOString() }).run();
  const proto = (await headers()).get("x-forwarded-proto") ?? "";
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto.startsWith("https") || process.env.OFFERLOG_SECURE_COOKIE === "true",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().delete(sessions).where(eq(sessions.tokenHash, digest(token))).run();
  jar.delete(COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.OFFERLOG_PASSWORD_HASH) return false;
  const row = db().select().from(sessions).where(eq(sessions.tokenHash, digest(token))).get();
  return !!row && row.expiresAt > new Date().toISOString();
}

/** Call at the top of every page, server action and route handler that touches user data. */
export async function requireUser(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}
