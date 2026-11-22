import { describe, expect, it } from "vitest";
import { isIsoDate, parseApplication } from "./validate.ts";

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
