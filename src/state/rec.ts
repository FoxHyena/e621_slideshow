/**
 * The favorites profile behind For You (ENGINEERING.md §2 `rec`): read once per sign-in, kept in sync
 * in the background, shared by For You, Tune and the interim home. Loaded from storage at once, then
 * refreshed incrementally on sign-in, page load and Rebuild.
 *
 * A borrowed sign-in (a share link's) never reads or stores the sharer's profile.
 */
import { bigStorage } from "@/lib/bigStorage";
import { getFavorites, getTags, getUser, newestPostId, searchPosts, type Credentials } from "@/lib/e621/client";
import type { CurrentUser, Post } from "@/lib/e621/types";
import { stamp, type Step } from "@/lib/progress";
import {
  covers,
  favKey,
  fitLearned,
  mergeFeatures,
  refreshNegatives,
  withOverrides,
  type FavFeatures,
  type Learned,
  type Negatives,
} from "@/lib/recommend/model";
import type { Profile } from "@/lib/recommend/profile";
import { countsOf, refreshTagCache, syncProfile, tagsToLookUp, type RecApi, type TagCache } from "@/lib/recommend/sync";
import { computeWeights, NO_OVERRIDES, type Overrides } from "@/lib/recommend/weights";
import { storage } from "@/lib/storage";
import { toast } from "sonner";
import { getSession } from "./session";
import { createStore, type Store } from "./store";

export interface RecState {
  /** whose profile this is; null when signed out or on a borrowed sign-in */
  name: string | null;
  profile: Profile | null;
  cache: TagCache;
  /** the last learned fit (model.ts); only used while it matches the profile */
  fit: Learned | null;
  overrides: Overrides;
  syncing: boolean;
  /** what a running sync is doing, and how far along it is */
  step: Step | null;
  error: string | null;
  /** last session's learned fit has been looked for, so ranking inputs won't shift on their own */
  loaded: boolean;
}

export interface Rec {
  store: Store<RecState>;
  setAccount(creds: Credentials | null, user: CurrentUser | null): void;
  /** Re-read every favorite from scratch. */
  rebuild(): void;
  togglePin(tag: string): void;
  toggleMute(tag: string): void;
}

function recApi(userId: number, creds: Credentials): RecApi {
  return {
    // The favorites sync runs behind whatever is on screen.
    favoriteCount: async () => (await getUser(userId, creds, "bg")).favorite_count ?? 0,
    favorites: (page, limit) => getFavorites(userId, page, limit, creds, "bg"),
    tagCounts: (names) => getTags(names, creds, "bg"),
    newestPostId: () => newestPostId(creds, "bg"),
  };
}

const featKey = (name: string) => `favFeatures:${name}`;
const learnedKey = (name: string) => `learned:${name}`;
const NEG_KEY = "negatives";
/** How long For You waits for last session's fit before ranking without it. */
const FIT_WAIT_MS = 3000;
const without = (list: string[], tag: string) => list.filter((t) => t !== tag);

/** Tag weights for ranking and the candidate search (weights.ts). */
export function weightsOf(s: RecState): Map<string, number> {
  return s.profile ? computeWeights(s.profile, countsOf(s.cache), s.cache.site?.n ?? 0, s.overrides) : new Map();
}

/** The learned weights with pins and mutes applied, when the fit matches this exact profile. */
export function learnedOf(s: RecState): Map<string, number> | null {
  return s.profile && s.fit?.favKey === favKey(s.profile) ? withOverrides(s.fit, s.overrides) : null;
}

/** Changes whenever ranking inputs do, so a ranked list knows it's stale. */
export function signatureOf(s: RecState): string {
  const fit = s.profile && s.fit?.favKey === favKey(s.profile) ? s.fit : null;
  return JSON.stringify([s.profile?.favIds.length ?? 0, s.profile?.favIds[0] ?? null, s.overrides, fit?.negAt ?? null]);
}

export function createRec(warn: (msg: string) => void, now: () => number = Date.now): Rec {
  const store = createStore<RecState>({
    name: null,
    profile: null,
    cache: storage.loadTagCache(),
    fit: null,
    overrides: NO_OVERRIDES,
    syncing: false,
    step: null,
    error: null,
    loaded: true,
  });
  const patch = (p: Partial<RecState>) => store.set((s) => ({ ...s, ...p }));
  let account: { key: string; userId: number; name: string; creds: Credentials } | null = null;
  let cancel: (() => void) | null = null;

  function sync(full: boolean) {
    cancel?.();
    cancel = null;
    const a = account;
    if (!a) return;
    let cancelled = false;
    cancel = () => {
      cancelled = true;
    };
    const { name, creds } = a;
    const api = recApi(a.userId, creds);
    const onProgress = (next: Step) => {
      if (!cancelled) store.set((s) => ({ ...s, step: stamp(s.step, next, now()) }));
    };
    void (async () => {
      patch({ syncing: true, error: null });
      onProgress({ phase: "favorites" });
      try {
        // The learned ranking needs each favorite's tags, which older profiles never kept:
        // read every favorite once to fill them in.
        // only with Remember: otherwise they live in memory and go with the tab (ENGINEERING.md)
        const keep = getSession().store.get().remember;
        const canLearn = await bigStorage.available();
        const storedFeats = canLearn && keep ? await bigStorage.get<FavFeatures>(featKey(name)) : undefined;
        const loaded = full || !keep ? null : storage.loadProfile(name);
        const start = loaded && canLearn && !covers(storedFeats, loaded) ? null : loaded;
        const read: Post[] = [];
        const p = await syncProfile(start, name, api, now(), onProgress, (posts) => read.push(...posts));
        if (cancelled) return;
        patch({ profile: p });
        if (keep && !storage.saveProfile(p)) warn("Favorites profile is too big to save on this device; it will be rebuilt next visit");
        const c = await refreshTagCache(storage.loadTagCache(), tagsToLookUp(p), api, now(), onProgress);
        if (cancelled) return;
        patch({ cache: c });
        storage.saveTagCache(c);
        if (canLearn) {
          try {
            const feats = mergeFeatures(storedFeats, p, read);
            if (keep) await bigStorage.set(featKey(name), feats);
            const search = (q: string, page: number, limit: number) => searchPosts(q, page, limit, creds, undefined, "bg");
            const neg = await refreshNegatives(await bigStorage.get<Negatives>(NEG_KEY), search, now(), onProgress);
            await bigStorage.set(NEG_KEY, neg);
            onProgress({ phase: "learn", done: 0 });
            const l = await fitLearned(keep ? await bigStorage.get<Learned>(learnedKey(name)) : undefined, p, feats, neg, () => cancelled, onProgress);
            if (cancelled || !l) return;
            patch({ fit: l });
            if (keep) await bigStorage.set(learnedKey(name), l);
          } catch (e) {
            // Ranking falls back to tag match; the profile itself is fine.
            if (!cancelled) warn(`Couldn't learn your taste: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } catch (e) {
        if (!cancelled) patch({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        if (!cancelled) patch({ syncing: false, step: null });
      }
    })();
  }

  function setOverrides(o: Overrides) {
    const name = store.get().name;
    if (!name) return;
    patch({ overrides: o });
    storage.saveOverrides(name, o);
  }

  return {
    store,
    setAccount(creds, user) {
      const name = user?.id != null ? user.name : null;
      const key = name && creds && user ? `${user.id}\n${name}\n${creds.username}\n${creds.apiKey}` : null;
      if (key === (account?.key ?? null)) return;
      cancel?.();
      cancel = null;
      if (!key || !name || !creds || user?.id == null) {
        account = null;
        patch({ name: null, profile: null, fit: null, overrides: NO_OVERRIDES, syncing: false, step: null, error: null, loaded: true });
        return;
      }
      account = { key, userId: user.id, name, creds };
      patch({ name, profile: storage.loadProfile(name), fit: null, overrides: storage.loadOverrides(name), error: null, loaded: false });
      // Last session's fit, so ranking uses it before this session's sync is done.
      const mine = account;
      const got = bigStorage.get<Learned>(learnedKey(name)).catch(() => undefined);
      void got.then((l) => {
        if (account === mine && l && !store.get().fit) patch({ fit: l });
      });
      // An IndexedDB that never answers (blocked by another tab) mustn't hold For You up.
      const late = new Promise<void>((resolve) => setTimeout(resolve, FIT_WAIT_MS));
      void Promise.race([got, late]).then(() => {
        if (account === mine && !store.get().loaded) patch({ loaded: true });
      });
      sync(false);
    },
    rebuild: () => sync(true),
    togglePin(tag) {
      const o = store.get().overrides;
      setOverrides({
        pinned: o.pinned.includes(tag) ? without(o.pinned, tag) : [...o.pinned, tag],
        muted: without(o.muted, tag),
      });
    },
    toggleMute(tag) {
      const o = store.get().overrides;
      setOverrides({
        pinned: without(o.pinned, tag),
        muted: o.muted.includes(tag) ? without(o.muted, tag) : [...o.muted, tag],
      });
    },
  };
}

let instance: Rec | null = null;
/** The app's one profile, following the session's sign-in (never a borrowed one). */
export function getRec(): Rec {
  if (!instance) {
    const rec = createRec((m) => toast(m));
    const session = getSession();
    const follow = () => {
      const s = session.store.get();
      rec.setAccount(s.link ? null : s.creds, s.link ? null : s.user);
    };
    session.store.subscribe(follow);
    follow();
    instance = rec;
  }
  return instance;
}
