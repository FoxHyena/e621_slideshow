/**
 * On a share link the link's playback is what plays (UX §5 "Share"). Quick settings can change it for
 * this visit only, or save the change as your own default; this holds the visit's changes, by the
 * link screen's history key, until the page goes away.
 */
import type { PlaybackSettings } from "@/lib/settings";
import { createStore } from "@/state/store";

export type VisitTarget = "visit" | "default";

export const visitPlayback = createStore<Record<string, Partial<PlaybackSettings>>>({});
/** where Quick settings' changes go, per link screen (This visit only is the default) */
export const visitTarget = createStore<Record<string, VisitTarget>>({});

export function setVisitPlayback(key: string, patch: Partial<PlaybackSettings>): void {
  visitPlayback.set((all) => ({ ...all, [key]: { ...all[key], ...patch } }));
}
