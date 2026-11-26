"use client";

import type { CSSProperties } from "react";
import { mediaKind } from "@/lib/e621/types";
import { kenBurns, type KenBurns } from "@/lib/slideshow/layout";
import { Media } from "../Media";
import { leavingOf, type StageProps } from "../Stage";

const pose = (p: KenBurns["from"]) => `translate(${p.x}%, ${p.y}%) scale(${p.scale})`;

/**
 * Full-bleed slow pan and zoom across the slide's whole duration. Videos sit
 * still: moving a moving picture just reads as camera shake.
 */
export default function KenBurnsStage(props: StageProps) {
  const { post, playback, onReady, onError, currentReady, durationMs, running } = props;
  const previous = leavingOf(props);
  const motion = mediaKind(post) !== "video";
  const kb = kenBurns(post.id);
  const vars = { "--kb-from": pose(kb.from), "--kb-to": pose(kb.to) } as CSSProperties;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" data-testid="kenburns-stage">
      {previous && previous.id !== post.id && (
        // Frozen where its pan ended, fading out over the new slide's start.
        <div
          key={`prev-${previous.id}`}
          className="absolute inset-0"
          style={{
            opacity: currentReady ? 0 : 1,
            transition: "opacity 1200ms ease",
            transform: mediaKind(previous) === "video" ? undefined : pose(kenBurns(previous.id).to),
          }}
          aria-hidden
          data-testid="previous-layer"
        >
          <Media post={previous} playback={playback} still className="h-full w-full object-cover" />
        </div>
      )}
      <div
        key={post.id}
        className={`absolute inset-0 ${motion ? "kenburns" : ""}`}
        style={{
          ...vars,
          opacity: currentReady ? 1 : 0,
          transition: "opacity 1200ms ease",
          animationDuration: `${durationMs}ms`,
          animationPlayState: running ? "running" : "paused",
        }}
      >
        <Media
          post={post}
          playback={playback}
          fade={false}
          className="h-full w-full object-cover"
          onReady={(d) => onReady(post.id, d)}
          onError={() => onError(post.id)}
        />
      </div>
    </div>
  );
}
