/**
 * The goo's pools (DESIGN.md "On a computer": "The goo on a computer" and "The pool on a phone";
 * owner-picked 2026-11-26, "Pool" and "jar row"; the levels and surfaces are the design session's,
 * ported from mocks/screens-v6.html `sidePool` and `poolDraw`). A full-width slab whose top is the
 * level, with a small rise where it meets each side and a low swell or two, run through the tab bar
 * goo's filter. n is the favorites since the last wipe; nothing at 0.
 *
 * How it moves (owner-approved 2026-11-26, "Approve"; mock `poolStep`, `poolDrain`): the level rides
 * the goo's spring to a new height with a swell where the goo arrives, and drains in 900 ms on the
 * blade's ease, leaning lower at the right end mid-way.
 */

export type PoolKind = "side" | "jar";

/** How high the goo stands above the box's bottom edge, in px. */
export function poolLevel(kind: PoolKind, n: number): number {
  if (!(n > 0)) return 0;
  const k = 1 - Math.exp(-n / 60);
  // the sidebar's foot: 14 at 5, 37 at 40, 61 at 150 (never past the account row's 64)
  // the Settings goo row's card: 7 at 5, 24 at 40, 43 at 150 (of 56)
  return kind === "side" ? 10 + 56 * k : 4 + 42 * k;
}

export type PoolShape =
  | { t: "slab"; x0: number; y0: number; x1: number; y1: number; bottom: number }
  | { t: "circle"; cx: number; cy: number; r: number }
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number };

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Where a goo arrives on the surface, as a share of the width: the swell comes up there. */
export const POOL_LAND: Record<PoolKind, number> = { jar: 0.3, side: 0.75 };
/** A swell's life (the tab bar's plop), the drain's length and how far the right end leans, mid-drain. */
export const POOL_PLOP_MS = 340;
export const POOL_DRAIN_MS = 900;
export const POOL_TILT = 8;

/**
 * The pool's shapes in a W by H box (before the filter), with the surface h above the bottom,
 * leaning `tilt` lower at the right end than at the left, and swells `plops` ({ x, p: 0 to 1 }).
 * n sets the second swell's size. None when there's no goo.
 */
export function poolShapesAt(kind: PoolKind, n: number, W: number, H: number, h: number, tilt = 0, plops: { x: number; p: number }[] = []): PoolShape[] {
  if (h < 0.5 || W <= 0 || H <= 0) return [];
  const side = kind === "side";
  const at = (x: number) => H - h + tilt * (x / W - 0.5);
  // where the mock put the swells, as a share of its width (232 in the sidebar, 343 on a phone)
  const [a, b] = side ? [62 / 232, 158 / 232] : [96 / 343, 236 / 343];
  const rise = side ? 6 : 5;
  return [
    { t: "slab", x0: -12, y0: r3(at(-12)), x1: W + 12, y1: r3(at(W + 12)), bottom: H + 24 },
    { t: "circle", cx: 1, cy: r3(at(1) + 1), r: rise },
    { t: "circle", cx: W - 1, cy: r3(at(W - 1) + 1), r: rise },
    { t: "ellipse", cx: r3(a * W), cy: r3(at(a * W) + 1.5), rx: side ? 34 : 44, ry: side ? 4 : 3.5 },
    {
      t: "ellipse",
      cx: r3(b * W),
      cy: r3(at(b * W) + 1),
      rx: r3((side ? 26 : 36) + Math.min(side ? 18 : 20, n / 6)),
      ry: r3((side ? 3.5 : 3) + Math.min(side ? 4 : 3.5, n / 30)),
    },
    // a swell where the goo arrived: 12 growing to 28 across, up to 6 high (radii, as the mock's
    // `poolPaint`), gone in 340 ms
    ...plops.map((pl): PoolShape => ({ t: "ellipse", cx: r3(pl.x), cy: r3(at(pl.x) + 1), rx: r3(12 + 16 * pl.p), ry: r3(6 * Math.sin(Math.PI * pl.p)) })),
  ];
}

/** The pool at rest for n favorites. */
export function poolShapes(kind: PoolKind, n: number, W: number, H: number): PoolShape[] {
  return poolShapesAt(kind, n, W, H, poolLevel(kind, n));
}

/** The tab bar goo's filter (blur 2, alpha ×20 −8), so the shapes melt into one surface. */
export const POOL_FILTER = { blur: 2, matrix: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" } as const;

/** The shapes as SVG markup (the goo itself, and the clip path that cuts the Goo Ink copy). */
export function poolMarkup(shapes: PoolShape[]): string {
  return shapes
    .map((s) =>
      s.t === "slab"
        ? `<path d="M${s.x0} ${s.y0}L${s.x1} ${s.y1}V${s.bottom}H${s.x0}Z"/>`
        : s.t === "circle"
          ? `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`
          : `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"/>`,
    )
    .join("");
}

/** The goo's spring (the tab bar's drips sag on it): stiffness 40, damping 9. One step of dt seconds. */
export function poolSpring(h: number, v: number, to: number, dt: number): [number, number] {
  const v2 = v + ((to - h) * 40 - v * 9) * dt;
  return [h + v2 * dt, v2];
}

/** The blade's ease (in-out cubic), which the drain keeps step with. */
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2);
