import type { Post, PostFiles, PostStats } from "../e621/types";

let nextId = 1000;

type MetaOver = Partial<PostFiles["meta"]>;
type OriginalOver = Partial<PostFiles["original"]>;

/**
 * A post in e621's `mode=extended` format. Nested groups are partial overrides:
 * `{ meta: { ext: "webm" } }` changes only the extension.
 */
export function makePost(
  over: Omit<Partial<Post>, "files" | "stats"> & {
    tagList?: string[];
    meta?: MetaOver;
    original?: OriginalOver;
    sample?: Partial<PostFiles["sample"]>;
    stats?: Partial<PostStats>;
  } = {},
): Post {
  const { tagList, meta, original, sample, stats, ...rest } = over;
  const id = rest.id ?? nextId++;
  return {
    id,
    created_at: "2024-01-01T00:00:00Z",
    files: {
      meta: { md5: "abc", ext: "png", size: 500_000, duration: null, has_sample: true, ...meta },
      original: { width: 1000, height: 800, url: `https://static1.e621.net/data/${id}.png`, ...original },
      preview: { width: 150, height: 120, jpg: null, webp: null },
      sample: { width: 850, height: 680, jpg: `https://static1.e621.net/data/sample/${id}.jpg`, webp: null, ...sample },
    },
    stats: { score: { up: 10, down: 0, total: 10 }, fav_count: 5, is_favorited: false, ...stats },
    tags: { general: tagList ?? ["wolf"] },
    rating: "s",
    ...rest,
  };
}
