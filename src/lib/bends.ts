/**
 * Bends: an artist's mark (DESIGN.md "Avatars"). Two round-capped arcs around a centre dot, the tab
 * bar's own bent-tube shape, hashed from the name for colour, angle and length. The colours come
 * only from the app's palette and never include gold, which stays reserved for New and the main
 * action. The app mark is the hexagon with Play (`AppMark` in `src/components/Avatar.tsx`).
 *
 * Ported from the approved mock (`docs/path-a/mocks/feed-v6.html`, `themedFor`): the same seed
 * draws the same mark there and here, including the draws it skips.
 */
import { hash, rng } from "./avatar";

export const BENDS_COLORS = ["#B4C7D9", "#E9F2FA", "#5B9BE0", "#F3946B", "#FF8A95", "#EE7BEE", "#5EC06A", "#78DCA5"] as const;

export interface BendsSpec {
  /** outer arc, inner arc, dot */
  colors: [string, string, string];
  /** start angles of the outer and inner arcs, degrees */
  a: [number, number];
  /** sweeps of the outer and inner arcs, degrees */
  w: [number, number];
  /** the dot's radius, as a share of the disc's */
  dot: number;
}

const cache = new Map<string, BendsSpec>();

export function bendsFor(seed: string): BendsSpec {
  const hit = cache.get(seed);
  if (hit) return hit;
  const L = BENDS_COLORS.length;
  const rand = rng(hash("t:" + seed));
  rand(); // skipped, as in the mock
  const i0 = Math.floor(rand() * L);
  const i1 = (i0 + 2 + Math.floor(rand() * (L - 3))) % L;
  const rest = BENDS_COLORS.filter((_, i) => i !== i0 && i !== i1);
  const colors: BendsSpec["colors"] = [BENDS_COLORS[i0], BENDS_COLORS[i1], rest[Math.floor(rand() * rest.length)]];
  const x = rng(hash("x:" + seed));
  const xr = (lo: number, hi: number) => lo + x() * (hi - lo);
  for (let i = 0; i < 11; i++) x();
  const spec: BendsSpec = { colors, a: [xr(0, 360), xr(0, 360)], w: [xr(120, 300), xr(100, 280)], dot: xr(0.12, 0.19) };
  if (cache.size > 2000) cache.clear();
  cache.set(seed, spec);
  return spec;
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

/** An arc of radius r from `start` through `sweep` degrees, in the -1..1 viewBox. */
export function arcPath(r: number, start: number, sweep: number): string {
  const a0 = (start * Math.PI) / 180;
  const a1 = ((start + sweep) * Math.PI) / 180;
  return `M${r4(r * Math.cos(a0))} ${r4(r * Math.sin(a0))}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${r4(r * Math.cos(a1))} ${r4(r * Math.sin(a1))}`;
}

/** Outer and inner arc radius and stroke, as shares of the disc radius. */
export const BENDS_GEOMETRY = { outer: 0.7, inner: 0.41, stroke: 0.21 } as const;
