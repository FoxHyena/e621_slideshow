/**
 * Following's feed rows (UX §5 Following, ENGINEERING.md §4). Pure, so every rule is unit-tested:
 * which posts are new, where the "You're caught up" divider goes, how runs of one artist's new
 * posts fold into a "+N more" row, and the subtitle.
 */
import type { Post } from "../e621/types";
import { artists } from "../feed/format";
import type { FeedRow } from "../feed/layout";

export type { FeedRow };

/** A run of new posts by one artist folds from this many posts. */
export const BURST_MIN = 5;
/** A folded run shows its first few posts above the "+N more" row. */
export const BURST_SHOWN = 3;

type Slim = Pick<Post, "id" | "tags">;

/** New means above e621's marker as read at the start of the session (the threshold). */
export function isNew(post: Pick<Post, "id">, threshold: number | null): boolean {
  return threshold !== null && post.id > threshold;
}

/**
 * Where the divider goes: before the first post at or below the threshold. Null while there's
 * no threshold, when nothing loaded is new (the subtitle says "All caught up"), or while every
 * post so far is new and more are coming (the divider isn't reached yet). When every post is
 * new and there are no more, it goes after the last one.
 */
export function dividerIndex(posts: Pick<Post, "id">[], threshold: number | null, exhausted: boolean): number | null {
  if (threshold === null || posts.length === 0) return null;
  const i = posts.findIndex((p) => !isNew(p, threshold));
  if (i === 0) return null;
  if (i > 0) return i;
  return exhausted ? posts.length : null;
}

/**
 * The rows the feed shows. Among new posts, a run is consecutive posts that share their first
 * artist; a run of 5+ shows its first 3, then "+N more from <artist>". Runs never cross the
 * divider, posts without an artist never form one, and a run in `expanded` (by its first post's
 * id) shows whole.
 */
export function feedRows(posts: Slim[], threshold: number | null, divider: number | null, expanded: ReadonlySet<number>): FeedRow[] {
  const rows: FeedRow[] = [];
  const newEnd = divider ?? (threshold === null ? 0 : posts.length);
  let i = 0;
  while (i < posts.length) {
    if (i === divider) rows.push({ kind: "divider" });
    const artist = i < newEnd && isNew(posts[i], threshold) ? artists(posts[i])[0] : undefined;
    let j = i + 1;
    if (artist) while (j < newEnd && isNew(posts[j], threshold) && artists(posts[j])[0] === artist) j++;
    const len = j - i;
    // Open if any of its posts was a run's first when opened: newer posts may have joined its head.
    let open = false;
    for (let k = i; k < j && !open; k++) open = expanded.has(posts[k].id);
    if (artist && len >= BURST_MIN && !open) {
      for (let k = i; k < i + BURST_SHOWN; k++) rows.push({ kind: "post", index: k });
      rows.push({ kind: "more", run: posts[i].id, artist, count: len - BURST_SHOWN });
    } else {
      for (let k = i; k < j; k++) rows.push({ kind: "post", index: k });
    }
    i = j;
  }
  if (divider !== null && divider === posts.length) rows.push({ kind: "divider" });
  return rows;
}

/**
 * The subtitle: "12 new", "40+ new" while more new posts may still be on the next pages,
 * "All caught up" when nothing is new. Empty while the first new posts are still loading.
 */
export function newCountLabel(count: number, more: boolean): string {
  if (more) return count > 0 ? `${count}+ new` : "";
  return count > 0 ? `${count} new` : "All caught up";
}
