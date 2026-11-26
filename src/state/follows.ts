/**
 * The tags you follow on e621 (ENGINEERING.md §2–§4, UX §5): `name → subscription id`.
 *
 * - Read once per account, kept 10 min and refreshed behind what's shown (Remember: on disk too).
 * - Follow and unfollow are optimistic: what shows is your latest tap over what e621 has. Taps on
 *   one tag run one at a time (an Undo waits for the follow it undoes), and each run sends the
 *   latest intent, so quick taps settle on the last one. A failure rolls back and says why.
 * - A list read that started before a write landed is dropped (a generation counter): the write's
 *   own answer is newer. Your taps on their way are shown over any list read.
 * - Only your own sign-in. Signed out (or on someone's share link) Follow opens sign-in, and the
 *   tag is followed once you're signed in.
 */
import { E621Error, getSubscriptions, subscribe, unsubscribe, type Credentials, type Lane } from "@/lib/e621/client";
import { storage } from "@/lib/storage";
import { openSignIn } from "@/screens/actions";
import { createElement } from "react";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";
import { actionLook } from "@/shell/toastLook";
import { getSession } from "./session";
import { createStore, type Store } from "./store";

/** e621's limit (`Danbooru.config.tag_subscription_limit`). */
export const FOLLOW_LIMIT = 500;
export const SUBS_TTL = 10 * 60_000;
/** A Follow tapped while signed out is carried out after a sign-in within this long. */
export const PENDING_MS = 5 * 60_000;
/** After a failed first read, cards wait this long before asking again (Try again doesn't). */
export const RETRY_MS = 60_000;
export const LIMIT_MESSAGE = `e621 allows ${FOLLOW_LIMIT} follows`;

export interface FollowsState {
  /** whose follows these are (null: signed out, or on someone's link) */
  user: string | null;
  status: "idle" | "loading" | "ready" | "error";
  /** what e621 has, with your taps still on their way folded in */
  followed: ReadonlySet<string>;
  /** follows and unfollows that reached e621, ever (Following's feed is stale once it moves) */
  changed: number;
  /** a remembered sign-in is still being checked: not signed out, not known yet either */
  checking: boolean;
}

export interface FollowsUi {
  /** a toast; `undo` adds an Undo button, `error` makes it an error */
  say(message: string, opts: { id: string; undo?: () => void; error?: boolean }): void;
  signIn(): void;
}

export interface FollowsApi {
  store: Store<FollowsState>;
  /**
   * Read the list if it isn't read yet, or is older than 10 min (shown meanwhile). After a failed
   * read it waits a minute, unless `force` (a Try again).
   */
  ensure(lane?: Lane, force?: boolean): Promise<void>;
  /** Follow (`on`) or unfollow, optimistically, with a toast and Undo. */
  setFollowed(name: string, on: boolean): void;
  /**
   * Follow several in one write (Follow from favorites). Shown at once; what e621 skipped comes back
   * (already followed counts as followed). Null when it couldn't be sent or failed (said in a toast).
   */
  followMany(names: string[]): Promise<{ added: string[]; skipped: { name: string; reason: string }[] } | null>;
  setAccount(creds: Credentials | null, user: string | null, remember: boolean, checking?: boolean): void;
  /** The sign-in sheet closed without a sign-in: a Follow tapped while signed out is dropped. */
  dropPending(): void;
}

export const isFollowed = (s: FollowsState, name: string) => s.followed.has(name.toLowerCase());
export const atLimit = (s: FollowsState) => s.status === "ready" && s.followed.size >= FOLLOW_LIMIT;

const label = (name: string) => name.replaceAll("_", " ");

/** e621's skip reasons, said plainly. */
function skipReason(reason: string): string {
  if (/limit/i.test(reason)) return LIMIT_MESSAGE;
  if (/not exist/i.test(reason)) return "e621 has no tag by that name";
  return reason;
}

class SkipError extends Error {}

export function createFollows(
  ui: FollowsUi,
  api = { list: getSubscriptions, subscribe, unsubscribe },
  now: () => number = Date.now,
): FollowsApi {
  const store = createStore<FollowsState>({ user: null, status: "idle", followed: new Set(), changed: 0, checking: false });
  let creds: Credentials | null = null;
  let remember = false;
  /** what e621 has, as far as we know (a null id: followed, id not known yet) */
  let server = new Map<string, number | null>();
  /** taps not yet settled on e621 */
  const intent = new Map<string, boolean>();
  const chains = new Map<string, Promise<void>>();
  let fetchedAt = 0;
  let failedAt = -Infinity;
  let loading: Promise<void> | null = null;
  /** bumps when a write starts and when it ends: a list read across one is out of date */
  let writes = 0;
  /** bumps on every account change, so a late answer for the old one changes nothing */
  let epoch = 0;
  /** a Follow tapped while signed out */
  let pending: { name: string; at: number } | null = null;

  const shown = (): Set<string> => {
    const set = new Set(server.keys());
    for (const [name, on] of intent) {
      if (on) set.add(name);
      else set.delete(name);
    }
    return set;
  };
  const publish = () => store.set((s) => ({ ...s, followed: shown() }));
  /** Only a list e621 sent (plus writes since): a write before any read would save a partial one. */
  const persist = () => {
    const user = store.get().user;
    if (user && fetchedAt > 0) storage.saveSubs(user, { at: fetchedAt, tags: [...server] }, remember);
  };
  const idle = async () => {
    while (chains.size) await Promise.allSettled([...chains.values()]);
  };

  const ensure = (lane: Lane = "page", force = false): Promise<void> => {
    const s = store.get();
    if (!creds || !s.user) return Promise.resolve();
    if (loading) return loading;
    if (s.status === "ready" && now() - fetchedAt < SUBS_TTL) return Promise.resolve();
    // Every card asks on mount: a failed read isn't retried by scrolling.
    if (s.status === "error" && !force && now() - failedAt < RETRY_MS) return Promise.resolve();
    const mine = epoch;
    const gen = writes;
    const shownAlready = s.status === "ready";
    let again = false;
    loading = api
      .list(creds, undefined, shownAlready ? "bg" : lane)
      .then((rows) => {
        if (mine !== epoch) return;
        if (gen !== writes || chains.size) {
          // A follow or unfollow went out meanwhile: this list may not have it. Ask again after.
          again = true;
          return;
        }
        server = new Map(rows.map((r) => [r.tag_name, r.id]));
        fetchedAt = now();
        persist();
        store.set((x) => ({ ...x, status: "ready", followed: shown() }));
      })
      .catch(() => {
        if (mine !== epoch) return;
        // A refresh behind a shown list fails quietly (and tries again in 10 min); a first read
        // says so (pills stay hidden).
        failedAt = now();
        if (!shownAlready) store.set((x) => ({ ...x, status: "error" }));
        else fetchedAt = now();
      })
      .finally(() => {
        if (mine !== epoch) return;
        loading = null;
        if (again)
          void idle().then(() => {
            if (mine !== epoch) return;
            fetchedAt = 0;
            void ensure(lane);
          });
      });
    // after `loading` is set: a listener that asks again gets this read, not a second one
    if (!shownAlready) store.set((x) => ({ ...x, status: "loading" }));
    return loading;
  };

  const run = async (name: string, tapped: number) => {
    // A run queued for another account (behind its request) does nothing for this one.
    if (tapped !== epoch) return;
    const mine = epoch;
    const c = creds;
    const want = intent.get(name);
    if (want === undefined || !c) return;
    if (want === server.has(name)) {
      intent.delete(name);
      publish();
      return;
    }
    writes++;
    try {
      if (want) {
        const res = await api.subscribe([name], c);
        if (mine !== epoch) return;
        // An alias comes back under its new name: with one tag asked for, the one row is it.
        const row = res.added.find((r) => r.tag_name === name) ?? (res.added.length === 1 ? res.added[0] : undefined);
        const skip = res.skipped.find((k) => k.name === name) ?? res.skipped[0];
        if (row) {
          server.set(name, row.id);
          // An alias: the list e621 sends next has it under the new name.
          if (row.tag_name !== name) server.set(row.tag_name, row.id);
        }
        else if (skip && /already/i.test(skip.reason)) server.set(name, null);
        else throw new SkipError(skip ? skipReason(skip.reason) : "e621 didn't follow it");
      } else {
        let id = server.get(name) ?? null;
        if (id === null) {
          // Followed but its id isn't known (e621 said "already subscribed"): look it up.
          const rows = await api.list(c, undefined, "user");
          if (mine !== epoch) return;
          id = rows.find((r) => r.tag_name === name)?.id ?? null;
        }
        if (id !== null) {
          try {
            await api.unsubscribe(id, c);
          } catch (e) {
            // Already gone on e621: that's what we wanted.
            if (!(e instanceof E621Error && e.status === 404)) throw e;
          }
          if (mine !== epoch) return;
        }
        server.delete(name);
        // The same row under an alias's new name goes too.
        if (id !== null) for (const [n, i] of server) if (i === id) server.delete(n);
      }
    } catch (e) {
      if (mine !== epoch) return;
      // A newer tap queued after this one gets its own try (and its own say): only the latest
      // intent rolls back and is told about.
      if (intent.get(name) !== want) return publish();
      intent.delete(name);
      publish();
      const why = e instanceof Error ? e.message : String(e);
      ui.say(e instanceof SkipError && why === LIMIT_MESSAGE ? why : `Couldn't ${want ? "follow" : "unfollow"} ${label(name)}: ${why}`, {
        id: `follow:${name}`,
        error: true,
      });
      return;
    } finally {
      if (mine === epoch) writes++;
    }
    if (intent.get(name) === want) intent.delete(name);
    persist();
    // Following's saved first posts are of the old list (even if Following hasn't opened yet).
    const user = store.get().user;
    if (user) storage.saveFeedHead(user, null, remember);
    store.set((s) => ({ ...s, followed: shown(), changed: s.changed + 1 }));
  };

  const setFollowed = (raw: string, on: boolean) => {
    const name = raw.trim().toLowerCase();
    // e621 splits on whitespace: "a b" would follow two tags. Tag names never hold any.
    if (!name || /\s/.test(name)) return;
    const s = store.get();
    if (!creds || !s.user) {
      if (on) pending = { name, at: now() };
      ui.signIn();
      return;
    }
    if (s.followed.has(name) === on) return;
    if (on && atLimit(s)) {
      ui.say(LIMIT_MESSAGE, { id: `follow:${name}`, error: true });
      return;
    }
    intent.set(name, on);
    publish();
    const tapped = epoch;
    ui.say(on ? `Following ${label(name)}` : `Unfollowed ${label(name)}`, {
      id: `follow:${name}`,
      // An Undo from before another account signed in does nothing.
      undo: () => {
        if (tapped === epoch) setFollowed(name, !on);
      },
    });
    const next = (chains.get(name) ?? Promise.resolve()).then(() => run(name, tapped));
    chains.set(name, next);
    void next.finally(() => {
      if (chains.get(name) === next) chains.delete(name);
    });
  };

  const followMany = async (raw: string[]) => {
    const c = creds;
    const s = store.get();
    if (!c || !s.user) {
      ui.signIn();
      return null;
    }
    const names = [...new Set(raw.map((n) => n.trim().toLowerCase()))].filter((n) => n && !/\s/.test(n) && !s.followed.has(n));
    const room = Math.max(0, FOLLOW_LIMIT - s.followed.size);
    if (names.length > room) {
      ui.say(LIMIT_MESSAGE, { id: "follow:many", error: true });
      return null;
    }
    if (!names.length) return { added: [], skipped: [] };
    const mine = epoch;
    for (const n of names) intent.set(n, true);
    publish();
    writes++;
    let res: Awaited<ReturnType<typeof api.subscribe>>;
    try {
      res = await api.subscribe(names, c);
    } catch (e) {
      if (mine !== epoch) return null;
      for (const n of names) intent.delete(n);
      publish();
      ui.say(`Couldn't follow them: ${e instanceof Error ? e.message : String(e)}`, { id: "follow:many", error: true });
      return null;
    } finally {
      if (mine === epoch) writes++;
    }
    if (mine !== epoch) return null;
    for (const row of res.added) server.set(row.tag_name, row.id);
    const skipped: { name: string; reason: string }[] = [];
    for (const k of res.skipped) {
      if (/already/i.test(k.reason)) server.set(k.name, null);
      else skipped.push({ name: k.name, reason: skipReason(k.reason) });
    }
    const missed = new Set(skipped.map((k) => k.name));
    // asked for, not skipped, not under its own name in the answer: an alias e621 followed under its new name
    for (const n of names) if (!missed.has(n) && !server.has(n)) server.set(n, null);
    for (const n of names) intent.delete(n);
    persist();
    if (s.user) storage.saveFeedHead(s.user, null, remember);
    store.set((x) => ({ ...x, followed: shown(), changed: x.changed + 1 }));
    return { added: names.filter((n) => !missed.has(n)), skipped };
  };

  return {
    store,
    ensure,
    setFollowed,
    followMany,
    dropPending() {
      pending = null;
    },
    setAccount(c, user, keep, checking = false) {
      remember = keep;
      if (store.get().checking !== checking) store.set((s) => ({ ...s, checking }));
      if (store.get().user === user && creds?.apiKey === c?.apiKey) return;
      epoch++;
      creds = c;
      server = new Map();
      intent.clear();
      chains.clear();
      loading = null;
      fetchedAt = 0;
      failedAt = -Infinity;
      // Only a remembered sign-in reads what an earlier one kept (a sign-in without Remember purges it).
      const saved = user && keep ? storage.loadSubs(user) : null;
      if (saved) {
        server = new Map(saved.tags);
        fetchedAt = saved.at;
      }
      store.set((s) => ({ user, status: saved ? "ready" : "idle", followed: shown(), changed: s.changed, checking }));
      // Signed in now: the Follow tapped while signed out goes through (if it was just now).
      const p = pending;
      pending = null;
      if (user && c && p && now() - p.at < PENDING_MS) {
        const mine = epoch;
        // Once the list is read (a read a write overtook keeps it loading a little longer).
        let done = false;
        const settle = () => {
          const s = store.get();
          if (done) return;
          if (mine !== epoch) return stop();
          if (s.status === "ready") {
            stop();
            if (!s.followed.has(p.name)) setFollowed(p.name, true);
          } else if (s.status === "error") {
            stop();
            ui.say(`Couldn't follow ${label(p.name)}: tap Follow again`, { id: `follow:${p.name}`, error: true });
          }
        };
        const unsubscribe = store.subscribe(settle);
        function stop() {
          done = true;
          unsubscribe();
        }
        void ensure("user").then(settle);
      }
    },
  };
}

let instance: FollowsApi | null = null;
/** The app's one follows list, following the session's own sign-in (never a borrowed one). */
export function getFollows(): FollowsApi {
  if (!instance) {
    const f = createFollows({
      say: (message, { id, undo, error }) => {
        // (sonner merges an update into the toast it replaces: no Undo must say so, or the old one stays)
        const plain = { action: undefined, duration: 4000 };
        if (error) return void toast.error(message, { id, icon: undefined, ...plain });
        // about one artist: their mark is the toast's mark (DESIGN.md "Toast")
        const one = id.startsWith("follow:") && id !== "follow:many" ? id.slice("follow:".length) : null;
        toast(message, {
          id,
          icon: one ? createElement(Avatar, { seed: one }) : undefined,
          ...(undo ? { action: { label: "Undo", onClick: undo }, ...actionLook() } : plain),
        });
      },
      signIn: openSignIn,
    });
    const session = getSession();
    const follow = () => {
      const s = session.store.get();
      // Not until a remembered sign-in is confirmed (or painted from the saved profile).
      const mine = !s.link && s.creds && s.user && s.ready;
      f.setAccount(mine ? s.creds : null, mine ? s.user!.name : null, s.remember, !s.link && !!s.creds && !s.ready);
    };
    session.store.subscribe(follow);
    follow();
    instance = f;
  }
  return instance;
}
