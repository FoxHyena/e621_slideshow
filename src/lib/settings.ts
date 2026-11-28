import { DEFAULT_DATE_FILTER, type DateFilter } from "./query/date";

export type Order =
  | "newest"
  | "oldest"
  | "score"
  | "favcount"
  | "random"
  | "hot"
  | "comment_count"
  | "mpixels";

export const ORDER_LABELS: Record<Order, string> = {
  newest: "Newest",
  oldest: "Oldest",
  score: "Score",
  favcount: "Favorites",
  random: "Random (shuffle)",
  hot: "Hot",
  comment_count: "Most comments",
  mpixels: "Largest",
};

export type Source = "search" | "favorites" | "recommended";

/** Tune's Taste ↔ Popular: 0 is taste only, 2 counts popularity double (1, the middle, is even). */
export const QUALITY_WEIGHT_MAX = 2;

/** A saved Taste ↔ Popular, kept on the slider (missing or not a number: undefined, the even middle). */
export function qualityWeightOf(w: unknown): number | undefined {
  return typeof w === "number" && Number.isFinite(w) ? Math.min(QUALITY_WEIGHT_MAX, Math.max(0, w)) : undefined;
}

/** How many top profile tags Recommended ORs together to find candidates. */
export const BREADTH_MIN = 2;
export const BREADTH_MAX = 30;

/** Everything that changes which posts are fetched. Changing any of it restarts the show. */
export interface SearchSettings {
  /**
   * `search` plays `tags`; `favorites` plays the signed-in user's favorites (`fav:<name>`);
   * `recommended` ranks a date window by the user's favorites
   */
  source: Source;
  /** Recommended only: top-N tags used to gather candidates (capped by the tag budget) */
  breadth: number;
  /**
   * Recommended only: when the top tags run out, go on with the next ones by weight (searchTiers'
   * rounds). Off by default (owner, 2026-11-27: the wider search made the feed "a little less tuned");
   * missing in settings saved before it, which reads as off.
   */
  moreTags?: boolean;
  /**
   * Recommended only: Tune's Taste ↔ Popular, how much a post's favorites (against posts its age)
   * count beside its taste in the final order (rank.ts QUALITY_WEIGHT is the even middle, 1). Missing
   * reads as 1. Re-sorts a finished ranking without searching again.
   */
  qualityWeight?: number;
  tags: string;
  ratings: { s: boolean; q: boolean; e: boolean };
  media: { image: boolean; gif: boolean; video: boolean };
  order: Order;
  /** used with order:random so pages don't repeat; re-rolled by "Reshuffle" */
  seed: number;
  blacklist: string;
  date: DateFilter;
  /** only posts with at least this e621 score; null = off */
  minScore: number | null;
}

export type SlideStyle = "classic" | "prints" | "kenburns" | "collage" | "reflections";

export const STYLE_LABELS: Record<SlideStyle, string> = {
  classic: "Classic",
  prints: "Vintage Prints",
  kenburns: "Ken Burns",
  collage: "Collage",
  reflections: "Reflections",
};

/** Everything that only changes how posts are shown. Applied live. */
export interface PlaybackSettings {
  /** Classic honours `fit` and `transition`; the other styles bring their own. */
  style: SlideStyle;
  intervalSec: number;
  preloadCount: number;
  fit: "contain" | "cover" | "original";
  transition: "fade" | "none";
  quality: "original" | "sample";
  videoMuted: boolean;
  /** 0 = play videos to their end */
  videoMaxSec: number;
  loop: boolean;
}

export const DEFAULT_SEARCH: SearchSettings = {
  source: "search",
  breadth: 15,
  moreTags: false,
  tags: "",
  ratings: { s: true, q: true, e: true },
  media: { image: true, gif: true, video: true },
  order: "newest",
  seed: 1,
  blacklist: "",
  date: DEFAULT_DATE_FILTER,
  minScore: null,
};

export const DEFAULT_PLAYBACK: PlaybackSettings = {
  style: "classic",
  intervalSec: 6,
  preloadCount: 4,
  fit: "contain",
  transition: "fade",
  quality: "original",
  videoMuted: true,
  videoMaxSec: 60,
  loop: true,
};

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}
