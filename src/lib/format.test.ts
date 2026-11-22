import { describe, expect, it } from "vitest";
import { due, matches, money, onDay, place, plural, today } from "./format.ts";

describe("format", () => {
  it("formats salary ranges compactly", () => {
    expect(money(38000, 46000, "EUR")).toBe("€38K–€46K");
    expect(money(null, 90000, "USD")).toBe("$90K");
    expect(money(null, null, "USD")).toBe("");
    expect(money(1500, null, "EUR")).toBe("€1.5K"); // cached formatters stay per currency
  });
  it("filters without caring about case or accents", () => {
    // Lower-casing alone turns "İstanbul" into "i̇stanbul", which "istanbul" does not find.
    expect(matches("İstanbul", "istanbul")).toBe(true);
    expect(matches("Zürich, hybrid", " ZURICH ")).toBe(true);
    expect(matches("Société Générale", "societe")).toBe(true);
    expect(matches("Acme", "acne")).toBe(false);
  });
  it("pluralises counts", () => {
    expect(plural(1, "application")).toBe("1 application");
    expect(plural(0, "question")).toBe("0 questions");
    expect(plural(3, "offer", false)).toBe("offers");
  });
  it("describes the place without repeating remote", () => {
    expect(place("Remote (EU)", "remote")).toBe("Remote (EU)");
    expect(place("Lisbon", "hybrid")).toBe("Lisbon, hybrid");
    expect(place("", "remote")).toBe("remote");
    expect(place("Berlin", "onsite")).toBe("Berlin");
  });
  it("labels due dates", () => {
    expect(due("2026-11-20", "2026-11-22")).toEqual({ label: "2 days overdue", state: "overdue" });
    expect(due("2026-11-22", "2026-11-22").state).toBe("today");
    expect(due("2026-11-23", "2026-11-22").label).toBe("Due tomorrow");
  });
  it("moves a timestamp to another local day, keeping the local time of day", () => {
    const at = new Date(2026, 10, 22, 8, 30).toISOString(); // 08:30 in Auckland is the previous day in UTC
    const moved = new Date(onDay(at, "2026-11-03"));
    expect(today(moved)).toBe("2026-11-03");
    expect([moved.getHours(), moved.getMinutes()]).toEqual([8, 30]);
  });
});
