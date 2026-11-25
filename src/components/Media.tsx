"use client";

import { useState } from "react";
import { mediaKind, type Post } from "@/lib/e621/types";
import { displayUrl } from "@/lib/slideshow/media";
import type { PlaybackSettings } from "@/lib/settings";

const FIT_CLASS: Record<PlaybackSettings["fit"], string> = {
  contain: "h-full w-full object-contain",
  cover: "h-full w-full object-cover",
  original: "m-auto max-w-none shrink-0",
};

interface MediaProps {
  post: Post;
  playback: PlaybackSettings;
  /** Called once the media can be shown; `durationSec` for videos. */
  onReady?: (durationSec?: number) => void;
  onError?: () => void;
  /** Static rendering for the outgoing layer of a crossfade. */
  still?: boolean;
  /** Replaces the fit classes; styles that size their own frame pass this. */
  className?: string;
  /** Overrides the fade-in that `playback.transition` would pick. */
  fade?: boolean;
  /** Test id override, e.g. for background copies that are not the slide. */
  testId?: string;
}

export function Media({ post, playback, onReady, onError, still, className, fade: fadeIn, testId }: MediaProps) {
  const [loaded, setLoaded] = useState(false);
  const kind = mediaKind(post);
  const fade = (fadeIn ?? playback.transition === "fade") && !still;
  // Videos stay visible from the start: their poster frame shows while buffering.
  const visible = loaded || !fade || kind === "video";
  const style = { opacity: visible ? 1 : 0, transition: fade ? "opacity 400ms ease" : undefined };
  const cls = `${className ?? FIT_CLASS[playback.fit]} select-none`;

  if (kind === "video" && !still) {
    return (
      <video
        key={post.id}
        src={displayUrl(post, playback.quality) ?? undefined}
        poster={post.files.sample.jpg ?? undefined}
        className={cls}
        style={style}
        autoPlay
        loop
        playsInline
        muted={playback.videoMuted}
        data-testid="slide-video"
        data-post-id={post.id}
        // Metadata is enough to know the duration and start the slide timer;
        // waiting for decoded frames would stall the show on a slow buffer.
        onLoadedMetadata={(e) => {
          setLoaded(true);
          const d = e.currentTarget.duration;
          onReady?.(Number.isFinite(d) ? d : (post.files.meta.duration ?? undefined));
        }}
        onError={onError}
      />
    );
  }

  // The outgoing layer of a video shows its poster frame rather than replaying it.
  const src = kind === "video" ? post.files.sample.jpg : displayUrl(post, playback.quality);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote CDN media, no Next image optimization wanted
    <img
      src={src}
      alt=""
      draggable={false}
      className={cls}
      style={style}
      data-testid={testId ?? (still ? undefined : "slide-image")}
      data-post-id={testId || !still ? post.id : undefined}
      onLoad={() => {
        setLoaded(true);
        onReady?.();
      }}
      onError={onError}
    />
  );
}

