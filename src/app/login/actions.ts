"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/password.ts";
import { clientKey, FailureLimiter } from "@/lib/rate-limit.ts";
import { startSession } from "@/lib/session.ts";

// shortcut: in-memory limits reset on restart and are per process; fine for a single-user, single-instance app.
const perClient = new FailureLimiter(5, 15 * 60_000);
const everyone = new FailureLimiter(30, 15 * 60_000);

export async function login(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const stored = process.env.OFFERLOG_PASSWORD_HASH;
  if (!stored) return { error: "Login is not configured. Set OFFERLOG_PASSWORD_HASH (see README) and restart." };

  const client = clientKey((await headers()).get("x-forwarded-for"));
  const wait = Math.max(perClient.blockedFor(client), everyone.blockedFor("*"));
  if (wait > 0) return { error: `Too many failed attempts. Try again in ${Math.ceil(wait / 60_000)} minutes.` };

  const password = String(form.get("password") ?? "");
  if (!password || password.length > 1024 || !verifyPassword(password, stored)) {
    perClient.fail(client);
    everyone.fail("*");
    return { error: "Wrong password." };
  }
  perClient.reset(client);
  await startSession();
  redirect("/");
}
