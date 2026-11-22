import type { Application } from "../db/schema.ts";
import { STAGE_LABELS, type Stage } from "./stages.ts";

type Item = Pick<Application, "id" | "company" | "role" | "stage" | "url" | "nextStep" | "nextStepDue">;

/** Next steps that belong in a calendar: a text and a due date, on an application that is still open. */
export const hasCalendarStep = (a: Item) => Boolean(a.nextStep && a.nextStepDue) && a.stage !== "rejected" && a.stage !== "ghosted";

// RFC 5545 3.3.11: backslash, semicolon, comma and newlines are escaped in TEXT values.
const text = (s: string) => s.replace(/[\\;,]/g, "\\$&").replace(/\r?\n|\r/g, "\\n");

// RFC 5545 3.1: lines longer than 75 octets continue on the next line after a space, never splitting a UTF-8 character.
function fold(line: string): string {
  const enc = new TextEncoder();
  let out = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) {
      out += "\r\n ";
      bytes = 1;
    }
    out += ch;
    bytes += n;
  }
  return out;
}

const basicDate = (ymd: string) => ymd.replaceAll("-", "");

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * An iCalendar file with one all-day event per open next step, with a reminder at 09:00 on the day.
 * UIDs are stable per application, so importing a newer file updates an event in calendars that match on UID.
 */
export function nextStepsIcs(apps: Item[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//offerlog//next steps//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const a of apps.filter(hasCalendarStep)) {
    const due = a.nextStepDue as string;
    const summary = text(`${a.company}: ${a.nextStep}`);
    lines.push(
      "BEGIN:VEVENT",
      `UID:offerlog-application-${a.id}-next-step`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${basicDate(due)}`,
      `DTEND;VALUE=DATE:${basicDate(nextDay(due))}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${text(`${a.role} (${STAGE_LABELS[a.stage as Stage] ?? a.stage})`)}`,
      ...(a.url ? [`URL:${a.url}`] : []),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${summary}`,
      "TRIGGER:PT9H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
