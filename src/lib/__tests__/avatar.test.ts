import { describe, expect, it } from "vitest";
import { AVATAR_DEFAULTS, avatarFor, E621_COLORS, type AvatarShape } from "../avatar";

const SEEDS = ["pawprint_studio", "tailwag_art", "fluffbutt_doodles", "post:1234", "a", "", "黒猫"];
const many = Array.from({ length: 300 }, (_, i) => `artist_${i}`);

/** Whether every shape in `moved` lands on a matching shape in `shapes` (same kind, size and colour). */
function sameSet(moved: AvatarShape[], shapes: AvatarShape[]): boolean {
  return moved.every((m) =>
    shapes.some((s) => s.kind === m.kind && s.r === m.r && s.color === m.color && Math.hypot(s.x - m.x, s.y - m.y) < 1e-3),
  );
}

describe("avatarFor", () => {
  it("draws the same icon for the same seed, and different ones for different seeds", () => {
    for (const s of SEEDS) expect(avatarFor(s)).toEqual(avatarFor(s));
    const distinct = new Set(many.map((s) => JSON.stringify(avatarFor(s))));
    expect(distinct.size).toBe(many.length);
  });

  it("keeps every shape inside the circle", () => {
    for (const s of [...SEEDS, ...many]) {
      for (const sh of avatarFor(s).shapes) {
        expect(Math.hypot(sh.x, sh.y) + sh.r + (sh.width ?? 0) / 2).toBeLessThanOrEqual(1.02);
        expect(sh.r).toBeGreaterThan(0);
        expect(sh.color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("is symmetric under its rotation, and across the vertical axis when mirrored", () => {
    for (const s of many.slice(0, 60)) {
      const spec = avatarFor(s);
      const a = (2 * Math.PI) / spec.symmetry;
      const rotated = spec.shapes.map((sh) => ({
        ...sh,
        x: sh.x * Math.cos(a) - sh.y * Math.sin(a),
        y: sh.x * Math.sin(a) + sh.y * Math.cos(a),
      }));
      expect(sameSet(rotated, spec.shapes)).toBe(true);
      if (spec.mirror) expect(sameSet(spec.shapes.map((sh) => ({ ...sh, x: -sh.x })), spec.shapes)).toBe(true);
    }
  });

  it("varies the symmetry and mirroring across seeds", () => {
    const specs = many.map((s) => avatarFor(s));
    expect(new Set(specs.map((s) => s.symmetry)).size).toBeGreaterThanOrEqual(5);
    const mirrored = specs.filter((s) => s.mirror).length;
    expect(mirrored).toBeGreaterThan(many.length * 0.4);
    expect(mirrored).toBeLessThan(many.length * 0.9);
  });

  it("follows its settings", () => {
    const params = { ...AVATAR_DEFAULTS, symmetryWeights: { 5: 1 }, mirrorChance: 0, layers: [3, 3] as [number, number], circleChance: 0, centerChance: 0 };
    for (const s of many.slice(0, 40)) {
      const spec = avatarFor(s, params);
      expect(spec.symmetry).toBe(5);
      expect(spec.mirror).toBe(false);
      // 3 rings of 5 repeats, each with one or two marks
      expect(spec.shapes.length).toBeGreaterThanOrEqual(15);
      expect(spec.shapes.length).toBeLessThanOrEqual(30);
    }
  });

  it("keeps to e621's colours: fully pulled marks are e621 colours, the background is its navy", () => {
    const allowed = new Set(Object.values(E621_COLORS));
    for (const s of many.slice(0, 60)) {
      const spec = avatarFor(s, { ...AVATAR_DEFAULTS, themePull: 1 });
      for (const sh of spec.shapes) expect(allowed.has(sh.color as (typeof E621_COLORS)[keyof typeof E621_COLORS])).toBe(true);
      expect(spec.background).toBe("#020f23");
    }
    const gold = avatarFor("pawprint_studio", { ...AVATAR_DEFAULTS, themePull: 1, themeColors: ["artist"] });
    expect(new Set(gold.shapes.map((s) => s.color))).toEqual(new Set(["#f2ac08"]));
    expect(avatarFor("x", { ...AVATAR_DEFAULTS, background: 1 }).background).toBe("#1f3c67");
  });
});
