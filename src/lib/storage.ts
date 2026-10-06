import type { Credentials } from "./e621/client";
import type { DateFilter } from "./query/date";
import {
  DEFAULT_PLAYBACK,
  DEFAULT_SEARCH,
  type PlaybackSettings,
  type SearchSettings,
} from "./settings";

const PREFIX = "e6ss:v1:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    // Shallow-merge objects so new settings fields get their defaults.
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed };
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or disabled: settings just won't persist
  }
}

export interface SavedSearch {
  id: string;
  name: string;
  tags: string;
  ratings: SearchSettings["ratings"];
  date: DateFilter;
  order: SearchSettings["order"];
}

export interface HistoryEntry {
  tags: string;
  at: number;
}

export const HISTORY_MAX = 20;

export const storage = {
  loadSearch: (): SearchSettings => {
    const s = read("search", DEFAULT_SEARCH);
    return {
      ...s,
      ratings: { ...DEFAULT_SEARCH.ratings, ...s.ratings },
      media: { ...DEFAULT_SEARCH.media, ...s.media },
      date: { ...DEFAULT_SEARCH.date, ...s.date },
    };
  },
  saveSearch: (s: SearchSettings) => write("search", s),
  loadPlayback: (): PlaybackSettings => read("playback", DEFAULT_PLAYBACK),
  savePlayback: (p: PlaybackSettings) => write("playback", p),
  /** Only present when the user ticked "remember on this device". */
  loadCredentials: (): Credentials | null => read<Credentials | null>("creds", null),
  saveCredentials: (c: Credentials | null) => write("creds", c),
  loadSaved: (): SavedSearch[] => read<SavedSearch[]>("saved", []),
  saveSaved: (s: SavedSearch[]) => write("saved", s),
  loadHistory: (): HistoryEntry[] => read<HistoryEntry[]>("history", []),
  saveHistory: (h: HistoryEntry[]) => write("history", h),
  /** The account blacklist as of the last sync, so the next sync can tell its lines from local ones. */
  loadAccountBlacklist: (): string => read("accountBlacklist", ""),
  saveAccountBlacklist: (t: string) => write("accountBlacklist", t),
  /** Which collapsible settings sections are expanded. */
  loadSections: (): Record<string, boolean> => read<Record<string, boolean>>("sections", {}),
  saveSections: (s: Record<string, boolean>) => write("sections", s),
};

export function pushHistory(history: HistoryEntry[], tags: string, now: number): HistoryEntry[] {
  const t = tags.trim();
  if (!t) return history;
  return [{ tags: t, at: now }, ...history.filter((h) => h.tags !== t)].slice(0, HISTORY_MAX);
}
