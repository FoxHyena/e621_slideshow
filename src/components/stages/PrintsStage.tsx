"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Post } from "@/lib/e621/types";
import { aspectOf, focusPrint, rand, sceneDrift, stackLayout, type Drift } from "@/lib/slideshow/layout";
import { Media } from "../Media";
import type { StageProps } from "../Stage";
import { useViewportAspect } from "./useViewportAspect";

const STACK = 6;
const FADE_MS = 700;

interface Scene {
  post: Post;
  /** Grey prints under the focus one, bottom to top. Picked once so they never reshuffle. */
  bg: Post[];
  /** Drift length, frozen when the scene starts. */
  driftMs: number;
  /** Counts scenes, for the layer's key: ← back to the post fading out is a new scene, not that layer
      (reused, its picture had loaded already and never said ready again, so the show stuck on the
      post you left). */
  n: number;
}

const drift = (d: Drift) => `translate(${d.x}%, ${d.y}%) rotate(${d.rotate}deg) scale(${d.scale})`;

/** The heap comes from recent and upcoming posts, so it is full from the first slide. */
function pickBackground(post: Post, trail: Post[], upcoming: Post[]): Post[] {
  const skip = new Set([post.id]);
  const pool: Post[] = [];
  for (const p of [...trail.slice(0, 6), ...upcoming.slice(1, 12)]) {
    if (skip.has(p.id) || !(p.files.sample.jpg ?? p.files.preview.jpg)) continue;
    skip.add(p.id);
    pool.push(p);
  }
  pool.sort((a, b) => rand(post.id ^ a.id, 41) - rand(post.id ^ b.id, 41));
  const from = pool.length > 0 ? pool : [post];
  return Array.from({ length: STACK }, (_, i) => from[i % from.length]);
}

/**
 * Apple's "Vintage Prints": the current post as a colour print on top of a
 * heap of big grey prints, the whole scene drifting slowly. Every slide is a
 * scene; between them the screen dips to black.
 */
export default function PrintsStage(props: StageProps) {
  const { post, trail, upcoming, durationMs } = props;
  const vp = useViewportAspect();

  const build = (n: number): Scene => ({ post, bg: pickBackground(post, trail, upcoming), driftMs: durationMs, n });
  const [state, setState] = useState(() => ({ cur: build(0), prev: null as Scene | null }));
  let view = state;
  if (state.cur.post.id !== post.id) {
    view = { cur: build(state.cur.n + 1), prev: state.cur };
    setState(view);
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" data-testid="prints-stage">
      {view.prev && <SceneLayer key={`scene-${view.prev.n}`} scene={view.prev} vp={vp} props={props} outgoing />}
      <SceneLayer key={`scene-${view.cur.n}`} scene={view.cur} vp={vp} props={props} afterDip={!!view.prev} />
    </div>
  );
}

function SceneLayer({
  scene,
  vp,
  props,
  outgoing,
  afterDip,
}: {
  scene: Scene;
  vp: number;
  props: StageProps;
  outgoing?: boolean;
  /** Fade up only once the outgoing scene has gone to black. */
  afterDip?: boolean;
}) {
  const { playback, onReady, onError, currentReady, running } = props;
  const { post } = scene;
  const id = post.id;
  const d = sceneDrift(id);
  const stack = stackLayout(id, scene.bg.map(aspectOf), vp);
  const focus = focusPrint(id, aspectOf(post), vp);
  // The scene appears whole, focus print included, once its media is ready.
  const visible = outgoing ? !currentReady : currentReady;
  const style = {
    opacity: visible ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease ${afterDip && visible ? FADE_MS : 0}ms`,
  };
  const driftStyle = {
    "--drift-from": drift(d.from),
    "--drift-to": drift(d.to),
    animationDuration: `${scene.driftMs}ms`,
    animationPlayState: running && !outgoing ? "running" : "paused",
  } as CSSProperties;

  return (
    <div className="absolute inset-0" style={style} aria-hidden={outgoing} data-testid="prints-scene" data-scene-id={id}>
      <div className="prints-drift prints-base absolute inset-0" style={driftStyle}>
        {scene.bg.map((p, i) => {
          const s = stack[i];
          return (
            <Frame key={i} {...s} aspect={aspectOf(p)} className="prints-bg" testId="prints-bg" postId={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN media */}
              <img src={p.files.sample.jpg ?? p.files.preview.jpg ?? undefined} alt="" draggable={false} className="h-full w-full object-cover select-none" />
            </Frame>
          );
        })}
        <div className="prints-vignette pointer-events-none absolute inset-0" />
        <Frame x={0.5} y={0.5} {...focus} aspect={aspectOf(post)} testId="print" postId={id}>
          <Media
            post={post}
            playback={playback}
            still={outgoing}
            fade={false}
            className="h-full w-full object-cover"
            onReady={outgoing ? undefined : (dur) => onReady(id, dur)}
            onError={outgoing ? undefined : () => onError(id)}
          />
        </Frame>
      </div>
    </div>
  );
}

/** A white-bordered print centred at (x, y) in screen fractions, `h` of the screen tall. */
function Frame({
  x,
  y,
  h,
  rotate,
  aspect,
  className = "",
  testId,
  postId,
  children,
}: {
  x: number;
  y: number;
  h: number;
  rotate: number;
  aspect: number;
  className?: string;
  testId: string;
  postId: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`print absolute bg-[#f3efe6] p-[1.2vmin] ${className}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
      data-testid={testId}
      data-post-id={postId}
    >
      {/* Sized from the post, so the frame doesn't jump when the media loads. */}
      <div className="relative overflow-hidden bg-neutral-800" style={{ height: `${h * 100}vh`, aspectRatio: aspect }}>
        {children}
      </div>
    </div>
  );
}
