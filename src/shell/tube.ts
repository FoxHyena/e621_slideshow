/**
 * The tab bar's shape and the goo on it, as pure functions (DESIGN.md "Tab bar", "Tab bar goo").
 * Ported from the approved mock (`docs/path-a/mocks/feed-v6.html`: `tbGeo`, `tabAt`, `gooEdge`,
 * `gooTarget`).
 *
 * The bar is a 64 thick tube W wide whose centre line is an arc of radius R, its middle `bend`
 * higher than its ends. Tabs sit on that arc and are turned about its centre, so they stay
 * tangent to it.
 */
import { hash, rng } from "@/lib/avatar";

/** Thickness of the tube. */
export const TUBE = 64;
/** How far the middle rises above the ends. */
export const BEND = 10;
/** The capsule's track sits this far inside the tube. */
const PAD = 5;
/** Four tabs, plus the secret fifth one past the end. */
export const TAB_COUNT = 4;

export interface TubeGeo {
  W: number;
  /** radius of the centre line (0 for a straight bar) */
  R: number;
  /** half the angle the bar spans, radians */
  th: number;
  /** total height: the tube plus the bend */
  H: number;
  /** each tab's length along the centre line */
  tw: number;
  /** the outline */
  d: string;
  /** the track the capsule fills, PAD inside */
  di: string;
  /** the outer top edge, for the light */
  hi: string;
}

const f = (n: number) => +n.toFixed(2);

export function tubeGeo(W: number, s = BEND): TubeGeo {
  const T = TUBE;
  const h = T / 2;
  if (!s) {
    const d = `M${h} 0H${W - h}A${h} ${h} 0 0 1 ${W - h} ${T}H${h}A${h} ${h} 0 0 1 ${h} 0Z`;
    return { W, R: 0, th: 0, H: T, tw: (W - 2 * PAD) / TAB_COUNT, d, di: d, hi: `M${h} 0H${W - h}` };
  }
  const c = W - T;
  const R = (c * c) / 4 / (2 * s) + s / 2;
  const th = Math.asin(c / 2 / R);
  const Cy = R + h;
  const P = (phi: number, r: number) => `${f(W / 2 + r * Math.sin(phi))} ${f(Cy - r * Math.cos(phi))}`;
  const D = (k: number) =>
    `M${P(-th, R + k)}A${f(R + k)} ${f(R + k)} 0 0 1 ${P(th, R + k)}A${k} ${k} 0 0 1 ${P(th, R - k)}A${f(R - k)} ${f(R - k)} 0 0 0 ${P(-th, R - k)}A${k} ${k} 0 0 1 ${P(-th, R + k)}Z`;
  const o = f(R + h);
  return { W, R, th, H: T + s, tw: (2 * R * th + T - 2 * PAD) / TAB_COUNT, d: D(h), di: D(h - PAD), hi: `M${P(-th, R + h)}A${o} ${o} 0 0 1 ${P(th, R + h)}` };
}

/** Where tab k sits: its angle about the bend's centre (radians), or its sideways shift. */
export function tabAngle(g: TubeGeo, k: number): number {
  const a = (k - (TAB_COUNT - 1) / 2) * g.tw;
  return g.R ? a / g.R : a;
}

export function tabTransform(g: TubeGeo, k: number): string {
  const a = tabAngle(g, k);
  return g.R ? `rotate(${a.toFixed(5)}rad)` : `translateX(${a.toFixed(2)}px)`;
}

// ---- goo -----------------------------------------------------------------------------------

export interface GooGeo {
  W: number;
  R: number;
  /** radius of the top edge */
  ro: number;
  th: number;
  /** length of the top edge */
  L: number;
  cx: number;
  cy: number;
}

export function gooGeo(g: TubeGeo): GooGeo {
  const ro = g.R + TUBE / 2;
  return { W: g.W, R: g.R, ro, th: g.th, L: 2 * g.th * ro, cx: g.W / 2, cy: ro };
}

export interface EdgePoint {
  x: number;
  y: number;
  /** outward normal */
  nx: number;
  ny: number;
  /** the way a drip hangs from here */
  dx: number;
  dy: number;
  /** how far it can hang before it leaves the bar */
  room: number;
}

/** A point on the bar's top edge, u px along it; past either end it follows the round cap. */
export function gooEdge(q: GooGeo, u: number): EdgePoint {
  if (u >= 0 && u <= q.L) {
    const a = -q.th + u / q.ro;
    const s = Math.sin(a);
    const c = Math.cos(a);
    return { x: q.cx + q.ro * s, y: q.cy - q.ro * c, nx: s, ny: -c, dx: -s, dy: c, room: 66 };
  }
  const side = u < 0 ? -1 : 1;
  const b = Math.min(1.25, (u < 0 ? -u : u - q.L) / 32);
  const a = side * (q.th + b);
  const s = Math.sin(a);
  const c = Math.cos(a);
  const se = Math.sin(side * q.th);
  const ce = Math.cos(q.th);
  return { x: q.cx + q.R * se + 32 * s, y: q.cy - q.R * ce - 32 * c, nx: s, ny: -c, dx: -se, dy: ce, room: 64 * Math.cos(b) + 2 };
}

export interface Drip {
  id: number;
  /** where along the top edge */
  u: number;
  /** width */
  d: number;
  /** how far it hangs */
  len: number;
}

export interface GooShape {
  /** the bead's ends along the top edge */
  uL: number;
  uR: number;
  /** the bead's thickness */
  t: number;
  /** 0 white … 1 cream */
  tint: number;
  /** where the drops land: 90% along */
  hu: number;
  drips: Drip[];
}

/** What n favourites leave on the bar. A pure function of n, so it survives reloads. */
export function gooTarget(n: number, q: GooGeo): GooShape {
  const hu = q.L * 0.9;
  if (n <= 0) return { uL: hu, uR: hu, t: 0, tint: 0, hu, drips: [] };
  const reachOf = (m: number) => 8 + 7 * Math.pow(m, 0.75);
  const lo = -22;
  const hi = q.L + 34;
  const drips: Drip[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng(hash("goo:" + i));
    if (r() > 0.7) continue;
    const reach = reachOf(i + 1);
    const right = r() < 0.3;
    const u = right ? Math.min(hi - 8, hu + r() * reach * 0.8) : Math.max(lo + 8, hu - Math.pow(r(), 1.3) * reach);
    // fat (10 to 17 px across) and slow (well under a pixel further per favourite, for most)
    const d = 10 + r() * 7;
    const most = 12 + Math.pow(r(), 1.5) * 46;
    const creep = 0.35 + r() * 0.75;
    if (drips.some((o) => Math.abs(o.u - u) < 20)) continue;
    drips.push({ id: i, u, d, len: Math.min(gooEdge(q, u).room, most, 6 + (n - 1 - i) * creep) });
  }
  return { uL: Math.max(lo, hu - reachOf(n)), uR: Math.min(hi, hu + reachOf(n) * 0.8), t: 6 + 4 * (1 - Math.exp(-n / 30)), tint: 1 - Math.exp(-n / 70), hu, drips };
}

/** White, yellowing toward Goo Cream as it grows. */
export function gooColor(tint: number): string {
  const t = Math.min(1, Math.max(0, tint));
  const a = [0xff, 0xff, 0xff];
  const b = [0xf3, 0xe6, 0xa8];
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Where on the top edge (u) a point at x, in the bar's own coordinates, lands. */
export function edgeAt(q: GooGeo, x: number): number {
  const s = Math.min(Math.sin(q.th), Math.max(-Math.sin(q.th), (x - q.cx) / q.ro));
  return (Math.asin(s) + q.th) * q.ro;
}
