/**
 * Artists › Following (UX.md "Artists"): when each artist you follow last posted, and who has
 * something new. One page of `search:subscriptions` (320 posts, newest first) is read when the tab
 * opens, kept 10 minutes; an artist not in it "posted a while ago". New is the same threshold as
 * Following's; opening an artist's page clears their dot for the session.
 */
import { searchPosts, type Credentials } from "@/lib/e621/client";
import { getSession } from "./session";
import { createStore, type Store } from "./store";

export const LIST_TTL = 10 * 60_000;
export const LIST_PAGE = 320;

export interface ArtistListState {
  user: string | null;
  status: "idle" | "reading" | "ready" | "error";
  /** artist → newest post seen: its time (ms) and id */
  newest: ReadonlyMap<string, { at: number; id: number }>;
  readAt: number;
  /** artists whose page you opened this session: no dot */
  opened: ReadonlySet<string>;
  error: string | null;
}

export interface ArtistListApi {
  store: Store<ArtistListState>;
  /** Read the page if it's older than 10 minutes (or `force`: pull to refresh). */
  ensure(force?: boolean): Promise<void>;
  opened(name: string): void;
}

const EMPTY: ArtistListState = { user: null, status: "idle", newest: new Map(), readAt: 0, opened: new Set(), error: null };

function create(now: () => number = Date.now): ArtistListApi {
  const store = createStore<ArtistListState>(EMPTY);
  const patch = (p: Partial<ArtistListState>) => store.set((s) => ({ ...s, ...p }));
  let epoch = 0;
  let reading: Promise<void> | null = null;

  const account = (): { name: string; creds: Credentials } | null => {
    const s = getSession().store.get();
    return !s.link && s.creds && s.user?.id != null ? { name: s.user.name, creds: s.creds } : null;
  };

  const sync = () => {
    const a = account();
    if ((a?.name ?? null) === store.get().user) return;
    epoch++;
    store.set({ ...EMPTY, user: a?.name ?? null });
  };
  getSession().store.subscribe(sync);
  sync();

  return {
    store,
    ensure(force = false) {
      sync();
      const a = account();
      const s = store.get();
      if (!a || s.status === "reading") return reading ?? Promise.resolve();
      if (!force && s.status === "ready" && now() - s.readAt < LIST_TTL) return Promise.resolve();
      const mine = ++epoch;
      patch({ status: "reading", error: null });
      reading = searchPosts("search:subscriptions order:id_desc", 1, LIST_PAGE, a.creds, undefined, "page").then(
        (posts) => {
          if (mine !== epoch) return;
          const newest = new Map<string, { at: number; id: number }>();
          for (const p of posts) {
            const at = Date.parse(p.created_at);
            for (const name of p.tags.artist ?? []) {
              const had = newest.get(name);
              if (!had || p.id > had.id) newest.set(name, { at: Number.isNaN(at) ? 0 : at, id: p.id });
            }
          }
          patch({ status: "ready", newest, readAt: now(), error: null });
        },
        (e: unknown) => {
          if (mine !== epoch) return;
          // what was shown stays; only a first read shows the error
          patch({ status: store.get().readAt ? "ready" : "error", error: e instanceof Error ? e.message : String(e) });
        },
      );
      return reading;
    },
    opened(name) {
      const s = store.get();
      if (s.opened.has(name)) return;
      patch({ opened: new Set([...s.opened, name]) });
    },
  };
}

let instance: ArtistListApi | null = null;
export function getArtistList(): ArtistListApi {
  return (instance ??= create());
}
