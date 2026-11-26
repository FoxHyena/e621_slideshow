/**
 * Artist suggestions for your own account (ENGINEERING.md §6): Artists › Suggested and Follow from
 * favorites read them. Built from For You's favorites profile (state/rec.ts: one read, shared), the
 * tag cache's post counts and the learned weights, minus who you follow and who you hid. The top
 * ones' newest posts come from a few batched searches (`~a ~b … order:id_desc`), which also give
 * each its three tiles; then the list is ranked once more with recency and kept an hour.
 *
 * A borrowed sign-in (a share link's) has no profile here, so it gets no suggestions.
 */
import { searchPosts, type Credentials } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { DEFAULT_FILTERS } from "@/lib/feed/filters";
import { blacklistedBy, parseBlacklist } from "@/lib/query/blacklist";
import {
  groupByArtist,
  rankCandidates,
  rankWithRecency,
  RECENCY_TOP,
  tileQueries,
  tileQuery,
  type ArtistCandidate,
  type ArtistSuggestion,
} from "@/lib/recommend/artists";
import { countsOf } from "@/lib/recommend/sync";
import { storage } from "@/lib/storage";
import { feedQuery } from "./feeds";
import { getFollows } from "./follows";
import { blacklistOf, getPrefs } from "./prefs";
import { getRec, learnedOf, type RecState } from "./rec";
import { getSession } from "./session";
import { createStore, type Store } from "./store";

/** The three steps of the first read, as Following's checklist shows them. */
export type ReadStep = "favorites" | "artists" | "posts";

export interface ArtistsState {
  user: string | null;
  /** reading: the favorites profile or the newest posts are still coming; ready: `list` is it */
  status: "idle" | "reading" | "ready" | "error";
  step: ReadStep | null;
  /** the running step's progress, when known */
  done?: number;
  total?: number;
  /** ranked, best first; followed and hidden artists left out */
  list: ArtistSuggestion[];
  /** the same, followed ones kept (Suggested keeps a card you just followed in place) */
  all: ArtistSuggestion[];
  /** each suggested artist's three newest posts you can see */
  tiles: ReadonlyMap<string, Post[]>;
  /** favorites in the profile: 0 means there is nothing to suggest from */
  favorites: number;
  /** artists you favorite often enough to suggest, followed or not (known once counted) */
  found: number | null;
  hidden: readonly string[];
  error: string | null;
}

export const SUGGEST_TTL = 60 * 60_000;

export interface ArtistsApi {
  store: Store<ArtistsState>;
  /** Start (or reuse) the read; Try again passes `force`. */
  ensure(force?: boolean): void;
  hide(name: string): void;
  unhide(name: string): void;
}

interface Looked {
  user: string;
  at: number;
  /** the looked-up candidates: kept for the hour, so a later fit doesn't reorder what you're reading */
  cands: ArtistCandidate[];
  lastPostAt: Map<string, number>;
  tiles: Map<string, Post[]>;
}

function create(): ArtistsApi {
  const store = createStore<ArtistsState>({
    user: null,
    status: "idle",
    step: null,
    list: [],
    all: [],
    tiles: new Map(),
    favorites: 0,
    found: null,
    hidden: [],
    error: null,
  });
  const patch = (p: Partial<ArtistsState>) => store.set((s) => ({ ...s, ...p }));
  /** patch only what changed: rec's progress ticks often, and every change re-renders the cards */
  const same = (p: Partial<ArtistsState>) => {
    const s = store.get();
    if ((Object.keys(p) as (keyof ArtistsState)[]).some((k) => s[k] !== p[k])) patch(p);
  };
  let looked: Looked | null = null;
  let running: { key: string } | null = null;
  /** a screen asked (Artists, the first run); reset with the account, so another sign-in reads only when asked */
  let wanted = false;
  /** Try again: past an error once */
  let retrying = false;
  let epoch = 0;

  const account = (): { name: string; creds: Credentials } | null => {
    const s = getSession().store.get();
    return !s.link && s.creds && s.user?.id != null ? { name: s.user.name, creds: s.creds } : null;
  };

  const keepPost = () => {
    const rules = parseBlacklist(blacklistOf(getPrefs().store.get()));
    return (p: Post) => !blacklistedBy(rules, p);
  };

  /** what the last cut was made from: the same again changes nothing (rec's progress ticks often) */
  let lastCut: { followed: ReadonlySet<string>; hidden: readonly string[]; l: Looked } | null = null;

  /** Followed and hidden out; the list re-cut without asking e621 again. */
  const cut = (cands: ArtistCandidate[], l: Looked) => {
    const f = getFollows().store.get();
    // Who you follow isn't known yet (or is still the last account's): a list cut now would offer
    // them. (A failed read cuts with what's known, so Suggested still shows.)
    if (f.status === "idle" || f.status === "loading" || f.user !== l.user) {
      void getFollows().ensure();
      return patch({ status: "reading", step: "posts" });
    }
    const followed = f.followed;
    const s = store.get();
    if (s.status === "ready" && lastCut && lastCut.followed === followed && lastCut.hidden === s.hidden && lastCut.l === l) return;
    lastCut = { followed, hidden: s.hidden, l };
    const hidden = new Set(s.hidden);
    const all = rankWithRecency(
      cands.filter((c) => !hidden.has(c.name)),
      l.lastPostAt,
      Date.now(),
    );
    const list = all.filter((c) => !followed.has(c.name));
    patch({ status: "ready", step: null, done: undefined, total: undefined, list, all, tiles: l.tiles, error: null });
  };

  const fromRec = (r: RecState, user: string): "wait" | "error" | ArtistCandidate[] => {
    // rec follows the session on its own: until it has switched too, its profile is the last account's
    if (r.name !== user) return "wait";
    const p = r.profile;
    if (!p) return r.error && !r.syncing ? "error" : "wait";
    const counts = countsOf(r.cache);
    const cands = rankCandidates(p, counts, learnedOf(r), new Set());
    // The post counts are still coming (a first read: the profile lands before the counts are
    // asked for). Ranking now would favour the unknown, and the order is kept for the hour.
    const counting = r.step?.phase === "favorites" || r.step?.phase === "tags";
    if (r.syncing && counting && cands.some((c) => !(c.name in counts))) return "wait";
    return cands;
  };

  const run = () => {
    const a = account();
    if (!a) {
      // signed out: whatever is in flight is for nobody now
      epoch++;
      looked = null;
      running = null;
      lastCut = null;
      wanted = false;
      if (store.get().user !== null || store.get().status !== "idle")
        patch({ user: null, status: "idle", step: null, list: [], all: [], tiles: new Map(), favorites: 0, found: null, hidden: [], error: null });
      return;
    }
    if (store.get().user !== a.name) {
      epoch++;
      looked = null;
      running = null;
      lastCut = null;
      wanted = false;
      patch({ user: a.name, status: "idle", list: [], all: [], tiles: new Map(), found: null, hidden: storage.loadHiddenArtists(a.name), error: null });
    }
    if (!wanted) return;
    // A failed read waits for Try again: store ticks don't hammer a failing e621.
    if (store.get().status === "error" && !retrying) return;
    retrying = false;
    const r = getRec().store.get();
    const got = fromRec(r, a.name);
    if (got === "error") return patch({ status: "error", step: null, error: r.error });
    if (got === "wait") {
      const phase = r.step?.phase;
      // a profile in hand while favorites are still read: the counting is what's left to wait for
      const step: ReadStep = phase === "tags" || (phase === "favorites" && r.profile) ? "artists" : "favorites";
      const own = (step === "artists") === (phase === "tags");
      return same({
        status: "reading",
        step,
        done: own ? r.step?.done : undefined,
        total: own ? r.step?.total : undefined,
        favorites: r.name === a.name ? (r.profile?.favIds.length ?? 0) : 0,
      });
    }
    const favorites = r.profile?.favIds.length ?? 0;
    // Everyone you favorite a lot, followed or not: following someone then re-cuts, not re-asks.
    if (looked && looked.user === a.name && Date.now() - looked.at < SUGGEST_TTL) {
      same({ favorites, found: got.length });
      return cut(looked.cands, looked);
    }
    if (running) return;
    const top = got.slice(0, RECENCY_TOP);
    const mine = { key: a.name };
    running = mine;
    const e = epoch;
    const batches = tileQueries(top.map((c) => c.name));
    patch({ status: "reading", step: "posts", done: 0, total: batches.length, favorites, found: got.length });
    void (async () => {
      const keep = keepPost();
      const ratings = getPrefs().store.get().search.ratings;
      const env = { ratings, creds: a.creds, user: getSession().store.get().user };
      const lastPostAt = new Map<string, number>();
      const tiles = new Map<string, Post[]>();
      try {
        for (let i = 0; i < batches.length; i++) {
          const names = batches[i];
          const q = feedQuery({ kind: "search", tags: tileQuery(names), filters: DEFAULT_FILTERS }, env);
          const posts = await searchPosts(q, 1, 320, a.creds, undefined, "page");
          if (running !== mine || e !== epoch) return;
          const g = groupByArtist(posts, names, keep);
          for (const [n, t] of g.lastPostAt) lastPostAt.set(n, t);
          for (const [n, t] of g.tiles) tiles.set(n, t);
          patch({ done: i + 1 });
        }
        // A prolific neighbour can fill a batch's page: those left with nothing get their own look.
        for (const c of top.filter((c) => !lastPostAt.has(c.name)).slice(0, 8)) {
          const q = feedQuery({ kind: "search", tags: tileQuery([c.name]), filters: DEFAULT_FILTERS }, env);
          const posts = await searchPosts(q, 1, 3, a.creds, undefined, "bg");
          if (running !== mine || e !== epoch) return;
          const g = groupByArtist(posts, [c.name], keep);
          for (const [n, t] of g.lastPostAt) lastPostAt.set(n, t);
          for (const [n, t] of g.tiles) tiles.set(n, t);
        }
      } catch (err) {
        if (running !== mine || e !== epoch) return;
        running = null;
        return patch({ status: "error", step: null, error: err instanceof Error ? err.message : String(err) });
      }
      running = null;
      // only the looked-up top are suggested: the rest have no recency or tiles to show
      looked = { user: a.name, at: Date.now(), cands: top, lastPostAt, tiles };
      cut(top, looked);
    })();
  };

  const api: ArtistsApi = {
    store,
    ensure(force = false) {
      wanted = true;
      if (force) {
        looked = null;
        running = null;
        lastCut = null;
        retrying = true;
        if (store.get().status === "error" && getRec().store.get().error) getRec().rebuild();
      }
      run();
    },
    hide(name) {
      const s = store.get();
      if (!s.user || s.hidden.includes(name)) return;
      const hidden = [...s.hidden, name];
      storage.saveHiddenArtists(s.user, hidden);
      patch({ hidden, list: s.list.filter((x) => x.name !== name), all: s.all.filter((x) => x.name !== name) });
    },
    unhide(name) {
      const s = store.get();
      if (!s.user) return;
      const hidden = s.hidden.filter((x) => x !== name);
      storage.saveHiddenArtists(s.user, hidden);
      patch({ hidden });
      if (looked) run();
    },
  };

  getSession().store.subscribe(run);
  getRec().store.subscribe(() => {
    if (wanted) run();
  });
  getFollows().store.subscribe(() => {
    if (wanted && store.get().status !== "idle") run();
  });
  run();
  return api;
}

let instance: ArtistsApi | null = null;
export function getArtists(): ArtistsApi {
  return (instance ??= create());
}
