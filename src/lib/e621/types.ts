export type Rating = "s" | "q" | "e";

/** A rendition's image URLs. Both are null when e621 hides the post from this viewer. */
export interface PostImage {
  width: number;
  height: number;
  jpg: string | null;
  webp: string | null;
}

/** e621's `files` group (the posts API format since 2026-11-18). */
export interface PostFiles {
  meta: {
    md5: string;
    ext: string;
    size: number;
    /** seconds, videos only */
    duration: number | null;
    has_sample: boolean;
  };
  /** `url` is null when e621 hides the post from this viewer */
  original: { width: number; height: number; url: string | null };
  preview: PostImage;
  /** falls back to the original file when the post has no sample */
  sample: PostImage;
  /** videos only */
  video?: {
    has?: boolean;
    variants?: { mp4?: { url: string | null } };
    samples?: Record<string, { url: string | null }>;
  };
}

export interface PostStats {
  score: { up: number; down: number; total: number };
  fav_count: number;
  is_favorited: boolean;
}

export type TagCategoryName =
  | "general"
  | "artist"
  | "contributor"
  | "copyright"
  | "character"
  | "species"
  | "invalid"
  | "meta"
  | "lore";

/** A post as `/posts.json` and `/favorites.json` return it with `mode=extended`; only the fields we read. */
export interface Post {
  id: number;
  created_at: string;
  files: PostFiles;
  stats: PostStats;
  /** grouped by category; `mode=extended` only (the default `basic` mode sends a flat list) */
  tags: Partial<Record<TagCategoryName, string[]>>;
  rating: Rating;
  uploader_id?: number;
  uploader_name?: string;
  pools?: number[];
  sources?: string[];
  /** DText */
  description?: string;
  flags?: { deleted?: boolean; pending?: boolean; flagged?: boolean };
}

/** An e621 pool: a "series" is a comic, its pages in `post_ids` order (DESIGN.md "A comic"). */
export interface Pool {
  id: number;
  name: string;
  category: "series" | "collection";
  post_ids: number[];
  updated_at?: string;
}

export interface AutocompleteTag {
  id: number;
  name: string;
  post_count: number;
  category: number;
  antecedent_name: string | null;
}

export interface CurrentUser {
  id: number | null;
  name: string;
  blacklisted_tags?: string;
  tag_query_limit?: number;
}

/** `/users/<id>.json`; only the fields we read. */
export interface UserProfile {
  id: number;
  name: string;
  favorite_count: number;
}

/** `/tags.json` row. `category` is numeric; see TAG_CATEGORIES. */
export interface TagInfo {
  name: string;
  post_count: number;
  category: number;
}

export const TAG_CATEGORIES: Record<number, TagCategoryName> = {
  0: "general",
  1: "artist",
  2: "contributor",
  3: "copyright",
  4: "character",
  5: "species",
  6: "invalid",
  7: "meta",
  8: "lore",
};

/** Colors match e621's own dark theme tag colors. */
export const TAG_CATEGORY_COLORS: Record<TagCategoryName, string> = {
  general: "#b4c7d9",
  artist: "#f2ac08",
  contributor: "#c0c0c0",
  copyright: "#d0d",
  character: "#0a0",
  species: "#ed5d1f",
  invalid: "#ff3d3d",
  meta: "#fff",
  lore: "#228822",
};

export function allTags(post: Post): string[] {
  return Object.values(post.tags).flatMap((t) => t ?? []);
}

export type MediaKind = "image" | "gif" | "video" | "other";

export function mediaKind(post: Post): MediaKind {
  const ext = post.files.meta.ext;
  if (ext === "webm" || ext === "mp4") return "video";
  if (ext === "gif") return "gif";
  if (ext === "jpg" || ext === "png" || ext === "webp") return "image";
  return "other";
}

/** A row of GET /tag_subscriptions.json (e621ng TagSubscriptionBlueprint). */
export interface TagSubscription {
  id: number;
  tag_id: number;
  tag_name: string;
  category: number;
  created_at: string;
}

/** POST /tag_subscriptions.json: the rows added, and each tag skipped with e621's reason. */
export interface SubscribeResult {
  added: TagSubscription[];
  skipped: { name: string; reason: string }[];
}

/**
 * A row of GET /saved_searches.json. The hidden "subscriptions" anchor (`is_subscription`) holds
 * the "new since last visit" marker for followed tags (e621ng SavedSearchBlueprint).
 */
export interface SavedSearchRow {
  id: number;
  name: string;
  query: string;
  is_tracked: boolean;
  is_subscription: boolean;
  /** posts above this id are new */
  last_seen_post_id: number | null;
  /** followed tags (the anchor only) */
  tag_count?: number | null;
  /** posts above the marker, capped at 100 by e621; null when e621 didn't count */
  new_count?: number | null;
}
