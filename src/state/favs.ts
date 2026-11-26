/**
 * Favorites without fan-out (ENGINEERING.md §2). Cards and the player read
 * `faved = overlay.get(id) ?? post.stats.is_favorited`, so one toggle shows everywhere the post
 * does, and queues are never patched. Ops run one at a time per post; when one runs it sends
 * whatever the latest intent is, so quick double taps settle on the last one.
 */
import { addFavorite, E621Error, removeFavorite, type Credentials } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { toast } from "sonner";
import { getSession } from "./session";
import { createStore, type Store } from "./store";

export interface FavState {
  overlay: ReadonlyMap<number, boolean>;
  /** counts toggles that reached e621, so the Favorites feed knows it's stale */
  changed: number;
}

export interface FavsApi {
  store: Store<FavState>;
  toggle(post: Pick<Post, "id" | "stats">): void;
  /** Forget every toggle: another account (or none) is signed in now. */
  reset(): void;
}

export const favedOf = (s: FavState, post: Pick<Post, "id" | "stats">): boolean =>
  s.overlay.get(post.id) ?? post.stats.is_favorited;

/** The count with our own toggle folded in; can't double-count once e621's number includes it. */
export const favCountOf = (s: FavState, post: Pick<Post, "id" | "stats">): number =>
  post.stats.fav_count + (Number(favedOf(s, post)) - Number(post.stats.is_favorited));

export function createFavs(
  creds: () => Credentials | null,
  onError: (message: string) => void,
  api = { add: addFavorite, remove: removeFavorite },
): FavsApi {
  const store = createStore<FavState>({ overlay: new Map(), changed: 0 });
  /** what e621 has, as far as we know */
  const server = new Map<number, boolean>();
  const chains = new Map<number, Promise<void>>();
  /** bumps on reset, so a request still in flight for the old account changes nothing */
  let epoch = 0;

  const setOverlay = (id: number, v: boolean) =>
    store.set((s) => ({ ...s, overlay: new Map(s.overlay).set(id, v) }));

  const run = async (id: number) => {
    const at = epoch;
    const want = store.get().overlay.get(id);
    const c = creds();
    if (want === undefined || want === server.get(id)) return;
    if (!c) {
      setOverlay(id, server.get(id) ?? false);
      onError("Sign in to favorite");
      return;
    }
    try {
      if (want) await api.add(id, c);
      else await api.remove(id, c);
      if (at !== epoch) return;
    } catch (e) {
      if (at !== epoch) return;
      // Already in that state on e621: that's what we wanted.
      const done = e instanceof E621Error && (want ? e.status === 422 : e.status === 404);
      if (!done) {
        // A newer tap queued after this one gets its own try; only roll back the latest intent.
        if (store.get().overlay.get(id) === want) setOverlay(id, server.get(id) ?? !want);
        onError(`Favorite failed: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
    }
    server.set(id, want);
    store.set((s) => ({ ...s, changed: s.changed + 1 }));
  };

  return {
    store,
    toggle(post) {
      const id = post.id;
      if (!server.has(id)) server.set(id, post.stats.is_favorited);
      setOverlay(id, !favedOf(store.get(), post));
      const next = (chains.get(id) ?? Promise.resolve()).then(() => run(id));
      chains.set(id, next);
      void next.finally(() => {
        if (chains.get(id) === next) chains.delete(id);
      });
    },
    reset() {
      epoch++;
      server.clear();
      chains.clear();
      store.set((s) => (s.overlay.size === 0 ? s : { ...s, overlay: new Map() }));
    },
  };
}

let instance: FavsApi | null = null;
export function getFavs(): FavsApi {
  if (!instance) {
    const session = getSession().store;
    const favs = createFavs(() => session.get().creds, (m) => toast.error(m));
    let who = session.get().creds?.username ?? null;
    session.subscribe(() => {
      const now = session.get().creds?.username ?? null;
      if (now === who) return;
      who = now;
      favs.reset();
    });
    instance = favs;
  }
  return instance;
}
