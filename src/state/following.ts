/**
 * Following's marker (UX §5 Following, ENGINEERING.md §4): e621's "seen" marker for the tags you
 * follow, the session's threshold for New, and marking seen.
 *
 * - The threshold is the anchor's `last_seen_post_id` as read on the first load of the session,
 *   kept 12 h (with Remember on; this tab only otherwise) so a reload shows the same dots. It
 *   doesn't move when you mark seen: the next session starts from the new marker.
 * - Marking seen moves e621's marker (shared with e621.net) to its newest post, then reads it
 *   back. If it didn't move, the app keeps its own marker for the account instead, and says so.
 * - Only your own sign-in: a share link's borrowed sign-in never reads or moves anyone's marker.
 */
import { anyPost, getAnchor, visitAnchor, type Credentials } from "@/lib/e621/client";
import type { SavedSearchRow } from "@/lib/e621/types";
import { storage } from "@/lib/storage";
import { Eye } from "lucide-react";
import { createElement } from "react";
import { toast } from "sonner";
import { getFollows } from "./follows";
import { getSession } from "./session";
import { createStore, type Store } from "./store";

export const MARKER_TTL = 12 * 60 * 60_000;
export const RETRY_FAILED_MS = 60_000;

export interface FollowingState {
  /** whose marker this is (null: signed out, or on someone's link) */
  user: string | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  /** the followed-tags anchor; null once ready means you follow nothing yet */
  anchor: SavedSearchRow | null;
  /** New is above this, for the whole session; null while loading or following nothing */
  threshold: number | null;
  /** marked seen this session: on e621, or (when e621 didn't take it) on this device */
  marked: "e621" | "local" | null;
  marking: boolean;
  /** the last "anything newer?" check found posts above the loaded ones */
  newer: boolean;
  /** when the last mark failed (offline, 429…): automatic tries wait RETRY_FAILED_MS after it */
  failedAt: number | null;
  /** you followed or unfollowed something since this feed loaded: the pill offers a fresh start */
  stale: boolean;
}

const EMPTY: FollowingState = { user: null, status: "idle", error: null, anchor: null, threshold: null, marked: null, marking: false, newer: false, failedAt: null, stale: false };

export type MarkResult = "marked" | "local" | "newer" | "failed" | "skipped";

export interface Following {
  store: Store<FollowingState>;
  /** Read the anchor (once per account per session). */
  load(): Promise<void>;
  /**
   * Mark seen: unless `query(rawMax)` finds newer posts, move e621's marker and read it back.
   * `query` is the feed's own search with `id:>N` in its tag box.
   */
  /** `force`: Mark all as seen, which says why when it can't. */
  markSeen(rawMax: number, query: (above: number) => string, force?: boolean): Promise<MarkResult>;
  /** Read e621's anchor row again (pull to refresh): what you follow may have changed. The threshold stays. */
  reread(): Promise<void>;
  /** The new-posts pill was used, or the feed started over: the next check runs fresh. */
  clearNewer(): void;
  /** You followed or unfollowed a tag: the feed is of the old list (never reordered in place). */
  followsChanged(): void;
  setAccount(creds: Credentials | null, user: string | null, remember: boolean): void;
}

export function createFollowing(
  notify: (message: string) => void,
  api = { getAnchor, visitAnchor, anyPost },
  now: () => number = Date.now,
): Following {
  const store = createStore<FollowingState>(EMPTY);
  let creds: Credentials | null = null;
  let remember = false;
  let loading: Promise<void> | null = null;
  /** bumps on every account change, so a late answer for the old one is dropped */
  let epoch = 0;

  const load = (): Promise<void> => {
    const s = store.get();
    if (!creds || !s.user || s.status === "ready" || s.status === "loading") return loading ?? Promise.resolve();
    const mine = epoch;
    const user = s.user;
    const c = creds;
    // A reload in the same session: paint from what was read then, and refresh the row behind it
    // (the threshold stays, as it would anyway).
    const kept = storage.loadMarker(user);
    if (kept?.anchor && !kept.marked && now() - kept.at < MARKER_TTL) {
      store.set((x) => ({ ...x, status: "ready", error: null, anchor: kept.anchor!, threshold: kept.threshold }));
      void reread();
      return Promise.resolve();
    }
    store.set((x) => ({ ...x, status: "loading", error: null }));
    loading = api
      .getAnchor(c)
      .then((anchor) => {
        if (mine !== epoch) return;
        if (!anchor) {
          store.set((x) => ({ ...x, status: "ready", anchor: null, threshold: null }));
          return;
        }
        const saved = storage.loadMarker(user);
        const reuse = saved && !saved.marked && now() - saved.at < MARKER_TTL;
        // e621's marker, or this device's when e621 didn't take a mark (whichever is further on).
        const threshold = reuse ? saved.threshold : Math.max(anchor.last_seen_post_id ?? 0, storage.loadLocalSeen(user));
        storage.saveMarker(user, reuse ? { ...saved, anchor } : { threshold, at: now(), marked: false, anchor }, remember);
        store.set((x) => ({ ...x, status: "ready", anchor, threshold }));
      })
      .catch((e: Error) => {
        if (mine !== epoch) return;
        store.set((x) => ({ ...x, status: "error", error: e.message }));
      })
      .finally(() => {
        if (mine === epoch) loading = null;
      });
    return loading;
  };

  const reread = async (): Promise<void> => {
    const s = store.get();
    if (!creds || !s.user || s.status !== "ready") return;
    const mine = epoch;
    const user = s.user;
    try {
      const anchor = await api.getAnchor(creds, undefined, "bg");
      // A mark under way reads its own row back.
      if (mine !== epoch || store.get().marking || store.get().marked) return;
      const before = store.get().anchor;
      // What you follow changed (on e621.net, say): the saved first posts are of the old list.
      if (!anchor || anchor.tag_count !== before?.tag_count) storage.saveFeedHead(user, null, remember);
      // No row now: you follow nothing any more. A first follow made one: New starts at its marker.
      store.set((x) => ({
        ...x,
        anchor,
        threshold: x.threshold ?? (anchor ? Math.max(anchor.last_seen_post_id ?? 0, storage.loadLocalSeen(user)) : null),
      }));
      const rec = storage.loadMarker(user);
      if (rec && !rec.marked) storage.saveMarker(user, { ...rec, anchor: anchor ?? undefined }, remember);
    } catch {
      // keep the row we have
    }
  };

  const markSeen = async (rawMax: number, query: (above: number) => string, force = false): Promise<MarkResult> => {
    const s = store.get();
    if (!creds || !s.user || !s.anchor || s.marking || s.marked) return "skipped";
    const mine = epoch;
    const c = creds;
    const user = s.user;
    const anchor = s.anchor;
    store.set((x) => ({ ...x, marking: true }));
    const done = (patch: Partial<FollowingState>) => {
      if (mine === epoch) store.set((x) => ({ ...x, marking: false, ...patch }));
    };
    try {
      if (await api.anyPost(query(rawMax), c)) {
        done({ newer: true, failedAt: null });
        if (force && mine === epoch) notify("New posts came in, so nothing was marked. Refresh to see them.");
        return "newer";
      }
      if (mine !== epoch) return "skipped";
      let moved = false;
      let why = "";
      let visited = false;
      try {
        await api.visitAnchor(anchor.id, c);
        visited = true;
        // Read it back; once more if that read fails (a 429 right after the visit, say).
        const after = await api.getAnchor(c, undefined, "bg").catch(() => api.getAnchor(c, undefined, "bg"));
        moved = !!after && (after.last_seen_post_id ?? 0) > (anchor.last_seen_post_id ?? 0);
        if (!moved) why = "e621's marker didn't move";
        else if (mine === epoch) store.set((x) => ({ ...x, anchor: after }));
      } catch (e) {
        why = `${visited ? "couldn't read the marker back: " : ""}${e instanceof Error ? e.message : String(e)}`;
      }
      if (mine !== epoch) return "skipped";
      const saved = storage.loadMarker(user);
      if (saved) storage.saveMarker(user, { ...saved, marked: true }, remember);
      if (moved) {
        done({ marked: "e621", newer: false, failedAt: null });
        notify("Marked as seen on e621");
        return "marked";
      }
      console.warn(`Following: kept the seen marker on this device (${why})`);
      storage.saveLocalSeen(user, Math.max(rawMax, storage.loadLocalSeen(user)), remember);
      done({ marked: "local", newer: false, failedAt: null });
      // The visit went through but the read-back didn't: e621 most likely took it, we just can't tell.
      notify(visited && !why.startsWith("e621") ? "Marked as seen. Couldn't confirm it with e621." : "Marked as seen on this device. e621 didn't take it.");
      return "local";
    } catch (e) {
      done({ failedAt: now() });
      // Automatic tries back off quietly (RETRY_FAILED_MS); only a mark you asked for says why.
      if (force || s.failedAt === null) notify(`Couldn't mark as seen: ${e instanceof Error ? e.message : String(e)}`);
      return "failed";
    }
  };

  return {
    store,
    load,
    reread,
    markSeen,
    clearNewer: () => store.set((x) => (x.newer || x.stale ? { ...x, newer: false, stale: false } : x)),
    followsChanged() {
      const s = store.get();
      if (!s.user) return;
      // The saved first posts are of the old list.
      storage.saveFeedHead(s.user, null, remember);
      if (s.anchor) store.set((x) => ({ ...x, stale: true }));
      void reread();
    },
    setAccount(c, user, keep) {
      remember = keep;
      if (store.get().user === user && creds?.apiKey === c?.apiKey) return;
      epoch++;
      creds = c;
      loading = null;
      store.set({ ...EMPTY, user });
    },
  };
}

/** Following's count of new posts, for the sidebar's badge on a computer. */
export const newOnFollowing = createStore<{ user: string | null; count: number; more: boolean }>({ user: null, count: 0, more: false });

let instance: Following | null = null;
/** The app's one Following marker, following the session's own sign-in (never a borrowed one). */
export function getFollowing(): Following {
  if (!instance) {
    const f = createFollowing((m) => {
      // (the store speaks in sentences: a failure says it couldn't, or that e621 didn't take it)
      if (/Couldn't|didn't take it/.test(m)) return void toast.error(m);
      toast(m, m === "Marked as seen on e621" ? { icon: createElement(Eye) } : undefined);
    });
    const session = getSession();
    const follow = () => {
      const s = session.store.get();
      const mine = !s.link && s.creds && s.user;
      f.setAccount(mine ? s.creds : null, mine ? s.user!.name : null, s.remember);
    };
    session.store.subscribe(follow);
    follow();
    const follows = getFollows().store;
    let changed = follows.get().changed;
    follows.subscribe(() => {
      if (follows.get().changed === changed) return;
      changed = follows.get().changed;
      f.followsChanged();
    });
    instance = f;
  }
  return instance;
}
