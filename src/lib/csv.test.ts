import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv.ts";

describe("csv", () => {
  it("parses quotes, escaped quotes, commas, newlines and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n"multi\nline",\n')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["multi\nline", ""]]);
  });
  it("skips blank lines and a BOM", () => {
    expect(parseCsv("﻿a\n\n b \n")).toEqual([["a"], [" b "]]);
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
