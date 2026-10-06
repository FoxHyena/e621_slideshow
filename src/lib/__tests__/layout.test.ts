import { describe, expect, it } from "vitest";
import {
  aspectOf,
  collageLayout,
  DRIFT_ROTATE,
  DRIFT_SCALE,
  DRIFT_SHIFT,
  emptySlots,
  focusPrint,
  FOCUS_TILT_MAX,
  FOCUS_TILT_MIN,
  kenBurns,
  KB_DRIFT,
  KB_SCALE,
  placeInSlots,
  rand,
  sceneDrift,
  STACK_MAX_H,
  STACK_MIN_H,
  STACK_TILT_MAX,
  stackLayout,
} from "../slideshow/layout";
import { makePost } from "./fixtures";

const ids = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);

describe("poses", () => {
  it("are deterministic per id", () => {
    expect(sceneDrift(42)).toEqual(sceneDrift(42));
    expect(stackLayout(42, [0.7, 1.4], 1.6)).toEqual(stackLayout(42, [0.7, 1.4], 1.6));
    expect(kenBurns(42)).toEqual(kenBurns(42));
  });

  it("differ between ids", () => {
    expect(new Set(ids.map((id) => sceneDrift(id).to.rotate)).size).toBeGreaterThan(ids.length * 0.9);
  });

  it("rand stays in [0, 1) and spreads out", () => {
    const xs = ids.map((id) => rand(id, 3));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.filter((x) => x < 0.5).length / xs.length).toBeCloseTo(0.5, 1);
  });

  it("stay inside their bounds", () => {
    for (const id of ids) {
      const d = sceneDrift(id).to;
      expect(d.scale).toBe(DRIFT_SCALE);
      expect(Math.abs(d.rotate)).toBeLessThanOrEqual(DRIFT_ROTATE);
      expect(Math.abs(d.x)).toBeLessThanOrEqual(DRIFT_SHIFT);
      expect(Math.abs(d.y)).toBeLessThanOrEqual(DRIFT_SHIFT);
      const kb = kenBurns(id);
      for (const end of [kb.from, kb.to]) {
        expect(end.scale).toBeGreaterThanOrEqual(1);
        expect(end.scale).toBeLessThanOrEqual(KB_SCALE);
        expect(Math.abs(end.x)).toBeLessThanOrEqual(KB_DRIFT);
        expect(Math.abs(end.y)).toBeLessThanOrEqual(KB_DRIFT);
      }
    }
  });

  it("ken burns never drifts past the zoomed overscan", () => {
    // At scale s the image overhangs by (s-1)/2 of its size on each side.
    expect(KB_DRIFT / 100).toBeLessThanOrEqual((KB_SCALE - 1) / 2);
  });
});

describe("vintage prints", () => {
  const SCREENS = { desktop: 16 / 10, phone: 9 / 19.5 };
  const MIXES = {
    portrait: [0.7, 0.65, 0.75, 0.7, 0.6, 0.8],
    landscape: [1.4, 1.78, 1.33, 1.5, 1.6, 1.25],
    mixed: [0.7, 1.5, 0.6, 1.78, 1, 0.75],
  };

  it("background prints stay inside their bounds", () => {
    for (const id of ids) {
      for (const s of stackLayout(id, MIXES.mixed, SCREENS.desktop)) {
        expect(Math.abs(s.rotate)).toBeLessThanOrEqual(STACK_TILT_MAX);
        expect(s.h).toBeGreaterThanOrEqual(STACK_MIN_H);
        // Narrow posts grow taller to stay wide enough; wide ones never exceed the max.
        expect(s.h).toBeLessThanOrEqual(Math.max(STACK_MAX_H, (0.45 * SCREENS.desktop) / 0.6));
      }
    }
  });

  it("the heap covers the screen", () => {
    for (const [screen, vp] of Object.entries(SCREENS)) {
      for (const [mix, aspects] of Object.entries(MIXES)) {
        let worst = 1;
        for (const id of ids.slice(0, 100)) {
          const slots = stackLayout(id, aspects, vp);
          let hit = 0;
          for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 20; j++) {
              // In screen-height units, so rotation is true to the screen.
              const px = ((i + 0.5) / 20) * vp;
              const py = (j + 0.5) / 20;
              const inside = slots.some((s, k) => {
                const w = aspects[k] * s.h;
                const r = (-s.rotate * Math.PI) / 180;
                const dx = px - s.x * vp;
                const dy = py - s.y;
                const u = dx * Math.cos(r) - dy * Math.sin(r);
                const v = dx * Math.sin(r) + dy * Math.cos(r);
                return Math.abs(u) <= w / 2 && Math.abs(v) <= s.h / 2;
              });
              if (inside) hit++;
            }
          }
          worst = Math.min(worst, hit / 400);
        }
        expect(worst, `${screen} / ${mix}`).toBeGreaterThanOrEqual(0.95);
      }
    }
  });

  it("the focus print fits on screen with a small tilt", () => {
    for (const id of ids) {
      for (const vp of Object.values(SCREENS)) {
        for (const a of [0.5, 1, 2.4]) {
          const f = focusPrint(id, a, vp);
          expect((a * f.h) / vp).toBeLessThanOrEqual(0.8 + 1e-9);
          expect(f.h).toBeLessThanOrEqual(0.68);
          expect(Math.abs(f.rotate)).toBeGreaterThanOrEqual(FOCUS_TILT_MIN);
          expect(Math.abs(f.rotate)).toBeLessThanOrEqual(FOCUS_TILT_MAX);
        }
      }
    }
  });
});

describe("aspectOf", () => {
  it("uses file dimensions, falling back to sample, then 1", () => {
    expect(aspectOf(makePost())).toBeCloseTo(1.25);
    const noFile = makePost();
    noFile.file = { ...noFile.file, width: 0, height: 0 };
    expect(aspectOf(noFile)).toBeCloseTo(850 / 680);
    noFile.sample = { ...noFile.sample, width: 0, height: 0 };
    expect(aspectOf(noFile)).toBe(1);
  });
});

describe("collageLayout", () => {
  const inside = (r: { x: number; y: number; w: number; h: number }) =>
    r.x >= 0 && r.y >= 0 && r.x + r.w <= 1 + 1e-9 && r.y + r.h <= 1 + 1e-9;

  it("puts three portraits in a row on a landscape screen", () => {
    expect(collageLayout([0.7, 0.7, 0.7], 0, 16 / 10).template).toBe("row");
  });

  it("stacks three landscapes in a column on a portrait screen", () => {
    expect(collageLayout([1.6, 1.6, 1.6], 0, 9 / 19).template).toBe("column");
  });

  it("features a landscape current post among portraits on a landscape screen", () => {
    const { template } = collageLayout([0.7, 1.8, 0.7], 1, 16 / 10);
    expect(template).toMatch(/^feature/);
  });

  it("keeps every tile on screen and returns one rect per tile", () => {
    for (const vp of [16 / 10, 9 / 19, 1]) {
      for (const aspects of [[0.7, 0.7, 0.7], [1.8, 0.6, 1], [3, 3, 0.4], [1], [0.5, 2]]) {
        const { rects } = collageLayout(aspects, 0, vp);
        expect(rects).toHaveLength(aspects.length);
        expect(rects.every(inside)).toBe(true);
      }
    }
  });
});

describe("placeInSlots", () => {
  it("fills empty slots first, then replaces the oldest", () => {
    const [a, b, c, d, e] = [1, 2, 3, 4, 5].map((id) => makePost({ id }));
    let s = emptySlots();
    for (const p of [a, b, c]) s = placeInSlots(s, p);
    expect(s.posts.map((p) => p?.id)).toEqual([1, 2, 3]);
    s = placeInSlots(s, d);
    expect(s.posts.map((p) => p?.id)).toEqual([4, 2, 3]);
    s = placeInSlots(s, e);
    expect(s.posts.map((p) => p?.id)).toEqual([4, 5, 3]);
  });

  it("is a no-op for a post already showing", () => {
    const s = placeInSlots(emptySlots(), makePost({ id: 9 }));
    expect(placeInSlots(s, makePost({ id: 9 }))).toBe(s);
  });
});
