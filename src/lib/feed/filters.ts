/**
 * Per-feed filters (UX §5 "Filters (chips row)") and the URL they live in.
 *
 * Results and Favorites keep their filters in the URL, in the share-link format, so a reload, Back
 * and a copied link all agree. A Results URL opened from a link also carries the link's marker:
 * `v=1` (a share link: its ratings and playback apply for this visit) or `l=1` (a userscript launch:
 * every rating, your playback).
 */
import { DEFAULT_DATE_FILTER, type DateFilter } from "../query/date";
import { readPlayback, readSearch, writePlayback, writeSearch, type SharedShow } from "../share";
import { DEFAULT_SEARCH, type Order, type SearchSettings } from "../settings";

export interface Filters {
  media: SearchSettings["media"];
  order: Order;
  /** order:random only */
  seed: number;
  date: DateFilter;
  minScore: number | null;
  /** hide posts already favorited when the page loaded */
  hideFaved: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  media: DEFAULT_SEARCH.media,
  order: "newest",
  seed: 1,
  date: DEFAULT_DATE_FILTER,
  minScore: null,
  hideFaved: false,
};

export type LinkOrigin = { kind: "share"; ratings: SearchSettings["ratings"]; playback: SharedShow["playback"] } | { kind: "launch" };

export interface ResultsParams {
  tags: string;
  filters: Filters;
  /** set when the Results came from an outside link: its settings apply for this visit only */
  link: LinkOrigin | null;
}

export function decodeFilters(params: URLSearchParams): Filters {
  const s = readSearch(params);
  return {
    media: s.media,
    order: s.order,
    seed: s.seed,
    date: s.date,
    minScore: s.minScore,
    hideFaved: params.get("hf") === "1",
  };
}

export function writeFilters(p: URLSearchParams, f: Filters): void {
  writeSearch(p, { tags: "", ratings: DEFAULT_SEARCH.ratings, media: f.media, order: f.order, seed: f.seed, date: f.date, minScore: f.minScore });
  if (f.hideFaved) p.set("hf", "1");
}

/** One space between tags, none at the ends. */
export const normTags = (s: string): string => s.trim().split(/\s+/).filter(Boolean).join(" ");

export function decodeResults(query: string): ResultsParams {
  const params = new URLSearchParams(query);
  const tags = normTags(params.get("tags") ?? "");
  const link: LinkOrigin | null =
    params.get("v") === "1"
      ? { kind: "share", ratings: readSearch(params).ratings, playback: readPlayback(params) }
      : params.get("l") === "1"
        ? { kind: "launch" }
        : null;
  return { tags, filters: decodeFilters(params), link };
}

/** The query string (no `?`) for a Results screen. */
export function encodeResults(r: ResultsParams): string {
  const p = new URLSearchParams();
  if (r.link?.kind === "share") p.set("v", "1");
  if (r.link?.kind === "launch") p.set("l", "1");
  p.set("tags", normTags(r.tags));
  writeFilters(p, r.filters);
  if (r.link?.kind === "share") {
    const ratings = (["s", "q", "e"] as const).filter((k) => r.link?.kind === "share" && r.link.ratings[k]).join("");
    if (ratings !== "sqe") p.set("r", ratings);
    writePlayback(p, r.link.playback);
  }
  return p.toString();
}

export function encodeFilters(f: Filters): string {
  const p = new URLSearchParams();
  writeFilters(p, f);
  return p.toString();
}

/** The e621 search a feed runs: its tags and filters plus the account-wide ratings and blacklist. */
export function searchFor(tags: string, f: Filters, ratings: SearchSettings["ratings"], blacklist: string): SearchSettings {
  return {
    ...DEFAULT_SEARCH,
    source: "search",
    tags,
    ratings,
    media: f.media,
    order: f.order,
    seed: f.seed,
    date: f.date,
    minScore: f.minScore,
    blacklist,
  };
}

// ---- chip labels -------------------------------------------------------------

export const SORT_MAIN: Order[] = ["newest", "score", "hot"];
export const SORT_MORE: Order[] = ["oldest", "favcount", "random", "comment_count", "mpixels"];
export const SORT_LABEL: Record<Order, string> = {
  newest: "New",
  score: "Top",
  hot: "Hot",
  oldest: "Oldest",
  favcount: "Most favorited",
  random: "Random",
  comment_count: "Most comments",
  mpixels: "Largest",
};

export const SCORE_STEPS = [10, 50, 100, 500] as const;

/** The chip's value when it isn't the default, else null. */
export function mediaLabel(m: Filters["media"]): string | null {
  const on = (["image", "gif", "video"] as const).filter((k) => m[k]);
  if (on.length === 3) return null;
  if (on.length === 0) return "Nothing";
  const names = { image: "Images", gif: "GIFs", video: "Videos" };
  return on.map((k) => names[k]).join(", ");
}

export function sortLabel(o: Order): string | null {
  return o === "newest" ? null : SORT_LABEL[o];
}

export function dateLabel(d: DateFilter): string | null {
  if (!d.enabled) return null;
  switch (d.mode) {
    case "preset":
      return { today: "Today", yesterday: "Yesterday", week: "This week", month: "This month", year: "This year" }[d.preset];
    case "on":
      return d.date ? `On ${d.date}` : null;
    case "after":
      return d.date ? `Since ${d.date}` : null;
    case "before":
      return d.date ? `Before ${d.date}` : null;
    case "between":
      return d.date && d.date2 ? `${d.date} – ${d.date2}` : null;
    case "within":
      return `Last ${d.amount} ${d.amount === 1 ? d.unit.replace(/s$/, "") : d.unit}`;
  }
}

export function scoreLabel(min: number | null): string | null {
  return min === null ? null : `≥ ${min}`;
}

export function isDefaultFilters(f: Filters): boolean {
  return (
    mediaLabel(f.media) === null && f.order === "newest" && dateLabel(f.date) === null && f.minScore === null && !f.hideFaved
  );
}
