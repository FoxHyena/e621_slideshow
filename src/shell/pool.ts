/**
 * The goo's pools (DESIGN.md "On a computer": "The goo on a computer" and "The pool on a phone";
 * owner-picked 2026-11-26, "Pool" and "jar row"; the levels and surfaces are the design session's,
 * ported from mocks/screens-v6.html `sidePool` and `poolDraw`). A full-width slab whose top is the
 * level, with a small rise where it meets each side and a low swell or two, run through the tab bar
 * goo's filter. n is the favorites since the last wipe; nothing at 0.
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
  | { t: "rect"; x: number; y: number; w: number; h: number }
  | { t: "circle"; cx: number; cy: number; r: number }
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number };

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** The pool's shapes in a W by H box (before the filter), or none when there's no goo. */
export function poolShapes(kind: PoolKind, n: number, W: number, H: number): PoolShape[] {
  const h = poolLevel(kind, n);
  if (h <= 0 || W <= 0 || H <= 0) return [];
  const y = H - h;
  const side = kind === "side";
  // where the mock put the swells, as a share of its width (232 in the sidebar, 343 on a phone)
  const [a, b] = side ? [62 / 232, 158 / 232] : [96 / 343, 236 / 343];
  const rise = side ? 6 : 5;
  return [
    { t: "rect", x: -12, y: r3(y), w: W + 24, h: r3(h + 24) },
    { t: "circle", cx: 1, cy: r3(y + 1), r: rise },
    { t: "circle", cx: W - 1, cy: r3(y + 1), r: rise },
    { t: "ellipse", cx: r3(a * W), cy: r3(y + 1.5), rx: side ? 34 : 44, ry: side ? 4 : 3.5 },
    {
      t: "ellipse",
      cx: r3(b * W),
      cy: r3(y + 1),
      rx: r3((side ? 26 : 36) + Math.min(side ? 18 : 20, n / 6)),
      ry: r3((side ? 3.5 : 3) + Math.min(side ? 4 : 3.5, n / 30)),
    },
  ];
}

/** The tab bar goo's filter (blur 2, alpha ×20 −8), so the shapes melt into one surface. */
export const POOL_FILTER = { blur: 2, matrix: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" } as const;

const markup = (s: PoolShape) =>
  s.t === "rect"
    ? `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>`
    : s.t === "circle"
      ? `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`
      : `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"/>`;

/**
 * The same goo as an image for a CSS mask (a data URL), filter and all, so the words drawn again in Goo Ink are cut to the
 * goo's own wavy edge, not a straight line.
 */
export function poolMask(shapes: PoolShape[], W: number, H: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<filter id="g" x="-10%" y="-10%" width="120%" height="130%" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur stdDeviation="${POOL_FILTER.blur}"/><feColorMatrix values="${POOL_FILTER.matrix}"/></filter>` +
    `<g filter="url(#g)">${shapes.map(markup).join("")}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The mask image as a CSS `mask` value, stretched over the whole box. */
export const maskCss = (url: string) => `url("${url}") 0 0 / 100% 100% no-repeat`;
