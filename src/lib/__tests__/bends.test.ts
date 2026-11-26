import { describe, expect, it } from "vitest";
import { arcPath, bendsFor, BENDS_COLORS } from "../bends";

const names = Array.from({ length: 400 }, (_, i) => `artist_${i * 7919}`);

describe("Bends marks", () => {
  it("draw the same mark for the same name", () => {
    expect(bendsFor("inkwell fox")).toEqual(bendsFor("inkwell fox"));
  });

  it("use three different colours from the palette, never gold", () => {
    for (const n of names) {
      const b = bendsFor(n);
      expect(new Set(b.colors).size).toBe(3);
      for (const c of b.colors) {
        expect(BENDS_COLORS).toContain(c);
        expect(c.toUpperCase()).not.toBe("#E8C446");
      }
    }
  });

  it("keep angles, sweeps and the dot in their ranges, and vary between names", () => {
    for (const n of names) {
      const b = bendsFor(n);
      expect(b.a[0]).toBeGreaterThanOrEqual(0);
      expect(b.a[0]).toBeLessThan(360);
      expect(b.w[0]).toBeGreaterThanOrEqual(120);
      expect(b.w[0]).toBeLessThan(300);
      expect(b.w[1]).toBeGreaterThanOrEqual(100);
      expect(b.w[1]).toBeLessThan(280);
      expect(b.dot).toBeGreaterThanOrEqual(0.12);
      expect(b.dot).toBeLessThan(0.19);
    }
    expect(new Set(names.map((n) => bendsFor(n).a[0].toFixed(3))).size).toBeGreaterThan(names.length * 0.9);
  });

  it("draws a long arc with the large-arc flag", () => {
    expect(arcPath(0.7, 0, 270)).toContain(" 0 1 1 ");
    expect(arcPath(0.7, 0, 90)).toContain(" 0 0 1 ");
    expect(arcPath(0.7, 0, 90)).toMatch(/^M0\.7 0A/);
  });
});
