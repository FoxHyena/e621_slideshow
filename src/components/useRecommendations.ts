"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getFavorites, getTags, getUser, newestPostId, type Credentials } from "@/lib/e621/client";
import type { CurrentUser } from "@/lib/e621/types";
import type { Profile } from "@/lib/recommend/profile";
import { countsOf, refreshTagCache, syncProfile, tagsToLookUp, type RecApi, type TagCache } from "@/lib/recommend/sync";
import { computeWeights, NO_OVERRIDES, type Overrides } from "@/lib/recommend/weights";
import { storage } from "@/lib/storage";

export interface Recommendations {
  profile: Profile | null;
  weights: Map<string, number>;
  overrides: Overrides;
  syncing: boolean;
  /** what a running sync is doing, for the status line */
  progress: string | null;
  error: string | null;
  /** changes whenever ranking inputs do, so a running show knows it's stale */
  signature: string;
  rebuild: () => void;
  togglePin: (tag: string) => void;
  toggleMute: (tag: string) => void;
}

function recApi(userId: number, creds: Credentials): RecApi {
  return {
    favoriteCount: async () => (await getUser(userId, creds)).favorite_count ?? 0,
    favorites: (page, limit) => getFavorites(userId, page, limit, creds),
    tagCounts: (names) => getTags(names, creds),
    newestPostId: () => newestPostId(creds),
  };
}

const without = (list: string[], tag: string) => list.filter((t) => t !== tag);

/**
 * The signed-in user's favorites profile, kept in sync in the background:
 * loaded from storage at once, then refreshed (incrementally) on sign-in,
 * page load, and Rebuild.
 */
export function useRecommendations(
  creds: Credentials | null,
  user: CurrentUser | null,
  onWarn: (msg: string) => void,
): Recommendations {
  const name = user?.id != null ? user.name : null;
  const userId = user?.id ?? null;

  const stored = useMemo(() => (name ? storage.loadProfile(name) : null), [name]);
  const [synced, setSynced] = useState<Profile | null>(null);
  const profile = name && synced?.username === name ? synced : stored;

  const [cache, setCache] = useState<TagCache>(storage.loadTagCache);

  const storedOverrides = useMemo(() => (name ? storage.loadOverrides(name) : null), [name]);
  const [edited, setEdited] = useState<{ name: string; o: Overrides } | null>(null);
  const overrides = (edited?.name === name ? edited?.o : storedOverrides) ?? NO_OVERRIDES;

  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const fullRebuild = useRef(false);
  const warn = useRef(onWarn);
  useEffect(() => {
    warn.current = onWarn;
  });

  useEffect(() => {
    if (!name || userId === null || !creds) return;
    let cancelled = false;
    const api = recApi(userId, creds);
    const onProgress = (msg: string) => {
      if (!cancelled) setProgress(msg);
    };
    const start = fullRebuild.current ? null : storage.loadProfile(name);
    fullRebuild.current = false;

    void (async () => {
      setSyncing(true);
      setError(null);
      try {
        const p = await syncProfile(start, name, api, Date.now(), onProgress);
        if (cancelled) return;
        setSynced(p);
        if (!storage.saveProfile(p)) {
          warn.current("Favorites profile is too big to save on this device; it will be rebuilt next visit");
        }
        const c = await refreshTagCache(storage.loadTagCache(), tagsToLookUp(p), api, Date.now(), onProgress);
        if (cancelled) return;
        setCache(c);
        storage.saveTagCache(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) {
          setSyncing(false);
          setProgress(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, userId, creds, run]);

  const weights = useMemo(
    () => (profile ? computeWeights(profile, countsOf(cache), cache.site?.n ?? 0, overrides) : new Map<string, number>()),
    [profile, cache, overrides],
  );

  const setOverrides = (o: Overrides) => {
    if (!name) return;
    setEdited({ name, o });
    storage.saveOverrides(name, o);
  };

  return {
    profile,
    weights,
    overrides,
    syncing,
    progress,
    error,
    signature: JSON.stringify([profile?.favIds.length ?? 0, profile?.favIds[0] ?? null, overrides]),
    rebuild: () => {
      fullRebuild.current = true;
      setRun((r) => r + 1);
    },
    togglePin: (tag) =>
      setOverrides({
        pinned: overrides.pinned.includes(tag) ? without(overrides.pinned, tag) : [...overrides.pinned, tag],
        muted: without(overrides.muted, tag),
      }),
    toggleMute: (tag) =>
      setOverrides({
        pinned: without(overrides.pinned, tag),
        muted: overrides.muted.includes(tag) ? without(overrides.muted, tag) : [...overrides.muted, tag],
      }),
  };
}
