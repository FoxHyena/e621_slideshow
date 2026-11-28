import { describe, expect, it } from "vitest";
import { DEFAULT_DATE_FILTER } from "@/lib/query/date";
import { pipsOf, windowWords } from "../TunePicture";

describe("a tag row's dots (DESIGN.md Tune)", () => {
  it("are its weight against the strongest tag's, in fifths, rounded up", () => {
    expect(pipsOf(3.4, 3.4, false)).toBe(5);
    expect(pipsOf(2.72, 3.4, false)).toBe(4); // exactly 4/5
    expect(pipsOf(2.73, 3.4, false)).toBe(5);
    expect(pipsOf(0.01, 3.4, false)).toBe(1);
  });
  it("are five when pinned and none without a weight", () => {
    expect(pipsOf(0.1, 3.4, true)).toBe(5);
    expect(pipsOf(0, 3.4, false)).toBe(0);
    expect(pipsOf(1, 0, false)).toBe(0);
  });
});

describe("the search stop's window follows For You's Date", () => {
  it("is the last 7 days, the week's, when no date is set", () => {
    expect(windowWords(DEFAULT_DATE_FILTER)).toEqual({ span: "the last 7 days", whose: "the week's" });
  });
  it("names other windows", () => {
    const on = { ...DEFAULT_DATE_FILTER, enabled: true };
    expect(windowWords({ ...on, mode: "preset", preset: "today" })).toEqual({ span: "today", whose: "today's" });
    expect(windowWords({ ...on, mode: "within", amount: 30, unit: "days" })).toEqual({ span: "the last 30 days", whose: "their" });
    expect(windowWords({ ...on, mode: "within", amount: 1, unit: "months" })).toEqual({ span: "the last month", whose: "the month's" });
    expect(windowWords({ ...on, mode: "after", date: "2026-01-01" })).toEqual({ span: "posts since 2026-01-01", whose: "their" });
  });
});
