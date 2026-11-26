"use client";

import { useMemo } from "react";
import type { Overrides } from "@/lib/recommend/weights";
import type { Profile } from "@/lib/recommend/profile";
import type { Step } from "@/lib/progress";
import { getRec, learnedOf, signatureOf, weightsOf } from "@/state/rec";
import { useStore } from "@/state/store";

export interface Recommendations {
  profile: Profile | null;
  weights: Map<string, number>;
  /** learned tag weights (model.ts) for ranking; null until fit, or where IndexedDB is missing */
  learned: Map<string, number> | null;
  overrides: Overrides;
  syncing: boolean;
  /** what a running sync is doing, and how far along it is */
  step: Step | null;
  error: string | null;
  /** changes whenever ranking inputs do, so a running show knows it's stale */
  signature: string;
  rebuild: () => void;
  togglePin: (tag: string) => void;
  toggleMute: (tag: string) => void;
}

/**
 * The legacy home's view of the favorites profile. The profile itself lives in the `rec` store
 * (src/state/rec.ts), which follows the session (never a borrowed sign-in), so the home and For You
 * share one sync.
 */
export function useRecommendations(): Recommendations {
  const rec = getRec();
  const s = useStore(rec.store, (x) => x);
  const weights = useMemo(() => weightsOf(s), [s.profile, s.cache, s.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  const learned = useMemo(() => learnedOf(s), [s.profile, s.fit, s.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    profile: s.profile,
    weights,
    learned,
    overrides: s.overrides,
    syncing: s.syncing,
    step: s.step,
    error: s.error,
    signature: signatureOf(s),
    rebuild: rec.rebuild,
    togglePin: rec.togglePin,
    toggleMute: rec.toggleMute,
  };
}
