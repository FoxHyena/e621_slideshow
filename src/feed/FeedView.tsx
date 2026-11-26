"use client";

/**
 * A windowed feed of post cards, or a grid of tiles (UX §5 "Feed card", "Grid view", "Shared feed
 * states"). The page scrolls the document; only cards within two screens of the view are in the
 * DOM, placed from `layout.ts` so nothing jumps as pictures load. Where you were (a post and an
 * offset into it) is saved for a day, so a reload comes back to the same post.
 */
import { ChevronDown, Play, RotateCw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { mediaKind, type Post } from "@/lib/e621/types";
import { gridRange, indexAt, layoutGrid, layoutRows, mediaHeight, plainRows, visibleRange, GRID_GAP, type FeedRow } from "@/lib/feed/layout";
import { TagActionsOverlay, useTagHold, type TagAction } from "@/components/TagActions";
import type { Feed } from "@/state/feeds";
import { useStore } from "@/state/store";
import { isLocked, registerRevealer, scrollY } from "@/nav/scroll";
import { applyTuck } from "./tuck";
import { AppMark } from "@/components/Avatar";
import { PostCard } from "./PostCard";

/** Start the next page this far before the end (UX §5). */
const PREFETCH_PX = 1500;
/** Rate limited: try again after this long. */
const RETRY_MS = 5000;
const ANCHOR_PREFIX = "e6ss:anchor:";
const ANCHOR_TTL_MS = 24 * 60 * 60_000;
/** Load this many posts at most looking for a saved place after a reload. */
const ANCHOR_SEARCH_MAX = 600;
/** Save the place once scrolling has rested this long. */
const ANCHOR_SAVE_MS = 250;

interface Anchor {
  id: number;
  off: number;
  at: number;
}

function readAnchor(key: string): Anchor | null {
  try {
    const a = JSON.parse(localStorage.getItem(ANCHOR_PREFIX + key) ?? "null") as Anchor | null;
    return a && Date.now() - a.at < ANCHOR_TTL_MS ? a : null;
  } catch {
    return null;
  }
}
function writeAnchor(key: string, a: Anchor | null) {
  try {
    if (a) localStorage.setItem(ANCHOR_PREFIX + key, JSON.stringify(a));
    else localStorage.removeItem(ANCHOR_PREFIX + key);
  } catch {
    // storage full or off: the place just isn't kept across a reload
  }
}

/** Drop places older than a day (once per load). */
let swept = false;
function sweepAnchors() {
  if (swept) return;
  swept = true;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(ANCHOR_PREFIX) && !readAnchor(k.slice(ANCHOR_PREFIX.length))) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

const reducedQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (l) => {
      const m = reducedQuery();
      m.addEventListener("change", l);
      return () => m.removeEventListener("change", l);
    },
    () => reducedQuery().matches,
    () => false,
  );
}

export interface FeedViewProps {
  feed: Feed;
  grid: boolean;
  /** names this feed's saved place (the history entry plus the feed) */
  anchorKey: string;
  /** the history entry, so the player closing over this list can land on its last post */
  entryKey: string;
  /** what an empty result says (screen-specific) */
  empty: ReactNode;
  /** For You: holding a tag offers Pin in place of Search */
  recommended?: boolean;
  /** cards offer Follow for artists you don't follow (For You, Results, Favorites) */
  follow?: boolean;
  /**
   * Following: the rows between cards (the "You're caught up" divider, folded runs), from the
   * posts as they are now. Without it every post is its own row.
   */
  rowsFor?: (posts: Post[], exhausted: boolean) => FeedRow[];
  /** Following: posts marked New */
  fresh?: (post: Post) => boolean;
  /** Following: the line under "You're caught up" */
  caughtNote?: string;
  /** Following: a folded run's "+N more" was tapped (`run` is its first post's id) */
  onExpand?: (run: number) => void;
  /** Following: where the view is, and the divider's top (list coordinates), as the page scrolls */
  onView?: (v: { top: number; height: number; dividerTop: number | null; total: number }) => void;
  onOpen: (post: Post, index: number) => void;
  onMenu: (post: Post) => void;
  onTag: (tag: string, action: TagAction) => void;
}

export function FeedView({
  feed,
  grid,
  anchorKey,
  entryKey,
  empty,
  onOpen,
  onMenu,
  onTag,
  recommended = false,
  follow = false,
  rowsFor,
  fresh,
  caughtNote,
  onExpand,
  onView,
}: FeedViewProps) {
  useStore(feed.version, (v) => v);
  const q = feed.queue;
  const posts = q.posts;
  const list = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState({ top: 0, height: 800 });
  const [now] = useState(() => Date.now());
  const still = useReducedMotion();
  const hold = useTagHold(onTag);
  /** Tuck the cards as they pass the edges (not in the grid, not with reduced motion). */
  const tucking = useRef(false);
  useLayoutEffect(() => {
    tucking.current = !still && !grid;
    // turning it off leaves no card half-tucked
    if (!tucking.current && list.current)
      for (const slot of list.current.children) {
        const el = slot.firstElementChild as HTMLElement | null;
        if (el) el.style.transform = el.style.opacity = el.style.transformOrigin = "";
      }
  }, [still, grid]);

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cheap (one pass over the loaded posts), so it's simply recomputed with each render.
  const rows = rowsFor ? rowsFor(posts, q.exhausted) : plainRows(posts.length);
  const layout = layoutRows(rows, posts, width);
  /** The post a row stands for: itself, else the nearest shown post above it (then below). */
  const postAt = (r: number): number => {
    for (let k = r; k >= 0; k--) if (rows[k]?.kind === "post") return (rows[k] as { index: number }).index;
    for (let k = r + 1; k < rows.length; k++) if (rows[k].kind === "post") return (rows[k] as { index: number }).index;
    return -1;
  };
  const topOf = (i: number) => layout.tops[layout.rowOf[i]];
  const tiles = layoutGrid(posts.length, width);
  const total = grid ? tiles.total : layout.total;

  // Rows that just mounted take their tuck at once, from the last measured place.
  useEffect(() => {
    if (tucking.current) applyTuck(list.current, -view.top, view.height);
  });

  /** Where the list is in the document, and the window over it. */
  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return null;
    const top = -el.getBoundingClientRect().top;
    return { top, height: window.innerHeight };
  }, []);

  // Window the cards as the page scrolls; ask for more near the end; keep the place.
  useEffect(() => {
    sweepAnchors();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const m = measure();
        if (!m) return;
        if (tucking.current) applyTuck(list.current, -m.top, m.height);
        setView((v) => (Math.abs(v.top - m.top) < 1 && v.height === m.height ? v : m));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  // Load the first page, and more as the end comes within reach.
  useEffect(() => {
    if (q.error || q.exhausted) return;
    if (posts.length === 0 || view.top + view.height > total - PREFETCH_PX) void q.ensure(posts.length - 1);
  }, [q, posts.length, view, total, q.error, q.exhausted]);

  // e621 asked us to slow down: try again in a moment.
  const limited = q.error !== null && /rate limited/i.test(q.error);
  useEffect(() => {
    if (!limited) return;
    const t = setTimeout(() => {
      q.retry();
      void q.ensure(posts.length - 1);
    }, RETRY_MS);
    return () => clearTimeout(t);
  }, [limited, q, posts.length]);

  // After a reload: the saved place, until we've gone back to it (or given up).
  const [saved] = useState(() => readAnchor(anchorKey));
  const restored = useRef(saved === null);

  // Save the place: the first card in view and how far into it. Written once scrolling rests (and
  // on leaving), not every frame.
  const unsaved = useRef<{ key: string; a: Anchor | null } | null>(null);
  const flush = useCallback(() => {
    const u = unsaved.current;
    unsaved.current = null;
    if (u) writeAnchor(u.key, u.a);
  }, []);
  useEffect(() => {
    if (grid || posts.length === 0 || !restored.current) return;
    const i = postAt(Math.min(indexAt(layout, view.top), rows.length - 1));
    if (i < 0) return;
    const a = view.top <= 0 ? null : { id: posts[i].id, off: Math.round(view.top - topOf(i)), at: Date.now() };
    unsaved.current = { key: anchorKey, a };
    const t = setTimeout(flush, ANCHOR_SAVE_MS);
    return () => clearTimeout(t);
  }, [view, grid, layout, posts, anchorKey, flush]); // eslint-disable-line react-hooks/exhaustive-deps -- postAt/topOf read this render's layout
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  // Go back to the saved post once it has loaded.
  useLayoutEffect(() => {
    if (restored.current || !saved || width === 0 || grid) return;
    const i = posts.findIndex((p) => p.id === saved.id);
    if (i >= 0) {
      restored.current = true;
      const el = list.current;
      if (!el) return;
      const listTop = el.getBoundingClientRect().top + window.scrollY;
      // Folded since (its run closed): land on the run's "+N more" row instead.
      const off = rows[layout.rowOf[i]]?.kind === "post" ? saved.off : 0;
      window.scrollTo(0, listTop + topOf(i) + off);
      return;
    }
    if (q.exhausted || q.error || posts.length >= ANCHOR_SEARCH_MAX) restored.current = true;
    else if (!q.loading && posts.length > 0) void q.ensure(posts.length - 1);
  });

  // Posts hidden above the view (a new blacklist line) or a new width move the cards: keep the first
  // card in view where it was, so what's under your finger stays put (UX §5 "hides in place").
  const keep = useRef<{ id: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const k = keep.current;
    if (k && !grid && !isLocked()) {
      const i = posts.findIndex((p) => p.id === k.id);
      if (i >= 0 && topOf(i) !== k.top) window.scrollBy(0, topOf(i) - k.top);
    }
    const i = rows.length && view.top > 0 ? postAt(Math.min(indexAt(layout, view.top), rows.length - 1)) : -1;
    keep.current = i >= 0 && !grid ? { id: posts[i].id, top: topOf(i) } : null;
  });

  // The player closing over this list centres the last post it showed (or the nearest older one).
  const geometry = useRef({ grid, layout, tiles, posts });
  useLayoutEffect(() => {
    geometry.current = { grid, layout, tiles, posts };
  });
  useEffect(
    () =>
      registerRevealer(entryKey, (id) => {
        const el = list.current;
        const g = geometry.current;
        if (!el || g.posts.length === 0) return null;
        let i = g.posts.findIndex((p) => p.id === id);
        // Gone (blacklisted, say): the nearest older post, which only means something newest-first.
        const newestFirst = g.posts.every((p, k) => k === 0 || p.id < g.posts[k - 1].id);
        if (i < 0 && newestFirst) i = g.posts.findIndex((p) => p.id < id);
        if (i < 0) return null;
        const docTop = el.getBoundingClientRect().top + scrollY();
        const r = g.layout.rowOf[i];
        const [top, h] = g.grid
          ? [Math.floor(i / g.tiles.cols) * (g.tiles.tile + GRID_GAP), g.tiles.tile]
          : [g.layout.tops[r], g.layout.heights[r]];
        return docTop + top + h / 2 - window.innerHeight / 2;
      }),
    [entryKey],
  );

  const [start, end] = grid ? gridRange(tiles, view.top, view.height) : visibleRange(layout, view.top, view.height);
  const mid = grid ? -1 : indexAt(layout, view.top + view.height / 2);
  const live = rows[mid]?.kind === "post" ? (rows[mid] as { index: number }).index : -1;

  // Following: where the view and the divider are (rule 1 of marking seen). In the grid, the divider
  // is the top of the tile row holding the first post after it.
  const dividerRow = rowsFor ? rows.findIndex((r) => r.kind === "divider") : -1;
  let dividerTop: number | null = null;
  if (dividerRow >= 0 && !grid) dividerTop = layout.tops[dividerRow];
  else if (dividerRow >= 0) {
    const after = rows.slice(dividerRow).find((r) => r.kind === "post");
    const first = after?.kind === "post" ? after.index : posts.length;
    dividerTop = Math.floor(first / tiles.cols) * (tiles.tile + GRID_GAP);
  }
  const report = useRef(onView);
  useLayoutEffect(() => {
    report.current = onView;
  });
  useEffect(() => {
    report.current?.({ top: view.top, height: view.height, dividerTop, total });
  }, [view, dividerTop, total]);

  const stats = q.stats;
  const hidden = stats.blacklisted + stats.hidden;
  const firstLoad = posts.length === 0 && !q.error && !q.exhausted;

  return (
    <>
      <div ref={list} className="feed-list" style={{ height: firstLoad ? undefined : total }} data-testid={grid ? "feed-grid" : "feed"}>
        {firstLoad && <Skeletons />}
        {grid
          ? posts.slice(start, end).map((p, k) => {
              const i = start + k;
              const row = Math.floor(i / tiles.cols);
              const col = i % tiles.cols;
              return (
                <Tile
                  key={p.id}
                  post={p}
                  fresh={fresh?.(p) ?? false}
                  style={{ top: row * (tiles.tile + GRID_GAP), left: col * (tiles.tile + GRID_GAP), width: tiles.tile, height: tiles.tile }}
                  onOpen={() => onOpen(p, i)}
                />
              );
            })
          : rows.slice(start, end).map((r, k) => {
              const at = { top: layout.tops[start + k], height: layout.heights[start + k] };
              const tuck = { "data-top": at.top, "data-h": at.height };
              if (r.kind === "divider")
                return (
                  <div key="divider" className="feed-slot feed-caught" style={at} data-testid="caught-up">
                    {/* a seed that draws in gold and pale blue, the caught-up colours of the approved mock */}
                    <AppMark seed="caught-up-617" className="feed-caught-mark" />
                    <b>You&rsquo;re caught up</b>
                    {caughtNote && <small data-testid="caught-note">{caughtNote}</small>}
                  </div>
                );
              if (r.kind === "more")
                return (
                  <div key={`more:${r.run}`} className="feed-slot" style={at} {...tuck}>
                    <button type="button" className="btn-tonal feed-burst" onClick={() => onExpand?.(r.run)} data-testid="burst-more">
                      <span>
                        {r.count} more from {r.artist.replaceAll("_", " ")}
                      </span>
                      <ChevronDown aria-hidden />
                    </button>
                  </div>
                );
              const p = posts[r.index];
              return (
                <div key={p.id} className="feed-slot" style={at} {...tuck}>
                  <PostCard
                    post={p}
                    index={r.index}
                    mediaHeight={mediaHeight(p, width)}
                    live={r.index === live}
                    still={still}
                    now={now}
                    hold={hold}
                    fresh={fresh?.(p) ?? false}
                    follow={follow}
                    onOpen={onOpen}
                    onMenu={onMenu}
                  />
                </div>
              );
            })}
      </div>
      <div className="feed-foot" data-testid="feed-state">
        {q.error ? (
          <div className="feed-error" role="alert">
            <p>{limited ? "e621 asked us to slow down. Trying again in a moment." : q.error}</p>
            {!limited && (
              <button
                type="button"
                className="btn-tonal"
                onClick={() => {
                  q.retry();
                  void q.ensure(posts.length - 1);
                }}
              >
                <RotateCw aria-hidden /> Retry
              </button>
            )}
          </div>
        ) : q.exhausted && posts.length === 0 ? (
          <div className="feed-empty">
            {empty}
            {hidden > 0 && <p className="feed-note">{hiddenNote(stats)}</p>}
          </div>
        ) : q.exhausted ? (
          <p className="feed-end">
            That&rsquo;s everything ✿{hidden > 0 && <span className="feed-note"> {hiddenNote(stats)}</span>}
          </p>
        ) : q.loading && posts.length > 0 ? (
          <span className="feed-spinner" role="status" aria-label="Loading more" />
        ) : null}
      </div>
      <TagActionsOverlay hold={hold} recommended={recommended} onAction={onTag} />
    </>
  );
}

function hiddenNote(s: { blacklisted: number; hidden: number }): string {
  const parts: string[] = [];
  if (s.blacklisted) parts.push(`${s.blacklisted} hidden by your blacklist`);
  if (s.hidden) parts.push(`${s.hidden} need${s.hidden === 1 ? "s" : ""} sign-in to see`);
  return `${parts.join(", ")}.`;
}

function Skeletons() {
  return (
    <div className="feed-skeletons" role="status" aria-label="Loading posts" data-testid="feed-loading">
      {[0.8, 1.25, 1].map((a, i) => (
        <div key={i} className="post post-skeleton" aria-hidden>
          <div className="post-head">
            <span className="sk-dot" />
            <span className="sk-line" />
          </div>
          <div className="post-media sk-block" style={{ aspectRatio: `1 / ${a}` }} />
          <div className="post-foot">
            <span className="sk-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tile({ post, fresh, style, onOpen }: { post: Post; fresh: boolean; style: React.CSSProperties; onOpen: () => void }) {
  const src = post.files.preview.jpg ?? post.files.sample.jpg;
  return (
    <button
      type="button"
      className="feed-tile"
      style={style}
      onClick={onOpen}
      aria-label={`Post ${post.id}${fresh ? ", new" : ""}`}
      data-testid="grid-tile"
      data-post-id={post.id}
      data-new={fresh || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails */}
      {src && <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />}
      {mediaKind(post) === "video" && (
        <span className="tile-video" aria-hidden>
          <Play />
        </span>
      )}
    </button>
  );
}
