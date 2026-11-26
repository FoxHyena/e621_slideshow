/**
 * Preferences (ENGINEERING.md §2): the account-wide ratings and blacklist, playback settings,
 * saved and recent searches. Persisted under the existing `e6ss:v1:*` keys, so an old profile
 * keeps everything.
 *
 * The legacy show's tag box, source and filters still live in `search` too, until slice 3 moves
 * them to per-feed filters (DECISIONS: Results defaults come from these while the legacy panel exists).
 */
import { syncAccountBlacklist } from "@/lib/query/blacklist";
import type { PlaybackSettings, SearchSettings } from "@/lib/settings";
import { pushHistory, storage, type HistoryEntry, type SavedSearch } from "@/lib/storage";
import { createStore, type Store } from "./store";

export interface Prefs {
  search: SearchSettings;
  playback: PlaybackSettings;
  saved: SavedSearch[];
  history: HistoryEntry[];
  /** A link's sign-in: the sharer's account blacklist, for this visit only (never saved). */
  visitBlacklist: string | null;
}

export interface PrefsApi {
  store: Store<Prefs>;
  /**
   * Saves. During a link's visit the sharer's blacklist stays in force and unsaved (UX §2), unless
   * this edit changes the saved blacklist itself: then the visitor's own list takes over.
   */
  setSearch(s: SearchSettings): void;
  /** Add or take away blacklist lines: the saved list, and the visit's while one is in force. */
  editBlacklist(edit: (lines: string) => string): void;
  setPlayback(p: PlaybackSettings): void;
  setSaved(list: SavedSearch[]): void;
  addHistory(tags: string): void;
  clearHistory(): void;
  /**
   * Replace the previous account lines with the account's current blacklist. A link's sign-in
   * applies it for this visit without saving. Returns the account's rule count.
   */
  syncAccount(account: string, visit: boolean): number;
  /** Leaving a link's sign-in drops its blacklist. */
  endVisit(): void;
}

/** The blacklist in force: a link visit's, else the saved one. */
export const blacklistOf = (p: Prefs): string => p.visitBlacklist ?? p.search.blacklist;

export function createPrefs(): PrefsApi {
  const store = createStore<Prefs>({
    search: storage.loadSearch(),
    playback: storage.loadPlayback(),
    saved: storage.loadSaved(),
    history: storage.loadHistory(),
    visitBlacklist: null,
  });
  return {
    store,
    setSearch(s) {
      storage.saveSearch(s);
      store.set((p) => ({ ...p, search: s, visitBlacklist: s.blacklist === p.search.blacklist ? p.visitBlacklist : null }));
    },
    editBlacklist(edit) {
      const p = store.get();
      const search = { ...p.search, blacklist: edit(p.search.blacklist) };
      storage.saveSearch(search);
      store.set({ ...p, search, visitBlacklist: p.visitBlacklist === null ? null : edit(p.visitBlacklist) });
    },
    setPlayback(pb) {
      storage.savePlayback(pb);
      store.set((p) => ({ ...p, playback: pb }));
    },
    setSaved(list) {
      storage.saveSaved(list);
      store.set((p) => ({ ...p, saved: list }));
    },
    addHistory(tags) {
      const h = pushHistory(store.get().history, tags, Date.now());
      if (h === store.get().history) return;
      storage.saveHistory(h);
      store.set((p) => ({ ...p, history: h }));
    },
    clearHistory() {
      storage.saveHistory([]);
      store.set((p) => ({ ...p, history: [] }));
    },
    syncAccount(account, visit) {
      const p = store.get();
      const blacklist = syncAccountBlacklist(p.search.blacklist, storage.loadAccountBlacklist(), account);
      if (visit) store.set({ ...p, visitBlacklist: blacklist });
      else {
        storage.saveSearch({ ...storage.loadSearch(), blacklist });
        storage.saveAccountBlacklist(account);
        store.set({ ...p, search: { ...p.search, blacklist } });
      }
      return account.split("\n").filter((l) => l.trim()).length;
    },
    endVisit() {
      store.set((p) => (p.visitBlacklist === null ? p : { ...p, visitBlacklist: null }));
    },
  };
}

let instance: PrefsApi | null = null;
export function getPrefs(): PrefsApi {
  if (!instance) instance = createPrefs();
  return instance;
}
/** Tests only. */
export function resetPrefs(): void {
  instance = null;
}
