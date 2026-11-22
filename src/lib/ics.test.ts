import { describe, expect, it } from "vitest";
import { nextStepsIcs } from "./ics.ts";

const app = (over: Partial<Parameters<typeof nextStepsIcs>[0][number]> = {}) => ({
  id: 7,
  company: "Saltmarsh Studio",
  role: "Frontend Developer",
  stage: "screening",
  url: "https://jobs.example.com/42",
  nextStep: "Phone screen",
  nextStepDue: "2026-11-30",
  ...over,
});
const now = new Date(Date.UTC(2026, 10, 22, 8, 5, 9, 123));
// Unfolds continuation lines (RFC 5545 3.1) so assertions can read whole properties.
const unfold = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("nextStepsIcs", () => {
  it("writes one all-day event with a morning reminder per open next step", () => {
    const ics = nextStepsIcs([app()], now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/); // CRLF only
    const lines = unfold(ics);
    expect(lines).toContain("UID:offerlog-application-7-next-step");
    expect(lines).toContain("DTSTAMP:20261122T080509Z");
    expect(lines).toContain("DTSTART;VALUE=DATE:20261130");
    expect(lines).toContain("DTEND;VALUE=DATE:20261201");
    expect(lines).toContain("SUMMARY:Saltmarsh Studio: Phone screen");
    expect(lines).toContain("DESCRIPTION:Frontend Developer (Screening)");
    expect(lines).toContain("URL:https://jobs.example.com/42");
    expect(lines).toContain("TRIGGER:PT9H");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("skips applications without a dated next step and closed ones", () => {
    const ics = nextStepsIcs(
      [
        app({ id: 1, nextStepDue: null }),
        app({ id: 2, nextStep: "" }),
        app({ id: 3, stage: "rejected" }),
        app({ id: 4, stage: "ghosted" }),
        app({ id: 5, stage: "wishlist", url: "" }),
      ],
      now,
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("UID:offerlog-application-5-next-step");
    expect(ics).not.toContain("URL:");
  });

  it("writes a valid empty calendar when nothing is due", () => {
    expect(nextStepsIcs([], now)).toBe(
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//offerlog//next steps//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n",
    );
  });

  it("ends an event on the next day across month and year ends and leap days", () => {
    const end = (d: string) => unfold(nextStepsIcs([app({ nextStepDue: d })], now)).find((l) => l.startsWith("DTEND"));
    expect(end("2026-12-31")).toBe("DTEND;VALUE=DATE:20270101");
    expect(end("2028-02-28")).toBe("DTEND;VALUE=DATE:20280229");
    expect(end("2027-02-28")).toBe("DTEND;VALUE=DATE:20270301");
  });

  it("escapes text so user input cannot add properties or events", () => {
    const lines = unfold(nextStepsIcs([app({ company: "A, B; C\\D", nextStep: "line one\nEND:VEVENT\r\nBEGIN:VEVENT" })], now));
    expect(lines).toContain("SUMMARY:A\\, B\\; C\\\\D: line one\\nEND:VEVENT\\nBEGIN:VEVENT");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("folds long lines at 75 octets without splitting a multi-byte character", () => {
    const step = "Préparer l'entretien technique avec l'équipe produit — 面接の準備 — ".repeat(4);
    const ics = nextStepsIcs([app({ nextStep: step })], now);
    const enc = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).not.toContain("�");
    expect(unfold(ics)).toContain(`SUMMARY:Saltmarsh Studio: ${step}`);
  });
});
