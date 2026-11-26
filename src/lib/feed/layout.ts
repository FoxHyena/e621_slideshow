/**
 * Feed geometry from known aspect ratios (ENGINEERING.md §5): every card's height is known before
 * its image loads, so the feed can window cards and keep the reading position exact.
 */
import type { Post } from "../e621/types";

/**
 * DESIGN.md v6 post panel: one 8 edge around and between everything. Edge, 36 header, edge, the
 * picture, the tag row (its 8 above and a 28 well), edge, the 36 footer and its 3 lip, edge; then
 * 16 to the next panel.
 */
export const CARD = { edge: 8, header: 36, tags: 36, foot: 39, gap: 16 } as const;
/** Everything in a panel but the picture. */
export const CARD_CHROME = CARD.edge + CARD.header + CARD.edge + CARD.tags + CARD.edge + CARD.foot + CARD.edge;
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
  return Math.round((column - 2 * CARD.edge) * cardAspect(post));
}

export function cardHeight(post: Pick<Post, "files">, column: number): number {
  return CARD_CHROME + mediaHeight(post, column);
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

// ---- rows (Following: the divider and folded runs between cards) ------------

/** Fixed heights of the rows between cards (ENGINEERING.md §5), pinned in CSS too. */
export const ROW = { divider: 120, more: 48 } as const;

export type FeedRow =
  | { kind: "post"; index: number }
  /** a folded run: `count` posts after the shown ones, by `artist`; `run` is the run's first post id */
  | { kind: "more"; run: number; artist: string; count: number }
  | { kind: "divider" };

export interface RowLayout extends FeedLayout {
  /** for each post, the row that shows it (a folded post: its "+N more" row) */
  rowOf: number[];
}

/** Every post as its own row: a feed without dividers or folded runs. */
export function plainRows(count: number): FeedRow[] {
  return Array.from({ length: count }, (_, index) => ({ kind: "post", index }));
}

export function layoutRows(rows: FeedRow[], posts: Pick<Post, "files">[], column: number): RowLayout {
  const tops: number[] = [];
  const heights: number[] = [];
  const rowOf = new Array<number>(posts.length).fill(-1);
  let y = 0;
  rows.forEach((r, i) => {
    const h = r.kind === "post" ? cardHeight(posts[r.index], column) : ROW[r.kind];
    if (r.kind === "post") rowOf[r.index] = i;
    tops.push(y);
    heights.push(h);
    y += h + CARD.gap;
  });
  // Folded posts: their run's "+N more" row (the next one after the last shown post before them).
  let more = -1;
  for (let p = posts.length - 1; p >= 0; p--) {
    if (rowOf[p] >= 0) {
      more = -1;
      continue;
    }
    if (more < 0) {
      // the first row after the shown post above this one
      let above = p - 1;
      while (above >= 0 && rowOf[above] < 0) above--;
      more = above >= 0 ? rowOf[above] + 1 : 0;
    }
    rowOf[p] = more;
  }
  return { column, tops, heights, total: rows.length ? y - CARD.gap : 0, rowOf };
}
