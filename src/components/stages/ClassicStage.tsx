"use client";

import { Media } from "../Media";
import { leavingOf, type StageProps } from "../Stage";

/** Full screen, honouring the Fit and Transition settings. */
export default function ClassicStage(props: StageProps) {
  const { post, playback, onReady, onError, currentReady } = props;
  const previous = leavingOf(props);
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
