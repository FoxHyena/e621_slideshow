import type { Credentials } from "./e621/client";
import { DEFAULT_BLACKLIST } from "./query/blacklist";
import type { DateFilter } from "./query/date";
import type { Profile } from "./recommend/profile";
import { EMPTY_TAG_CACHE, type TagCache } from "./recommend/sync";
import { NO_OVERRIDES, type Overrides } from "./recommend/weights";
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

/** Returns false when storage is full or disabled; callers that care can say so. */
function write(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // storage full or disabled: settings just won't persist
    return false;
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
    // Earlier versions pre-filled e621's anonymous default blacklist. Clear it
    // if it was never edited; any change the user made is kept as-is.
    const blacklist = s.blacklist.trim() === DEFAULT_BLACKLIST ? "" : s.blacklist;
    return {
      ...s,
      blacklist,
      ratings: { ...DEFAULT_SEARCH.ratings, ...s.ratings },
      media: { ...DEFAULT_SEARCH.media, ...s.media },
      date: { ...DEFAULT_SEARCH.date, ...s.date },
      minScore: s.minScore ?? null,
    };
  },
  saveSearch: (s: SearchSettings) => {
    write("search", s);
  },
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
  /** Favorites tag profile, per account. Can be large; save returns false if it didn't fit. */
  loadProfile: (username: string): Profile | null => {
    const p = read<Profile | null>(`profile:${username}`, null);
    return p && Array.isArray(p.favIds) && p.tags ? p : null;
  },
  saveProfile: (p: Profile): boolean => write(`profile:${p.username}`, p),
  /** Global tag counts are the same for everyone, so one cache serves every account. */
  loadTagCache: (): TagCache => read("tagCache", EMPTY_TAG_CACHE),
  saveTagCache: (c: TagCache): boolean => write("tagCache", c),
  loadOverrides: (username: string): Overrides => read(`overrides:${username}`, NO_OVERRIDES),
  saveOverrides: (username: string, o: Overrides) => write(`overrides:${username}`, o),
};

export function pushHistory(history: HistoryEntry[], tags: string, now: number): HistoryEntry[] {
  const t = tags.trim();
  if (!t) return history;
  return [{ tags: t, at: now }, ...history.filter((h) => h.tags !== t)].slice(0, HISTORY_MAX);
}
