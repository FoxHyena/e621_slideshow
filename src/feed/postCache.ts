/**
 * Posts asked of e621 one at a time this visit (the post page, the picture viewer opened from a link),
 * by whose sign-in asked and the post's number. One answer per post a visit, so Back and forward, and
 * the viewer opened from a post's page, don't ask again. null: e621 has no such post (or it was
 * deleted). In memory only.
 */
import type { Post } from "@/lib/e621/types";

const known = new Map<string, Post | null>();
const keyOf = (user: string | null | undefined, id: number | string) => `${user ?? ""}:${id}`;

export const knownPost = (user: string | null | undefined, id: number | string) => known.get(keyOf(user, id));
export const hasKnownPost = (user: string | null | undefined, id: number | string) => known.has(keyOf(user, id));

/** e621's answer to `id:<n>`: a deleted post counts as none (its page says it may have been deleted). */
function remember(user: string | null | undefined, id: number | string, found: Post | undefined): Post | null {
  const p = found && !found.flags?.deleted ? found : null;
  known.set(keyOf(user, id), p);
  return p;
}

/** Posts that came in a batch (a comic's pages): their pages and the viewer don't ask again. */
export function rememberPosts(user: string | null | undefined, ids: readonly number[], found: Map<number, Post>) {
  for (const id of ids) if (!known.has(keyOf(user, id))) remember(user, id, found.get(id));
}

const asking = new Map<string, Promise<Post | null>>();
/**
 * Ask e621 for one post, once: a second ask while the first is out (an effect run twice, the viewer
 * opened from the page) shares its answer. A failed ask is forgotten, so Try again asks anew.
 */
export function askPost(user: string | null | undefined, id: number | string, ask: () => Promise<Post[]>): Promise<Post | null> {
  const key = keyOf(user, id);
  let p = asking.get(key);
  if (!p) {
    p = ask()
      .then((ps) => remember(user, id, ps[0]))
      .finally(() => asking.delete(key));
    asking.set(key, p);
  }
  return p;
}
