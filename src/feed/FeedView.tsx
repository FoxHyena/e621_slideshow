"use client";

/**
 * A windowed feed of post cards, or a grid of tiles (UX §5 "Feed card", "Grid view", "Shared feed
 * states"). The page scrolls the document; only cards within two screens of the view are in the
 * DOM, placed from `layout.ts` so nothing jumps as pictures load. Where you were (a post and an
 * offset into it) is saved for a day, so a reload comes back to the same post.
 */
import { Play, RotateCw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { mediaKind, type Post } from "@/lib/e621/types";
import { gridRange, indexAt, layoutFeed, layoutGrid, mediaHeight, visibleRange, GRID_GAP } from "@/lib/feed/layout";
import { TagActionsOverlay, useTagHold, type TagAction } from "@/components/TagActions";
import type { Feed } from "@/state/feeds";
import { useStore } from "@/state/store";
import { isLocked, registerRevealer, scrollY } from "@/nav/scroll";
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
  onOpen: (post: Post, index: number) => void;
  onMenu: (post: Post) => void;
  onTag: (tag: string, action: TagAction) => void;
}

export function FeedView({ feed, grid, anchorKey, entryKey, empty, onOpen, onMenu, onTag }: FeedViewProps) {
  useStore(feed.version, (v) => v);
  const q = feed.queue;
  const posts = q.posts;
  const list = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState({ top: 0, height: 800 });
  const [now] = useState(() => Date.now());
  const still = useReducedMotion();
  const hold = useTagHold(onTag);

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cheap (one pass over the loaded posts), so it's simply recomputed with each render.
  const layout = layoutFeed(posts, width);
  const tiles = layoutGrid(posts.length, width);
  const total = grid ? tiles.total : layout.total;

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
    const i = Math.min(indexAt(layout, view.top), posts.length - 1);
    const a = view.top <= 0 ? null : { id: posts[i].id, off: Math.round(view.top - layout.tops[i]), at: Date.now() };
    unsaved.current = { key: anchorKey, a };
    const t = setTimeout(flush, ANCHOR_SAVE_MS);
    return () => clearTimeout(t);
  }, [view, grid, layout, posts, anchorKey, flush]);
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
      window.scrollTo(0, listTop + layout.tops[i] + saved.off);
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
      if (i >= 0 && layout.tops[i] !== k.top) window.scrollBy(0, layout.tops[i] - k.top);
    }
    const i = posts.length && view.top > 0 ? Math.min(indexAt(layout, view.top), posts.length - 1) : -1;
    keep.current = i >= 0 && !grid ? { id: posts[i].id, top: layout.tops[i] } : null;
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
        const [top, h] = g.grid
          ? [Math.floor(i / g.tiles.cols) * (g.tiles.tile + GRID_GAP), g.tiles.tile]
          : [g.layout.tops[i], g.layout.heights[i]];
        return docTop + top + h / 2 - window.innerHeight / 2;
      }),
    [entryKey],
  );

  const [start, end] = grid ? gridRange(tiles, view.top, view.height) : visibleRange(layout, view.top, view.height);
  const live = grid ? -1 : indexAt(layout, view.top + view.height / 2);

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
                  style={{ top: row * (tiles.tile + GRID_GAP), left: col * (tiles.tile + GRID_GAP), width: tiles.tile, height: tiles.tile }}
                  onOpen={() => onOpen(p, i)}
                />
              );
            })
          : posts.slice(start, end).map((p, k) => {
              const i = start + k;
              return (
                <div key={p.id} className="feed-slot" style={{ top: layout.tops[i], height: layout.heights[i] }}>
                  <PostCard
                    post={p}
                    index={i}
                    mediaHeight={mediaHeight(p, width)}
                    live={i === live}
                    still={still}
                    now={now}
                    hold={hold}
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
      <TagActionsOverlay hold={hold} recommended={false} onAction={onTag} />
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
          <div className="post-stats">
            <span className="sk-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tile({ post, style, onOpen }: { post: Post; style: React.CSSProperties; onOpen: () => void }) {
  const src = post.files.preview.jpg ?? post.files.sample.jpg;
  return (
    <button type="button" className="feed-tile" style={style} onClick={onOpen} aria-label={`Post ${post.id}`} data-testid="grid-tile" data-post-id={post.id}>
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
