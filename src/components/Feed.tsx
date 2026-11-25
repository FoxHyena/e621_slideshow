"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink, Heart, ImageOff, LayoutGrid, Play, Search, X } from "lucide-react";
import { postPageUrl } from "@/lib/e621/client";
import { mediaKind, TAG_CATEGORY_COLORS, type Post, type TagCategoryName } from "@/lib/e621/types";
import type { PlaybackSettings } from "@/lib/settings";
import { displayUrl } from "@/lib/slideshow/media";
import type { QueueStats } from "@/lib/slideshow/queue";
import Avatar from "./Avatar";
import { InlineLoader } from "./Loader";
import { TagActionsOverlay, TagStrip, useTagHold, type TagAction, type TagHold } from "./TagActions";

interface FeedProps {
  posts: Post[];
  currentIndex: number;
  loading: boolean;
  /** shown in place of the results while the first ones are on their way */
  loader?: ReactNode;
  exhausted: boolean;
  error: string | null;
  stats: QueueStats;
  signedIn: boolean;
  playback: PlaybackSettings;
  /** Signed in with a key: the heart works. */
  canFavorite: boolean;
  onFavorite: (post: Post) => void;
  /** Start the show at this index. */
  onPlayFrom: (index: number) => void;
  /** The end of the feed is near: load more. */
  onNeedMore: () => void;
  onRetry: () => void;
  onClose: () => void;
  onGrid: () => void;
  /** Open the settings panel to change the search, keeping the feed underneath. */
  onEditSearch: () => void;
  /** The scroll offset to reopen at, if the feed is coming back to where it was left. */
  savedScroll: () => number | null;
  /** Where the feed is now: the post in view and the scroll offset. */
  onPlace: (postId: number, scrollTop: number) => void;
  /** Recommended: the search target pins the tag instead. */
  recommended: boolean;
  /** A tag was dropped on (or tapped onto) one of its targets. */
  onTag: (tag: string, action: TagAction) => void;
}

/** Artist tags that aren't a person. */
const NOT_ARTISTS = new Set(["conditional_dnp", "sound_warning", "epilepsy_warning", "avoid_posting", "third-party_edit"]);
const TAG_ORDER: TagCategoryName[] = ["copyright", "character", "species", "general", "lore", "meta"];
const RATING: Record<Post["rating"], { label: string; cls: string }> = {
  s: { label: "Safe", cls: "bg-emerald-500/15 text-emerald-300" },
  q: { label: "Questionable", cls: "bg-amber-500/15 text-amber-300" },
  e: { label: "Explicit", cls: "bg-red-500/15 text-red-300" },
};

function artists(post: Post): string[] {
  return (post.tags.artist ?? []).filter((t) => !NOT_ARTISTS.has(t));
}

function ago(iso: string, now: number): string {
  const sec = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(sec)) return "";
  const steps: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
  ];
  let v = sec;
  for (const [n, unit] of steps) {
    if (v < n) return `${Math.floor(v)}${unit}`;
    v /= n;
  }
  return `${Math.floor(v)}y`;
}

function compact(n: number): string {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

interface CardProps {
  post: Post;
  index: number;
  active: boolean;
  now: number;
  playback: PlaybackSettings;
  canFavorite: boolean;
  onFavorite: (post: Post) => void;
  onPlayFrom: (index: number) => void;
  hold: TagHold;
}

function FeedMedia({ post, active, playback, onDoubleTap }: { post: Post; active: boolean; playback: PlaybackSettings; onDoubleTap: () => void }) {
  const kind = mediaKind(post);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const { width, height } = post.files.original;
  const ratio = width > 0 && height > 0 ? `${width} / ${height}` : "1 / 1";
  const src = displayUrl(post, playback.quality);
  const preview = post.files.preview.jpg;

  // Only the post in view plays, like a timeline.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!active) {
      v.pause();
      return;
    }
    v.play().catch(() => {
      // Unmuted autoplay is blocked until the page has had a gesture: retry muted.
      if (!v.muted) {
        v.muted = true;
        void v.play().catch(() => {});
      }
    });
  }, [active]);

  return (
    <div
      className="relative flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-black"
      style={{ aspectRatio: ratio }}
      onDoubleClick={onDoubleTap}
      data-testid="feed-media"
    >
      {/* eslint-disable @next/next/no-img-element -- remote CDN media, no Next image optimization wanted */}
      {preview && !loaded && kind !== "video" && (
        <img src={preview} alt="" className="absolute inset-0 h-full w-full scale-105 object-contain blur-md" aria-hidden />
      )}
      {!src || failed ? (
        <div className="flex flex-col items-center gap-2 p-8 text-sm text-neutral-500">
          <ImageOff className="size-6" aria-hidden />
          {src ? "Couldn't load this post" : "Hidden from anonymous users"}
        </div>
      ) : kind === "video" ? (
        <video
          ref={video}
          src={src}
          poster={post.files.sample.jpg ?? undefined}
          className="h-full w-full object-contain"
          loop
          playsInline
          controls
          muted={playback.videoMuted}
          preload={active ? "auto" : "none"}
          onError={() => setFailed(true)}
          data-testid="feed-video"
        />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`relative h-full w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          data-testid="feed-image"
        />
      )}
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}

function FeedCard({ post, index, active, now, playback, canFavorite, onFavorite, onPlayFrom, hold }: CardProps) {
  const [burst, setBurst] = useState(0);
  const by = artists(post);
  const rating = RATING[post.rating];
  const faved = post.stats.is_favorited;
  const tags = TAG_ORDER.flatMap((c) => (post.tags[c] ?? []).map((t) => [c, t] as const));

  // Double-tap the media to favorite, the way timelines do; it never un-favorites.
  const doubleTap = () => {
    if (!canFavorite) return;
    setBurst((b) => b + 1);
    if (!faved) onFavorite(post);
  };

  return (
    <article
      className="scroll-mt-16 overflow-hidden border-line bg-panel sm:rounded-xl sm:border"
      aria-label={`Post #${post.id}`}
      aria-current={active || undefined}
      data-testid="feed-card"
      data-index={index}
      data-post-id={post.id}
    >
      <header className="flex items-center gap-3 px-3 py-2.5">
        {/* e621 has no artist pictures: a pattern drawn from the artist's name (or the post, if none). */}
        <Avatar seed={by[0] ?? `post:${post.id}`} className="size-10" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-semibold" style={{ color: by.length ? TAG_CATEGORY_COLORS.artist : undefined }}>
            {by.length ? by.map((a) => a.replaceAll("_", " ")).join(", ") : "unknown artist"}
          </p>
          <p className="truncate text-xs text-neutral-500">
            <a href={postPageUrl(post.id)} target="_blank" rel="noopener" className="hover:text-neutral-300 hover:underline">
              #{post.id}
            </a>
            <span className="px-1">·</span>
            <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>
              {ago(post.created_at, now)}
            </time>
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rating.cls}`}>{rating.label}</span>
      </header>

      <div className="relative">
        <FeedMedia post={post} active={active} playback={playback} onDoubleTap={doubleTap} />
        {burst > 0 && (
          <Heart
            key={burst}
            className="heart-burst pointer-events-none absolute left-1/2 top-1/2 size-24 fill-red-500 text-red-500 drop-shadow-lg"
            aria-hidden
          />
        )}
      </div>

      <div className="flex items-center gap-1 px-1.5 pt-1.5">
        {canFavorite ? (
          <button
            type="button"
            onClick={() => onFavorite(post)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm text-neutral-300 hover:bg-white/5"
            aria-label={faved ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={faved}
            data-testid="feed-favorite"
          >
            <Heart className={`size-5 ${faved ? "fill-red-500 text-red-500" : ""}`} aria-hidden />
            {compact(post.stats.fav_count)}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-2 text-sm text-neutral-400" title="Favorites">
            <Heart className="size-5" aria-hidden />
            {compact(post.stats.fav_count)}
          </span>
        )}
        <span className="px-2.5 py-2 text-sm text-neutral-400" title="Score on e621">
          ▲ {compact(post.stats.score.total)}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onPlayFrom(index)}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm text-neutral-300 hover:bg-white/5"
          data-testid="feed-play-from"
        >
          <Play className="size-4 fill-current" aria-hidden /> Play from here
        </button>
        <a
          href={postPageUrl(post.id)}
          target="_blank"
          rel="noopener"
          className="flex size-9 items-center justify-center rounded-full text-neutral-300 hover:bg-white/5"
          aria-label="Open on e621"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>

      <TagStrip tags={tags} hold={hold} />
    </article>
  );
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function Feed(props: FeedProps) {
  const { posts, currentIndex, loading, exhausted, error, stats, onNeedMore, onFavorite, onPlayFrom } = props;
  const sentinel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(currentIndex);
  const [now] = useState(() => Date.now());
  const hold = useTagHold(props.onTag);

  // Load more whenever the bottom comes within reach.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && onNeedMore(), {
      root: scroller.current,
      rootMargin: "1500px",
    });
    io.observe(el);
    return () => io.disconnect();
    // A new page can leave the sentinel still in view; re-observing re-fires it.
  }, [onNeedMore, posts.length]);

  // The post in view is the one crossing the middle of the screen.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root, rootMargin: "-50% 0px -50% 0px" },
    );
    root.querySelectorAll("[data-testid=feed-card]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [posts.length]);

  // Reopen exactly where the feed was left, else on the post the show is at (mount only).
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const top = props.savedScroll();
    if (top !== null) root.scrollTop = top;
    else root.querySelector<HTMLElement>(`[data-index="${currentIndex}"]`)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Report the place as it changes, so closing the feed (or reopening it) keeps it.
  const report = () => {
    const post = posts[active];
    if (post && scroller.current) props.onPlace(post.id, scroller.current.scrollTop);
  };
  const reportRef = useRef(report);
  useEffect(() => {
    reportRef.current = report;
  });
  useEffect(() => reportRef.current(), [active]);

  const scrollTo = (i: number) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
  };

  // J / K step a post at a time, L favorites the post in view.
  const keys = useRef({ active, posts, scrollTo, onFavorite, onPlayFrom, canFavorite: props.canFavorite });
  useEffect(() => {
    keys.current = { active, posts, scrollTo, onFavorite, onPlayFrom, canFavorite: props.canFavorite };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = keys.current;
      switch (e.key.toLowerCase()) {
        case "j":
          k.scrollTo(Math.min(k.active + 1, k.posts.length - 1));
          break;
        case "k":
          k.scrollTo(Math.max(k.active - 1, 0));
          break;
        case "l":
          if (k.canFavorite && k.posts[k.active]) k.onFavorite(k.posts[k.active]);
          break;
        case "enter":
          if (e.target === document.body && k.posts[k.active]) k.onPlayFrom(k.active);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={scroller}
      className="absolute inset-0 z-20 overflow-y-auto overscroll-contain bg-black"
      // Targets left open for a tap would drift off their tag as the feed moves.
      onScroll={() => {
        if (hold.held && !hold.held.dragging) hold.close();
        report();
      }}
      data-testid="feed"
    >
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="font-semibold" data-testid="feed-count">
            {posts.length}
            {exhausted ? "" : "+"} post{posts.length === 1 && exhausted ? "" : "s"}
          </p>
          {(stats.blacklisted > 0 || (stats.hidden > 0 && !props.signedIn)) && (
            <p className="truncate text-xs text-neutral-400">
              {[
                stats.blacklisted > 0 && `${stats.blacklisted} blacklisted`,
                stats.hidden > 0 && !props.signedIn && `${stats.hidden} hidden from anonymous users`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={props.onEditSearch}
          className="flex size-10 items-center justify-center rounded-md text-neutral-300 hover:bg-white/10"
          aria-label="Edit search"
          title="Edit search (S)"
          data-testid="feed-search"
        >
          <Search className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={props.onGrid}
          className="flex size-10 items-center justify-center rounded-md text-neutral-300 hover:bg-white/10"
          aria-label="Switch to grid"
          data-testid="feed-grid"
        >
          <LayoutGrid className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onPlayFrom(active)}
          disabled={posts.length === 0}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-black hover:bg-accent-strong disabled:opacity-40"
          data-testid="feed-play"
        >
          <Play className="size-4 fill-current" aria-hidden /> Play
        </button>
        <button
          type="button"
          onClick={props.onClose}
          className="flex size-10 items-center justify-center rounded-md text-neutral-300 hover:bg-white/10"
          aria-label="Close scroll view"
          data-testid="feed-close"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div className="mx-auto flex max-w-xl flex-col gap-3 py-3 sm:gap-5 sm:px-3 sm:py-5">
        {posts.map((p, i) => (
          <FeedCard
            key={p.id}
            post={p}
            index={i}
            active={i === active}
            now={now}
            playback={props.playback}
            canFavorite={props.canFavorite}
            onFavorite={onFavorite}
            onPlayFrom={onPlayFrom}
            hold={hold}
          />
        ))}
      </div>

      <div ref={sentinel} className="flex min-h-24 items-center justify-center p-6 text-sm text-neutral-400">
        {error ? (
          <div className="space-y-3 text-center">
            <p className="text-red-300">e621: {error}</p>
            <button type="button" className="rounded-md bg-accent px-4 py-2 font-semibold text-black" onClick={props.onRetry}>
              Retry
            </button>
          </div>
        ) : loading && posts.length === 0 && props.loader ? (
          <div className="flex min-h-[60vh] items-center justify-center">{props.loader}</div>
        ) : loading ? (
          <InlineLoader label="Loading more…" />
        ) : exhausted && posts.length === 0 ? (
          <p className="text-lg text-neutral-300" data-testid="feed-empty">
            No posts found.
          </p>
        ) : exhausted ? (
          <p>You&apos;re all caught up</p>
        ) : null}
      </div>

      <TagActionsOverlay hold={hold} recommended={props.recommended} onAction={props.onTag} />
    </div>
  );
}
