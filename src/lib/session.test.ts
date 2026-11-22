import { beforeEach, describe, expect, it, vi } from "vitest";

// A cookie jar and request headers standing in for next/headers.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
  headers: async () => new Headers(),
}));
vi.stubEnv("OFFERLOG_DB", ":memory:");

const { endSession, isSignedIn, startSession } = await import("./session.ts");

describe("sessions", () => {
  beforeEach(() => {
    jar.clear();
    vi.stubEnv("OFFERLOG_PASSWORD_HASH", "scrypt:first:hash");
  });

  it("signs in, and signs out on endSession", async () => {
    expect(await isSignedIn()).toBe(false);
    await startSession();
    expect(await isSignedIn()).toBe(true);
    const token = jar.get("offerlog_session")!;
    await endSession();
    expect(await isSignedIn()).toBe(false);
    jar.set("offerlog_session", token); // a copied cookie is dead too
    expect(await isSignedIn()).toBe(false);
  });

  it("rejects unknown tokens", async () => {
    jar.set("offerlog_session", "made-up");
    expect(await isSignedIn()).toBe(false);
  });

  it("ends every session when the password hash changes or is removed", async () => {
    await startSession();
    vi.stubEnv("OFFERLOG_PASSWORD_HASH", "scrypt:second:hash");
    expect(await isSignedIn()).toBe(false);
    vi.stubEnv("OFFERLOG_PASSWORD_HASH", "");
    expect(await isSignedIn()).toBe(false);
    vi.stubEnv("OFFERLOG_PASSWORD_HASH", "scrypt:first:hash");
    expect(await isSignedIn()).toBe(true);
  });
});
