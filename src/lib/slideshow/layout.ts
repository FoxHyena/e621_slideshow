import type { Post } from "@/lib/e621/types";

/**
 * Deterministic "randomness" for slideshow styles: every pose is a pure
 * function of the post id, so a print keeps its tilt across re-renders.
 */
export function rand(id: number, salt: number): number {
  let h = Math.imul(id ^ Math.imul(salt + 1, 0x9e3779b9), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}

/** Uniform in [-max, max]. */
const spread = (id: number, salt: number, max: number) => (rand(id, salt) * 2 - 1) * max;

/** Width / height, from whichever dimensions the post has. */
export function aspectOf(post: Post): number {
  const { width, height } = post.file.width && post.file.height ? post.file : post.sample;
  return width > 0 && height > 0 ? width / height : 1;
}

// ---- vintage prints ----------------------------------------------------------

export const FOCUS_MAX_H = 0.68;
export const FOCUS_TILT_MIN = 1.5;
export const FOCUS_TILT_MAX = 4;

/** The colour print on top: centred, height as a fraction of the screen, small tilt. */
export function focusPrint(id: number, aspect: number, vp: number): { h: number; rotate: number } {
  const h = Math.min(FOCUS_MAX_H, (0.8 * vp) / aspect);
  const sign = rand(id, 50) < 0.5 ? -1 : 1;
  return { h, rotate: sign * (FOCUS_TILT_MIN + rand(id, 51) * (FOCUS_TILT_MAX - FOCUS_TILT_MIN)) };
}

/** A background print: centre (fractions of screen width / height), height (fraction of screen height), tilt. */
export interface StackSlot {
  x: number;
  y: number;
  h: number;
  rotate: number;
}

export const STACK_MIN_H = 0.75;
export const STACK_MAX_H = 1;
export const STACK_TILT_MAX = 12;
/** Each print is at least this share of the screen width, so three abreast overlap. */
const STACK_MIN_W = 0.45;
const STACK_CELLS: [number, number][] = [
  [1 / 6, 1 / 4],
  [1 / 2, 1 / 4],
  [5 / 6, 1 / 4],
  [1 / 6, 3 / 4],
  [1 / 2, 3 / 4],
  [5 / 6, 3 / 4],
];

/**
 * Big grey prints heaped under the focus print: a jittered 3×2 grid so the
 * heap covers the screen, sized to overlap and run off the edges, stacked in
 * an order the scene picks. Returned bottom to top, one per aspect.
 */
export function stackLayout(sceneId: number, aspects: number[], vp: number): StackSlot[] {
  const cells = STACK_CELLS.map((c, i) => ({ c, k: rand(sceneId, 60 + i) })).sort((p, q) => p.k - q.k);
  return aspects.map((a, i) => {
    const [cx, cy] = cells[i % cells.length].c;
    const base = STACK_MIN_H + rand(sceneId, 70 + i) * (STACK_MAX_H - STACK_MIN_H);
    return {
      x: cx + spread(sceneId, 80 + i, 0.08),
      y: cy + spread(sceneId, 90 + i, 0.08),
      h: Math.max(base, (STACK_MIN_W * vp) / a),
      rotate: spread(sceneId, 100 + i, STACK_TILT_MAX),
    };
  });
}

export interface Drift {
  scale: number;
  rotate: number;
  x: number;
  y: number;
}

export const DRIFT_SCALE = 1.06;
export const DRIFT_ROTATE = 1;
export const DRIFT_SHIFT = 1.5;

/** The whole scene's slow move: from rest to a light zoom, tilt and pan. */
export function sceneDrift(sceneId: number): { from: Drift; to: Drift } {
  return {
    from: { scale: 1, rotate: 0, x: 0, y: 0 },
    to: {
      scale: DRIFT_SCALE,
      rotate: spread(sceneId, 30, DRIFT_ROTATE),
      x: spread(sceneId, 31, DRIFT_SHIFT),
      y: spread(sceneId, 32, DRIFT_SHIFT),
    },
  };
}

export interface KenBurns {
  from: { scale: number; x: number; y: number };
  to: { scale: number; x: number; y: number };
}

export const KB_SCALE = 1.15;
/** Max drift in % of the element; stays inside the overscan of the zoomed side. */
export const KB_DRIFT = 4;

/** Zoom in or out, drifting toward a corner picked by the id. */
export function kenBurns(id: number): KenBurns {
  const zoomIn = rand(id, 5) < 0.5;
  const x = spread(id, 6, KB_DRIFT);
  const y = spread(id, 7, KB_DRIFT);
  const near = { scale: 1.02, x: 0, y: 0 };
  const far = { scale: KB_SCALE, x, y };
  return zoomIn ? { from: near, to: far } : { from: far, to: near };
}

// ---- collage ---------------------------------------------------------------

/** A tile in fractions of the viewport (0..1 on both axes). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CollageTemplate = "row" | "column" | "feature-left" | "feature-top";

const MARGIN = 0.03;
const GAP = 0.015;

/** Area of an image of aspect `a` letterboxed into a w×h box. */
function shown(a: number, w: number, h: number): number {
  return Math.min(w, h * a) * Math.min(h, w / a);
}

/**
 * Rects for each tile, in viewport units where height is 1 and width is
 * `vp` (the viewport aspect). Returned in tile order.
 */
function place(t: CollageTemplate, aspects: number[], featured: number, vp: number): Rect[] {
  const W = vp - 2 * MARGIN;
  const H = 1 - 2 * MARGIN;
  const n = aspects.length;
  const gaps = (n - 1) * GAP;
  if (t === "row" || n === 1) {
    // One justified row: every tile at its own aspect, same height.
    const sum = aspects.reduce((s, a) => s + a, 0);
    const h = Math.min(H, (W - gaps) / sum);
    let x = MARGIN + (W - (h * sum + gaps)) / 2;
    const y = MARGIN + (H - h) / 2;
    return aspects.map((a) => {
      const r = { x, y, w: a * h, h };
      x += a * h + GAP;
      return r;
    });
  }
  if (t === "column") {
    const sum = aspects.reduce((s, a) => s + 1 / a, 0);
    const w = Math.min(W, (H - gaps) / sum);
    let y = MARGIN + (H - (w * sum + gaps)) / 2;
    const x = MARGIN + (W - w) / 2;
    return aspects.map((a) => {
      const r = { x, y, w, h: w / a };
      y += w / a + GAP;
      return r;
    });
  }
  // Featured tile on one side, the rest sharing the other.
  const others = aspects.map((_, i) => i).filter((i) => i !== featured);
  const rects: Rect[] = new Array(n);
  // The side strip is sized so its tiles sit at their own aspect, no letterboxing;
  // the featured tile takes what is left, within reason.
  if (t === "feature-left") {
    const sum = others.reduce((s, i) => s + 1 / aspects[i], 0);
    const rw = Math.min(Math.max((H - (others.length - 1) * GAP) / sum, 0.32 * W), 0.6 * W);
    const fw = W - rw - GAP;
    rects[featured] = { x: MARGIN, y: MARGIN, w: fw, h: H };
    let y = MARGIN;
    for (const i of others) {
      const h = (rw / aspects[i] / (rw * sum)) * (H - (others.length - 1) * GAP);
      rects[i] = { x: MARGIN + fw + GAP, y, w: rw, h };
      y += h + GAP;
    }
  } else {
    const sum = others.reduce((s, i) => s + aspects[i], 0);
    const bh = Math.min(Math.max((W - (others.length - 1) * GAP) / sum, 0.32 * H), 0.6 * H);
    const fh = H - bh - GAP;
    rects[featured] = { x: MARGIN, y: MARGIN, w: W, h: fh };
    let x = MARGIN;
    for (const i of others) {
      const w = (aspects[i] / sum) * (W - (others.length - 1) * GAP);
      rects[i] = { x, y: MARGIN + fh + GAP, w, h: bh };
      x += w + GAP;
    }
  }
  return rects;
}

/**
 * The template that shows the most image (least letterboxing) for these
 * tiles on this screen. `featured` is the tile holding the current post.
 */
export function collageLayout(
  aspects: number[],
  featured: number,
  vp: number,
): { template: CollageTemplate; rects: Rect[] } {
  const templates: CollageTemplate[] =
    aspects.length < 3 ? ["row", "column"] : ["row", "column", "feature-left", "feature-top"];
  let best: { template: CollageTemplate; rects: Rect[]; fill: number } | null = null;
  for (const template of templates) {
    const rects = place(template, aspects, featured, vp);
    // The featured tile weighs extra so the current post reads as the hero,
    // without beating an even row of same-shaped posts.
    const fill = rects.reduce((s, r, i) => s + shown(aspects[i], r.w, r.h) * (i === featured ? 1.5 : 1), 0);
    if (!best || fill > best.fill + 1e-9) best = { template, rects, fill };
  }
  const { template, rects } = best!;
  // Normalize x to 0..1 of the viewport width.
  return { template, rects: rects.map((r) => ({ x: r.x / vp, y: r.y, w: r.w / vp, h: r.h })) };
}

export interface CollageSlots {
  posts: (Post | null)[];
  /** Arrival counter per slot; the smallest is the oldest. */
  ages: number[];
  tick: number;
}

export const COLLAGE_TILES = 3;

export const emptySlots = (): CollageSlots => ({
  posts: new Array(COLLAGE_TILES).fill(null),
  ages: new Array(COLLAGE_TILES).fill(-1),
  tick: 0,
});

/** Put `post` in the collage: no-op if it is showing, else it takes the oldest (or an empty) slot. */
export function placeInSlots(slots: CollageSlots, post: Post): CollageSlots {
  if (slots.posts.some((p) => p?.id === post.id)) return slots;
  let target = slots.posts.indexOf(null);
  if (target < 0) target = slots.ages.indexOf(Math.min(...slots.ages));
  const posts = [...slots.posts];
  const ages = [...slots.ages];
  posts[target] = post;
  ages[target] = slots.tick;
  return { posts, ages, tick: slots.tick + 1 };
}
