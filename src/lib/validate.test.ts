import { describe, expect, it } from "vitest";
import { isIsoDate, parseApplication, parseContact, pastDay } from "./validate.ts";

describe("parseApplication", () => {
  it("applies defaults and normalises", () => {
    const r = parseApplication({ company: " Acme ", role: "Dev", salaryMin: "85k", salaryMax: "90,000", currency: "eur" });
    expect(r).toMatchObject({ ok: true, value: { company: "Acme", stage: "wishlist", salaryMin: 85000, salaryMax: 90000, currency: "EUR", workMode: "onsite", nextStepDue: null } });
  });
  it.each([
    [{ role: "Dev" }, "Company"],
    [{ company: "A", role: "B", stage: "hired" }, "stage"],
    [{ company: "A", role: "B", url: "javascript:alert(1)" }, "http"],
    [{ company: "A", role: "B", salaryMin: "lots" }, "whole number"],
    [{ company: "A", role: "B", salaryMin: "9", salaryMax: "5" }, "above"],
    [{ company: "A", role: "B", currency: "dollars" }, "3-letter"],
    [{ company: "A", role: "B", workMode: "moon" }, "Work mode"],
    [{ company: "A", role: "B", nextStepDue: "2026-02-30" }, "YYYY-MM-DD"],
    [{ company: "A", role: "B", description: "x".repeat(20001) }, "longer than 20000"],
  ])("rejects %o", (raw, msg) => {
    const r = parseApplication(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
  it("validates calendar dates", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
  });
});

describe("parseContact", () => {
  it("accepts a full contact and trims it", () => {
    expect(parseContact({ name: " Dana ", title: "Recruiter", email: "dana@example.com", url: "https://example.com/dana" })).toEqual({
      ok: true,
      value: { name: "Dana", title: "Recruiter", email: "dana@example.com", url: "https://example.com/dana" },
    });
    expect(parseContact({ name: "Dana" })).toMatchObject({ ok: true, value: { email: "", url: "" } });
  });
  it.each([
    [{ name: "" }, "Name is required"],
    [{ name: "Dana", url: "javascript:alert(1)" }, "http"],
    [{ name: "Dana", url: "ftp://example.com" }, "http"],
    [{ name: "Dana", email: "not an email" }, "Email"],
    [{ name: "x".repeat(201) }, "longer than 200"],
  ])("returns an error for %o instead of throwing", (raw, msg) => {
    const r = parseContact(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
});

describe("pastDay", () => {
  it("accepts empty, today and earlier days, and refuses the future and bad dates", () => {
    expect(pastDay({}, "d", "2026-11-22")).toEqual({ ok: true, value: null });
    expect(pastDay({ d: "2026-11-22" }, "d", "2026-11-22")).toEqual({ ok: true, value: "2026-11-22" });
    expect(pastDay({ d: "2026-11-23" }, "d", "2026-11-22")).toMatchObject({ ok: false, error: expect.stringContaining("future") });
    expect(pastDay({ d: "22/11/2026" }, "d", "2026-11-22")).toMatchObject({ ok: false, error: expect.stringContaining("YYYY-MM-DD") });
  });
});
