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

/** For You's ranked list, so a reload or Back shows the same order (UX §3). */
export interface RankedList {
  /** the filters and account it was ranked for */
  key: string;
  /** the profile inputs it was ranked from (a later change offers Update ranking) */
  inputs: string;
  ids: number[];
  at: number;
}

/** Following's "new since" threshold for a session (UX §5), so a reload shows the same dots. */
export interface MarkerRecord {
  threshold: number;
  at: number;
  /** marked seen since: the next load starts a new session from e621's marker */
  marked: boolean;
}

/**
 * Per-account records that persist only with Remember on (DECISIONS: signed-in data at rest):
 * localStorage then, this tab's sessionStorage otherwise, so a reload still finds them.
 */
function readAccount<T>(key: string): T | null {
  for (const s of [() => localStorage, () => sessionStorage]) {
    try {
      const raw = s().getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // unreadable or off
    }
  }
  return null;
}
function writeAccount(key: string, value: unknown, remember: boolean): void {
  const stores = [() => localStorage, () => sessionStorage];
  stores.forEach((s, i) => {
    try {
      if (value === null || (i === 0) !== remember) s().removeItem(PREFIX + key);
      else s().setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // full or off: just not kept
    }
  });
}

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
  /** Whether share links carry the sign-in. Off until the user turns it on; cleared on sign-out. */
  loadShareSignIn: (): boolean => read("shareSignIn", false),
  saveShareSignIn: (on: boolean) => write("shareSignIn", on || null),
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
  /** For You's filters (media, ranking window, min score): kept across visits. Validated by the caller. */
  loadForYou: (): unknown => read<unknown>("forYou", null),
  saveForYou: (f: unknown) => write("forYou", f),
  /** Following's chips (media, hide favorited). Validated by the caller. */
  loadFollowing: (): unknown => read<unknown>("following", null),
  saveFollowing: (f: unknown) => write("following", f),
  /** For You's last ranked list for an account. Saved only with Remember on; sign-out removes it. */
  loadRanked: (username: string): RankedList | null => {
    const r = read<RankedList | null>(`ranked:${username}`, null);
    return r &&
      typeof r.key === "string" &&
      typeof r.inputs === "string" &&
      Array.isArray(r.ids) &&
      r.ids.every((id) => Number.isInteger(id) && id > 0) &&
      typeof r.at === "number"
      ? r
      : null;
  },
  saveRanked: (username: string, r: RankedList | null) => write(`ranked:${username}`, r),
  loadMarker: (username: string): MarkerRecord | null => {
    const m = readAccount<MarkerRecord>(`marker:${username}`);
    return m && Number.isInteger(m.threshold) && m.threshold >= 0 && typeof m.at === "number" ? { ...m, marked: m.marked === true } : null;
  },
  saveMarker: (username: string, m: MarkerRecord | null, remember: boolean) => writeAccount(`marker:${username}`, m, remember),
  /** Where Following marked seen itself when e621 didn't take it (the local marker fallback). */
  loadLocalSeen: (username: string): number => {
    const n = readAccount<number>(`seen:${username}`);
    return Number.isInteger(n) && (n as number) > 0 ? (n as number) : 0;
  },
  saveLocalSeen: (username: string, id: number | null, remember: boolean) => writeAccount(`seen:${username}`, id, remember),
  /** Everything kept for an account (sign-out, or a sign-in without Remember). */
  purgeAccount: (username: string) => {
    write(`ranked:${username}`, null);
    writeAccount(`marker:${username}`, null, false);
    writeAccount(`seen:${username}`, null, false);
  },
};

export function pushHistory(history: HistoryEntry[], tags: string, now: number): HistoryEntry[] {
  const t = tags.trim();
  if (!t) return history;
  return [{ tags: t, at: now }, ...history.filter((h) => h.tags !== t)].slice(0, HISTORY_MAX);
}
