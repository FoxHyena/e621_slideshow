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
