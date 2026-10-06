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
}

function Media({ post, playback, onReady, onError, still }: MediaProps) {
  const [loaded, setLoaded] = useState(false);
  const kind = mediaKind(post);
  const fade = playback.transition === "fade" && !still;
  // Videos stay visible from the start: their poster frame shows while buffering.
  const visible = loaded || !fade || kind === "video";
  const style = { opacity: visible ? 1 : 0, transition: fade ? "opacity 400ms ease" : undefined };
  const cls = `${FIT_CLASS[playback.fit]} select-none`;

  if (kind === "video" && !still) {
    return (
      <video
        key={post.id}
        src={displayUrl(post, playback.quality) ?? undefined}
        poster={post.sample.url ?? undefined}
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
          onReady?.(Number.isFinite(d) ? d : (post.duration ?? undefined));
        }}
        onError={onError}
      />
    );
  }

  // The outgoing layer of a video shows its poster frame rather than replaying it.
  const src = kind === "video" ? post.sample.url : displayUrl(post, playback.quality);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote CDN media, no Next image optimization wanted
    <img
      src={src}
      alt=""
      draggable={false}
      className={cls}
      style={style}
      data-testid={still ? undefined : "slide-image"}
      data-post-id={still ? undefined : post.id}
      onLoad={() => {
        setLoaded(true);
        onReady?.();
      }}
      onError={onError}
    />
  );
}

interface StageProps {
  post: Post;
  previous: Post | null;
  playback: PlaybackSettings;
  onReady: (postId: number, durationSec?: number) => void;
  onError: (postId: number) => void;
  /** The current media has loaded; the outgoing layer fades out to black. */
  currentReady: boolean;
}

export default function Stage({ post, previous, playback, onReady, onError, currentReady }: StageProps) {
  // `m-auto` on 1:1 media centers it without clipping the left/top when it overflows.
  const layer =
    playback.fit === "original"
      ? "absolute inset-0 flex overflow-auto"
      : "absolute inset-0 flex items-center justify-center overflow-hidden";
  return (
    <div className="absolute inset-0 bg-black">
      {previous && previous.id !== post.id && playback.transition === "fade" && (
        // Keyed so each outgoing post mounts fully opaque, then fades out once the
        // new one is ready. Left visible, it would show around a narrower image.
        <div
          key={`prev-${previous.id}`}
          className={layer}
          style={{ opacity: currentReady ? 0 : 1, transition: "opacity 400ms ease" }}
          aria-hidden
          data-testid="previous-layer"
        >
          <Media post={previous} playback={playback} still />
        </div>
      )}
      <div className={layer}>
        <Media
          key={post.id}
          post={post}
          playback={playback}
          onReady={(d) => onReady(post.id, d)}
          onError={() => onError(post.id)}
        />
      </div>
    </div>
  );
}
