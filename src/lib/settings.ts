import { DEFAULT_BLACKLIST } from "./query/blacklist";
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

/** Everything that changes which posts are fetched. Changing any of it restarts the show. */
export interface SearchSettings {
  tags: string;
  ratings: { s: boolean; q: boolean; e: boolean };
  media: { image: boolean; gif: boolean; video: boolean };
  order: Order;
  /** used with order:random so pages don't repeat; re-rolled by "Reshuffle" */
  seed: number;
  blacklist: string;
  date: DateFilter;
}

/** Everything that only changes how posts are shown. Applied live. */
export interface PlaybackSettings {
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
  tags: "",
  ratings: { s: true, q: true, e: true },
  media: { image: true, gif: true, video: true },
  order: "newest",
  seed: 1,
  blacklist: DEFAULT_BLACKLIST,
  date: DEFAULT_DATE_FILTER,
};

export const DEFAULT_PLAYBACK: PlaybackSettings = {
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
