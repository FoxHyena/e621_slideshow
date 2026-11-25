import { describe, expect, it } from "vitest";
import { etaMs, formatEta, fraction, stamp } from "../progress";

describe("progress", () => {
  it("keeps a phase's start time across updates, and restarts it on a new phase", () => {
    const a = stamp(null, { phase: "favorites", done: 0, total: 100 }, 1000);
    const b = stamp(a, { phase: "favorites", done: 50, total: 100 }, 3000);
    expect(b).toMatchObject({ startedAt: 1000, at: 3000 });
    expect(stamp(b, { phase: "learn" }, 4000)).toMatchObject({ startedAt: 4000, at: 4000 });
  });

  it("estimates the time left from the phase's rate, counting down between updates", () => {
    const step = { phase: "favorites" as const, done: 50, total: 100, startedAt: 0, at: 10_000 };
    expect(etaMs(step, 10_000)).toBe(10_000); // 50 in 10s, 50 to go
    expect(etaMs(step, 14_000)).toBe(6_000);
    expect(etaMs(step, 30_000)).toBe(0);
    expect(etaMs({ ...step, done: 0 }, 10_000)).toBeNull(); // no rate yet
    expect(etaMs({ phase: "search" }, 0)).toBeNull();
  });

  it("says the estimate plainly, and only as a ceiling when the total is one", () => {
    expect(formatEta(2_000)).toBe("almost done");
    expect(formatEta(7_200)).toBe("about 8s left");
    expect(formatEta(23_000)).toBe("about 25s left");
    expect(formatEta(130_000)).toBe("about 2 min left");
    expect(formatEta(23_000, true)).toBe("up to ~25s left");
    expect(formatEta(2_000, true)).toBeNull();
    expect(formatEta(null)).toBeNull();
  });

  it("measures the fraction only against a known total", () => {
    expect(fraction({ phase: "sample", done: 3, total: 10 })).toBe(0.3);
    expect(fraction({ phase: "sample", done: 3 })).toBeNull();
    expect(fraction(null)).toBeNull();
  });
});
