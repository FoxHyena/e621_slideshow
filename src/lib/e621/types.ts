export type Rating = "s" | "q" | "e";

export interface PostFile {
  width: number;
  height: number;
  ext: string;
  size: number;
  md5: string;
  url: string | null;
}

export interface PostSample {
  has: boolean;
  width: number;
  height: number;
  url: string | null;
  alternates?: {
    has?: boolean;
    variants?: { mp4?: { url: string | null } };
    samples?: Record<string, { url: string | null }>;
  };
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

export interface Post {
  id: number;
  created_at: string;
  file: PostFile;
  preview: { width: number; height: number; url: string | null };
  sample: PostSample;
  score: { up: number; down: number; total: number };
  tags: Partial<Record<TagCategoryName, string[]>>;
  rating: Rating;
  fav_count: number;
  is_favorited: boolean;
  uploader_id?: number;
  uploader_name?: string;
  pools?: number[];
  sources?: string[];
  duration: number | null;
  flags?: { deleted?: boolean; pending?: boolean; flagged?: boolean };
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
  const ext = post.file.ext;
  if (ext === "webm" || ext === "mp4") return "video";
  if (ext === "gif") return "gif";
  if (ext === "jpg" || ext === "png" || ext === "webp") return "image";
  return "other";
}
