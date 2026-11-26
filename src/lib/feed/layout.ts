/**
 * Feed geometry from known aspect ratios (ENGINEERING.md §5): every card's height is known before
 * its image loads, so the feed can window cards and keep the reading position exact.
 */
import type { Post } from "../e621/types";

/** DESIGN.md post panel: header, picture, gap, stats, gap, tags, bottom padding; then the gap to the next. */
export const CARD = { header: 44, inset: 12, stats: 32, tags: 32, gap: 24 } as const;
/** Images taller than 1:2 are capped there and shown whole on the panel colour (DECISIONS). */
export const MAX_TALL = 2;
export const FEED_MAX_WIDTH = 600;
export const SIDE = 16;

/** The card column: the viewport less the 16 edges, at most 600 (desktop). */
export function columnWidth(viewport: number): number {
  return Math.max(0, Math.min(FEED_MAX_WIDTH, viewport - 2 * SIDE));
}

/** Height over width of a post's picture, as the card shows it (capped). */
export function cardAspect(post: Pick<Post, "files">): number {
  const { width, height } = post.files.original;
  const a = width > 0 && height > 0 ? height / width : 1;
  return Math.min(a, MAX_TALL);
}

export function mediaHeight(post: Pick<Post, "files">, column: number): number {
  return Math.round((column - 2 * CARD.inset) * cardAspect(post));
}

export function cardHeight(post: Pick<Post, "files">, column: number): number {
  return CARD.header + mediaHeight(post, column) + CARD.inset + CARD.stats + CARD.inset + CARD.tags + CARD.inset;
}

export interface FeedLayout {
  column: number;
  /** top of each card, from the top of the list */
  tops: number[];
  heights: number[];
  total: number;
}

export function layoutFeed(posts: Pick<Post, "files">[], column: number): FeedLayout {
  const tops: number[] = [];
  const heights: number[] = [];
  let y = 0;
  for (const p of posts) {
    const h = cardHeight(p, column);
    tops.push(y);
    heights.push(h);
    y += h + CARD.gap;
  }
  return { column, tops, heights, total: posts.length ? y - CARD.gap : 0 };
}

/** First index whose box ends below `y` (binary search over sorted tops). */
export function indexAt(layout: Pick<FeedLayout, "tops" | "heights">, y: number): number {
  const { tops, heights } = layout;
  let lo = 0;
  let hi = tops.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tops[mid] + heights[mid] <= y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Cards whose box is within `overscan` viewports of the visible window: [start, end). */
export function visibleRange(
  layout: Pick<FeedLayout, "tops" | "heights">,
  scrollTop: number,
  viewport: number,
  overscan = 2,
): [number, number] {
  const n = layout.tops.length;
  if (n === 0) return [0, 0];
  const from = scrollTop - overscan * viewport;
  const to = scrollTop + viewport + overscan * viewport;
  const start = indexAt(layout, from);
  let end = start;
  while (end < n && layout.tops[end] < to) end++;
  return [start, end];
}

// ---- grid ------------------------------------------------------------------

export const GRID_GAP = 4;

export interface GridLayout {
  cols: number;
  tile: number;
  rows: number;
  total: number;
}

/** Square tiles: 3 across on a phone, more as the width grows (about 180 px each). */
export function layoutGrid(count: number, width: number): GridLayout {
  const cols = Math.max(3, Math.floor((width + GRID_GAP) / (180 + GRID_GAP)));
  const tile = Math.max(0, (width - GRID_GAP * (cols - 1)) / cols);
  const rows = Math.ceil(count / cols);
  return { cols, tile, rows, total: rows ? rows * tile + (rows - 1) * GRID_GAP : 0 };
}

export function gridRange(g: GridLayout, scrollTop: number, viewport: number, overscan = 2): [number, number] {
  const row = g.tile + GRID_GAP;
  if (row <= 0) return [0, 0];
  const first = Math.max(0, Math.floor((scrollTop - overscan * viewport) / row));
  const last = Math.min(g.rows, Math.ceil((scrollTop + viewport + overscan * viewport) / row));
  return [first * g.cols, last * g.cols];
}
