import type { Post } from "../e621/types";

let nextId = 1000;

export function makePost(over: Partial<Post> & { tagList?: string[] } = {}): Post {
  const { tagList, ...rest } = over;
  const id = rest.id ?? nextId++;
  return {
    id,
    created_at: "2024-01-01T00:00:00Z",
    file: { width: 1000, height: 800, ext: "png", size: 500_000, md5: "abc", url: `https://static1.e621.net/data/${id}.png` },
    preview: { width: 150, height: 120, url: null },
    sample: { has: true, width: 850, height: 680, url: `https://static1.e621.net/data/sample/${id}.jpg` },
    score: { up: 10, down: 0, total: 10 },
    tags: { general: tagList ?? ["wolf"] },
    rating: "s",
    fav_count: 5,
    is_favorited: false,
    duration: null,
    ...rest,
  };
}
