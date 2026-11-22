/** UTF-8 (a BOM is dropped), else Windows-1252, which Excel's plain "CSV (Comma delimited)" writes. */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Minimal RFC 4180 CSV: quoted fields, escaped quotes, CRLF or LF line endings, comma or semicolon separated. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  // Spreadsheets set to a European locale save with semicolons; the header line (quoted parts aside) decides.
  const header = (src.match(/[^\r\n]*\S[^\r\n]*/)?.[0] ?? "").replace(/"[^"]*"/g, "");
  const sep = header.includes(";") && !header.includes(",") ? ";" : ",";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Unterminated quoted field");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function escapeField(v: string): string {
  // Leading = + - @ would run as a formula when the file is opened in a spreadsheet. Text that
  // already starts with apostrophes before one gets the guard too, so the import can strip exactly one.
  const safe = /^'*[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return [header, ...rows].map((r) => r.map((v) => escapeField(v == null ? "" : String(v))).join(",")).join("\r\n") + "\r\n";
}
