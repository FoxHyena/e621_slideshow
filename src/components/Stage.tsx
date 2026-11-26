"use client";

import type { Post } from "@/lib/e621/types";
import type { PlaybackSettings } from "@/lib/settings";
import ClassicStage from "./stages/ClassicStage";
import CollageStage from "./stages/CollageStage";
import KenBurnsStage from "./stages/KenBurnsStage";
import PrintsStage from "./stages/PrintsStage";
import ReflectionsStage from "./stages/ReflectionsStage";

export interface StageProps {
  post: Post;
  /** Posts shown before this one, newest first. */
  trail: Post[];
  /** The next posts in the queue, nearest first. */
  upcoming: Post[];
  playback: PlaybackSettings;
  onReady: (postId: number, durationSec?: number) => void;
  onError: (postId: number) => void;
  /** The current media has loaded; the outgoing layer fades out to black. */
  currentReady: boolean;
  /** How long this slide stays up, for styles that animate across it. */
  durationMs: number;
  /** The slide timer is counting; motion pauses with it. */
  running: boolean;
  /**
   * The post on screen before this one, which the styles fade or slide out. Defaults to `trail[0]`,
   * which is only right going forward: going back (←) it's the post you left, not the one before.
   */
  leaving?: Post | null;
  /** This slide came from going back (←): styles that slide, slide the other way. */
  back?: boolean;
}

/** The post leaving the screen as this one comes on (see `leaving`). */
export function leavingOf(p: Pick<StageProps, "leaving" | "trail">): Post | null {
  return p.leaving === undefined ? (p.trail[0] ?? null) : p.leaving;
}

export default function Stage(props: StageProps) {
  switch (props.playback.style) {
    case "prints":
      return <PrintsStage {...props} />;
    case "kenburns":
      return <KenBurnsStage {...props} />;
    case "collage":
      return <CollageStage {...props} />;
    case "reflections":
      return <ReflectionsStage {...props} />;
    default:
      return <ClassicStage {...props} />;
  }
}
