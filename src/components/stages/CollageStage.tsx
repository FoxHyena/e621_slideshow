"use client";

import { useState } from "react";
import { aspectOf, collageLayout, emptySlots, placeInSlots } from "@/lib/slideshow/layout";
import { Media } from "../Media";
import type { StageProps } from "../Stage";
import { useViewportAspect } from "./useViewportAspect";

/**
 * The last three posts as tiles. Each new post takes the oldest tile's slot,
 * and the tiles re-flow (animated) into whichever layout shows the most image.
 */
export default function CollageStage({ post, trail, playback, onReady, onError, currentReady }: StageProps) {
  const vp = useViewportAspect();
  // Derived from the post sequence, so it lives here rather than in App.
  const [slots, setSlots] = useState(() => placeInSlots(emptySlots(), post));
  // An empty trail means a fresh show: don't keep tiles from the last search.
  const stale = trail.length === 0 && slots.posts.some((p) => p && p.id !== post.id);
  const placed = placeInSlots(stale ? emptySlots() : slots, post);
  if (placed !== slots) setSlots(placed);

  const tiles = placed.posts.flatMap((p, slot) => (p ? [{ p, slot }] : []));
  const featured = tiles.findIndex((t) => t.p.id === post.id);
  const { rects } = collageLayout(
    tiles.map((t) => aspectOf(t.p)),
    featured,
    vp,
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0b0b]" data-testid="collage-stage">
      {tiles.map(({ p }, i) => {
        const front = p.id === post.id;
        const r = rects[i];
        return (
          <div
            key={`tile-${p.id}`}
            className="collage-tile absolute flex items-center justify-center overflow-hidden"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
              opacity: front && !currentReady ? 0 : 1,
            }}
            aria-hidden={!front}
            data-testid={front ? undefined : "collage-tile"}
            data-post-id={front ? undefined : p.id}
          >
            <Media
              post={p}
              playback={playback}
              still={!front}
              fade={false}
              className="h-full w-full object-contain"
              onReady={front ? (d) => onReady(p.id, d) : undefined}
              onError={front ? () => onError(p.id) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
