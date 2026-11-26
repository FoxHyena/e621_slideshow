"use client";

import { aspectOf } from "@/lib/slideshow/layout";
import type { Post } from "@/lib/e621/types";
import { Media } from "../Media";
import { leavingOf, type StageProps } from "../Stage";

/** The post standing on a black floor, slides entering from the right. */
export default function ReflectionsStage(props: StageProps) {
  const { post, playback, onReady, onError, currentReady, back } = props;
  const previous = leavingOf(props);
  // forward: in from the right, out to the left; back (←) the other way
  const side = back ? -110 : 110;
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" data-testid="reflections-stage">
      <div className="reflections-floor pointer-events-none absolute inset-x-0 bottom-0 h-[38%]" />
      {previous && previous.id !== post.id && (
        <Plate
          key={`prev-${previous.id}`}
          post={previous}
          offset={currentReady ? -side : 0}
          playback={playback}
          still
          testId="previous-layer"
        />
      )}
      <Plate
        key={post.id}
        post={post}
        offset={currentReady ? 0 : side}
        playback={playback}
        onReady={(d) => onReady(post.id, d)}
        onError={() => onError(post.id)}
      />
    </div>
  );
}

function Plate({
  post,
  offset,
  playback,
  still,
  onReady,
  onError,
  testId,
}: {
  post: Post;
  /** Horizontal position in vw; the transition does the sliding. */
  offset: number;
  playback: StageProps["playback"];
  still?: boolean;
  onReady?: (durationSec?: number) => void;
  onError?: () => void;
  testId?: string;
}) {
  const a = aspectOf(post);
  // Image above the horizon at ~62% height, its mirror below.
  const size = { width: `min(84vw, ${50 * a}vh)`, aspectRatio: a };
  return (
    <div
      className="reflections-plate absolute inset-x-0 top-[62%] flex justify-center"
      style={{ transform: `translateX(${offset}vw)` }}
      aria-hidden={still}
      data-testid={testId}
    >
      <div className="absolute bottom-0" style={size}>
        <Media
          post={post}
          playback={playback}
          still={still}
          fade={false}
          className="h-full w-full object-contain"
          onReady={onReady}
          onError={onError}
        />
      </div>
      {/* The mirror is always a still: a second decoder for the same video costs more than it shows. */}
      <div className="reflections-mirror absolute top-0" style={size} aria-hidden>
        <Media post={post} playback={playback} still fade={false} className="h-full w-full object-contain" testId="reflection" />
      </div>
    </div>
  );
}
