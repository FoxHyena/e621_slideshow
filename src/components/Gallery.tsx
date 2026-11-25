"use client";

import { useEffect, useRef, useState } from "react";
import { GalleryVerticalEnd, ImageOff, Loader2, Play, X } from "lucide-react";
import { mediaKind, type Post } from "@/lib/e621/types";
import type { QueueStats } from "@/lib/slideshow/queue";

interface GalleryProps {
  posts: Post[];
  currentIndex: number;
  loading: boolean;
  exhausted: boolean;
  error: string | null;
  stats: QueueStats;
  signedIn: boolean;
  /** Start the show at this index. */
  onPick: (index: number) => void;
  /** The end of the grid is near: load more. */
  onNeedMore: () => void;
  onRetry: () => void;
  onClose: () => void;
  /** Switch to the scrolling feed. */
  onFeed: () => void;
  onPlay: () => void;
}

function formatDuration(sec: number) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Tile({ post, index, current, onPick }: { post: Post; index: number; current: boolean; onPick: (i: number) => void }) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const [sampleState, setSampleState] = useState<"loading" | "loaded" | "failed">("loading");
  const kind = mediaKind(post);
  // The tiny preview shows at once; the sharper sample (a static JPG for GIFs and
  // videos too) fades in over it. A screenful of samples is several MB and queues
  // on the CDN, so without the preview, slow tiles sit blank.
  const preview = previewFailed ? null : post.files.preview.jpg;
  const sample = sampleState === "failed" || post.files.sample.jpg === post.files.preview.jpg ? null : post.files.sample.jpg;
  return (
    <button
      type="button"
      onClick={() => onPick(index)}
      className={`relative aspect-square overflow-hidden bg-panel-2 focus-visible:outline-2 focus-visible:outline-accent ${
        current ? "ring-2 ring-accent ring-inset" : ""
      }`}
      aria-label={`Post #${post.id}`}
      aria-current={current || undefined}
      data-testid="gallery-tile"
      data-post-id={post.id}
    >
      {/* eslint-disable @next/next/no-img-element -- remote CDN thumbnails, no Next image optimization wanted */}
      {preview && (
        <img
          src={preview}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setPreviewFailed(true)}
          data-testid="tile-preview"
        />
      )}
      {sample && (
        <img
          src={sample}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            sampleState === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setSampleState("loaded")}
          onError={() => setSampleState("failed")}
          data-testid="tile-sample"
        />
      )}
      {/* eslint-enable @next/next/no-img-element */}
      {!preview && !sample && <ImageOff className="absolute inset-0 m-auto size-6 text-neutral-600" aria-hidden />}
      {(kind === "video" || kind === "gif") && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
          {kind === "video" ? `VIDEO${post.files.meta.duration ? ` ${formatDuration(post.files.meta.duration)}` : ""}` : "GIF"}
        </span>
      )}
    </button>
  );
}

export default function Gallery(props: GalleryProps) {
  const { posts, currentIndex, loading, exhausted, error, stats, onPick, onNeedMore } = props;
  const sentinel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Load more whenever the bottom comes within reach.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && onNeedMore(), {
      root: scroller.current,
      rootMargin: "800px",
    });
    io.observe(el);
    return () => io.disconnect();
    // A new page can leave the sentinel still in view; re-observing re-fires it.
  }, [onNeedMore, posts.length]);

  // Open on the post the show is at (mount only).
  useEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>("[aria-current]")
      ?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div ref={scroller} className="absolute inset-0 z-20 overflow-y-auto bg-black" data-testid="gallery">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="font-semibold" data-testid="gallery-count">
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
          onClick={props.onFeed}
          className="flex size-10 items-center justify-center rounded-md text-neutral-300 hover:bg-white/10"
          aria-label="Switch to scroll view"
          data-testid="gallery-feed"
        >
          <GalleryVerticalEnd className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={props.onPlay}
          disabled={posts.length === 0}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-black hover:bg-accent-strong disabled:opacity-40"
          data-testid="gallery-play"
        >
          <Play className="size-4 fill-current" aria-hidden /> Play
        </button>
        <button
          type="button"
          onClick={props.onClose}
          className="flex size-10 items-center justify-center rounded-md text-neutral-300 hover:bg-white/10"
          aria-label="Close gallery"
          data-testid="gallery-close"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 p-1">
        {posts.map((p, i) => (
          <Tile key={p.id} post={p} index={i} current={i === currentIndex} onPick={onPick} />
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
        ) : loading ? (
          <Loader2 className="size-8 animate-spin text-neutral-500" aria-label="Loading" />
        ) : exhausted && posts.length === 0 ? (
          <p className="text-lg text-neutral-300" data-testid="gallery-empty">
            No posts found.
          </p>
        ) : exhausted ? (
          <p>End of results</p>
        ) : null}
      </div>
    </div>
  );
}
