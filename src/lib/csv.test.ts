import { describe, expect, it } from "vitest";
import { decodeText, parseCsv, toCsv } from "./csv.ts";

describe("csv", () => {
  it("parses quotes, escaped quotes, commas, newlines and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n"multi\nline",\n')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["multi\nline", ""]]);
  });
  it("skips blank lines and a BOM", () => {
    expect(parseCsv("﻿a\n\n b \n")).toEqual([["a"], [" b "]]);
  });
  it("detects a semicolon separator past blank lines and quoted commas in the header", () => {
    expect(parseCsv('\ncompany;role;"Notes, misc"\nAcme, Inc.;Dev;x\n')).toEqual([["company", "role", "Notes, misc"], ["Acme, Inc.", "Dev", "x"]]);
    expect(parseCsv('a,"b;c"\n1,2\n')).toEqual([["a", "b;c"], ["1", "2"]]);
  });
  it("reads files saved by Excel as Windows-1252 as well as UTF-8", () => {
    // Excel's plain "CSV (Comma delimited)" is not UTF-8; decoded as UTF-8, "Zürich" became "Z\uFFFDrich".
    expect(decodeText(Uint8Array.from([0x5a, 0xfc, 0x72, 0x69, 0x63, 0x68, 0x2c, 0x80]))).toBe("Zürich,€");
    expect(decodeText(new TextEncoder().encode("\uFEFFZürich,€"))).toBe("Zürich,€");
    // A UTF-8 file with one stray byte stays UTF-8: only that byte is lost, not every accent in the file.
    const mixed = Uint8Array.from([...new TextEncoder().encode("Zürich,"), 0x92, 0x0a]);
    expect(decodeText(mixed)).toBe("Zürich,\uFFFD\n");
  });
  it("rejects an unterminated quote", () => {
    expect(() => parseCsv('"abc')).toThrow();
  });
  it("round-trips and neutralises spreadsheet formulas", () => {
    const text = toCsv(["h1", "h2"], [["=SUM(A1)", 'q"t'], [null, 5]]);
    expect(text).toBe(`h1,h2\r\n'=SUM(A1),"q""t"\r\n,5\r\n`);
    expect(parseCsv(text)[1]).toEqual(["'=SUM(A1)", 'q"t']);
  });
});
