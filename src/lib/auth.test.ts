import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.ts";
import { clientKey, FailureLimiter } from "./rate-limit.ts";

describe("password", () => {
  it("verifies the right password only", () => {
    const h = hashPassword("correct horse");
    expect(h).toMatch(/^scrypt:[\w-]+:[\w-]+$/);
    expect(verifyPassword("correct horse", h)).toBe(true);
    expect(verifyPassword("wrong horse", h)).toBe(false);
  });
  it("uses a fresh salt each time", () => {
    expect(hashPassword("x")).not.toBe(hashPassword("x"));
  });
  it("rejects malformed hashes instead of throwing", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "plain-text-password")).toBe(false);
    expect(verifyPassword("x", "scrypt:abc:short")).toBe(false);
  });
});

describe("FailureLimiter", () => {
  it("blocks after max failures until the window ends", () => {
    const l = new FailureLimiter(3, 1000);
    for (let i = 0; i < 2; i++) l.fail("ip", 0);
    expect(l.blockedFor("ip", 10)).toBe(0);
    l.fail("ip", 10);
    expect(l.blockedFor("ip", 10)).toBe(990);
    expect(l.blockedFor("other", 10)).toBe(0);
    expect(l.blockedFor("ip", 1000)).toBe(0);
  });
  it("starts a new window after expiry and can be reset", () => {
    const l = new FailureLimiter(1, 100);
    l.fail("k", 0);
    l.fail("k", 200);
    expect(l.blockedFor("k", 250)).toBe(50);
    l.reset("k");
    expect(l.blockedFor("k", 250)).toBe(0);
  });
});

describe("clientKey", () => {
  it("uses the hop the nearest proxy added, not the client-supplied first entry", () => {
    expect(clientKey("6.6.6.6, 203.0.113.7")).toBe("203.0.113.7");
    expect(clientKey("1.1.1.1, 2.2.2.2, 203.0.113.7")).toBe("203.0.113.7");
    expect(clientKey("203.0.113.7")).toBe("203.0.113.7");
  });
  it("falls back to one shared key without the header", () => {
    expect(clientKey(null)).toBe("local");
    expect(clientKey("")).toBe("local");
    expect(clientKey(" , ")).toBe("local");
  });
});
