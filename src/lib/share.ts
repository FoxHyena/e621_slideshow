import type { Credentials } from "./e621/client";
import type { DateFilter, DateMode, DatePreset, DateUnit } from "./query/date";
import {
  DEFAULT_PLAYBACK,
  DEFAULT_SEARCH,
  ORDER_LABELS,
  STYLE_LABELS,
  type Order,
  type PlaybackSettings,
  type SearchSettings,
  type SlideStyle,
} from "./settings";

/**
 * Share links carry the search and how it plays, as short query params that
 * only list what differs from the defaults. The blacklist stays out (the
 * recipient's own applies), and so does everything Recommended-only, since that
 * ranks by the sharer's favorites. Decoding drops any field it doesn't accept.
 */

const VERSION = "1";

/** The parts of a show a link can set; anything missing takes the default. */
export interface SharedShow {
  search: Pick<SearchSettings, "tags" | "ratings" | "media" | "order" | "seed" | "date" | "minScore">;
  playback: Omit<PlaybackSettings, "preloadCount">;
}

const RATINGS = ["s", "q", "e"] as const;
const MEDIA = { i: "image", g: "gif", v: "video" } as const;
const DATE_MODES: DateMode[] = ["preset", "on", "after", "before", "between", "within"];
const DATE_PRESETS: DatePreset[] = ["today", "yesterday", "week", "month", "year"];
const DATE_UNITS: DateUnit[] = ["days", "weeks", "months", "years"];
const FITS: PlaybackSettings["fit"][] = ["contain", "cover", "original"];
const TRANSITIONS: PlaybackSettings["transition"][] = ["fade", "none"];
const QUALITIES: PlaybackSettings["quality"][] = ["original", "sample"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function encodeShare(search: SearchSettings, playback: PlaybackSettings): string {
  const p = new URLSearchParams({ v: VERSION });
  const s = search;
  const set = (key: string, value: string, fallback: string) => {
    if (value !== fallback) p.set(key, value);
  };

  set("tags", s.tags.trim(), "");
  set("r", RATINGS.filter((r) => s.ratings[r]).join(""), "sqe");
  const media = Object.entries(MEDIA).filter(([, m]) => s.media[m]).map(([k]) => k).join("");
  set("m", media, "igv");
  set("order", s.order, DEFAULT_SEARCH.order);
  if (s.order === "random") p.set("seed", String(s.seed));
  if (s.minScore != null) p.set("min", String(s.minScore));
  if (s.date.enabled) {
    p.set("d", s.date.mode);
    if (s.date.mode === "preset") p.set("dp", s.date.preset);
    else if (s.date.mode === "within") {
      p.set("dn", String(s.date.amount));
      p.set("du", s.date.unit);
    } else {
      p.set("d1", s.date.date);
      if (s.date.mode === "between") p.set("d2", s.date.date2);
    }
  }

  const d = DEFAULT_PLAYBACK;
  set("style", playback.style, d.style);
  set("int", String(playback.intervalSec), String(d.intervalSec));
  set("fit", playback.fit, d.fit);
  set("tr", playback.transition, d.transition);
  set("q", playback.quality, d.quality);
  set("mute", playback.videoMuted ? "1" : "0", d.videoMuted ? "1" : "0");
  set("vmax", String(playback.videoMaxSec), String(d.videoMaxSec));
  set("loop", playback.loop ? "1" : "0", d.loop ? "1" : "0");
  return p.toString();
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function int<F extends number | null>(value: string | null, min: number, max: number, fallback: F): number | F {
  if (value === null || !/^-?\d+$/.test(value)) return fallback;
  const n = Number(value);
  return n >= min && n <= max ? n : fallback;
}

function bool(value: string | null, fallback: boolean): boolean {
  return value === "1" ? true : value === "0" ? false : fallback;
}

/** The show a link describes, or null if the URL isn't a share link. */
export function decodeShare(params: URLSearchParams): SharedShow | null {
  if (params.get("v") !== VERSION) return null;
  const get = (k: string) => params.get(k);
  const S = DEFAULT_SEARCH;
  const P = DEFAULT_PLAYBACK;

  const r = get("r");
  const ratings = r === null || !/^[sqe]*$/.test(r) ? S.ratings : { s: r.includes("s"), q: r.includes("q"), e: r.includes("e") };
  const m = get("m");
  const media = m === null || !/^[igv]*$/.test(m) ? S.media : { image: m.includes("i"), gif: m.includes("g"), video: m.includes("v") };

  const mode = get("d");
  const date: DateFilter =
    mode !== null && DATE_MODES.includes(mode as DateMode)
      ? {
          ...S.date,
          enabled: true,
          mode: mode as DateMode,
          preset: oneOf(get("dp"), DATE_PRESETS, S.date.preset),
          date: ISO_DATE.test(get("d1") ?? "") ? get("d1")! : "",
          date2: ISO_DATE.test(get("d2") ?? "") ? get("d2")! : "",
          amount: int(get("dn"), 1, 10_000, S.date.amount),
          unit: oneOf(get("du"), DATE_UNITS, S.date.unit),
        }
      : S.date;

  return {
    search: {
      tags: (get("tags") ?? "").trim(),
      ratings,
      media,
      order: oneOf(get("order"), Object.keys(ORDER_LABELS) as Order[], S.order),
      seed: int(get("seed"), 1, 1_000_000, S.seed),
      date,
      minScore: int(get("min"), -1_000_000, 1_000_000, null),
    },
    playback: {
      style: oneOf(get("style"), Object.keys(STYLE_LABELS) as SlideStyle[], P.style),
      intervalSec: int(get("int"), 1, 300, P.intervalSec),
      fit: oneOf(get("fit"), FITS, P.fit),
      transition: oneOf(get("tr"), TRANSITIONS, P.transition),
      quality: oneOf(get("q"), QUALITIES, P.quality),
      videoMuted: bool(get("mute"), P.videoMuted),
      videoMaxSec: int(get("vmax"), 0, 3600, P.videoMaxSec),
      loop: bool(get("loop"), P.loop),
    },
  };
}

/**
 * Sign-in rides in the fragment, never the query: browsers don't send `#...`
 * to the server, so the key stays out of host logs and link-preview fetches.
 */
export function encodeShareCreds(c: Credentials): string {
  return new URLSearchParams({ u: c.username, k: c.apiKey }).toString();
}

export function decodeShareCreds(hash: string): Credentials | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const username = p.get("u")?.trim() ?? "";
  const apiKey = p.get("k")?.trim() ?? "";
  if (!username || /\s/.test(username) || username.length > 64) return null;
  if (!/^[A-Za-z0-9]{1,128}$/.test(apiKey)) return null;
  return { username, apiKey };
}

/**
 * A launch link (`?tags=wolf+solo`, `?mode=recommended`) is how the userscript
 * hands a search over from e621. Unlike a share link it's the visitor's own
 * launch, so it changes only what it names and the rest of their saved
 * settings stay.
 */
export interface Launch {
  /** play these tags (a search) */
  tags?: string;
  /** play Recommended from the visitor's own favorites */
  recommended?: boolean;
}

/** Longer than any real query; keeps a hostile URL from filling the tag box. */
const MAX_LAUNCH_TAGS = 2000;

/** The launch a URL asks for, or null if it isn't a launch link (share links included). */
export function decodeLaunch(params: URLSearchParams): Launch | null {
  if (params.has("v")) return null;
  if (params.get("mode") === "recommended") return { recommended: true };
  const raw = params.get("tags");
  if (raw === null) return null;
  // e621's search box separates tags with any whitespace; keep one space.
  const tags = raw.trim().split(/\s+/).filter(Boolean).join(" ");
  if (!tags || tags.length > MAX_LAUNCH_TAGS) return null;
  return { tags };
}
