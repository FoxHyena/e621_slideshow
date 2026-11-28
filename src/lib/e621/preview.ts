/**
 * A post link's preview (DESIGN.md "A post on its own", "The link's preview"), answered by the server
 * so a chat app sees it before any script runs. Signed out always: the server never has anyone's key,
 * so it sees what e621 shows a visitor. The picture is the post's sample whatever its rating (owner,
 * 2026-11-27: "Picture"); a post e621 hides from signed-out visitors gets the drawn card instead.
 */
import type { Metadata } from "next";
import { artists, compact, NOBODY } from "../feed/format";
import type { Post, Rating } from "./types";

const E621 = "https://e621.net";
/** e621 asks scripts to name themselves; no user or account is in it. */
export const PREVIEW_UA = "eLicks21/1.0 (link previews)";
export const SITE = "eLicks21";
export const RATING_NAME: Record<Rating, string> = { s: "Safe", q: "Questionable", e: "Explicit" };

/** Posts asked for lately, good answers only, for ten minutes; the card's ask right after the page's reuses it. */
const recent = new Map<number, { at: number; post: Promise<Post | null> }>();
const KEEP_MS = 10 * 60_000;

/** The post as a signed-out visitor sees it, or null (not found, deleted, e621 slow or down). */
export function previewPost(id: number): Promise<Post | null> {
  const hit = recent.get(id);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.post;
  const post = askE621(id);
  recent.set(id, { at: Date.now(), post });
  if (recent.size > 500) recent.delete(recent.keys().next().value!);
  // only a found post is kept: a failure (or Cloudflare's challenge page) is asked again next time
  void post.then((p) => {
    if (!p && recent.get(id)?.post === post) recent.delete(id);
  });
  return post;
}

async function askE621(id: number): Promise<Post | null> {
  try {
    const url = `${E621}/posts.json?tags=id:${id}&limit=1&mode=extended`;
    // 3 s at most: a chat app gives up on a slow page. Not Next's fetch cache: it would keep a
    // challenge page that came back 200 as HTML; `recent` keeps good answers only.
    const res = await fetch(url, { headers: { "User-Agent": PREVIEW_UA }, signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
    const list: unknown = await res.json();
    const post = Array.isArray(list) ? (list as Post[]).find((p) => p?.id === id) : undefined;
    return post && !post.flags?.deleted ? post : null;
  } catch {
    return null;
  }
}

/** The artist the preview names: the first real one, as the card shows it ("unknown artist" is none). */
export function previewArtist(post: Pick<Post, "tags">): string | null {
  const by = artists(post).filter((a) => !NOBODY.has(a));
  return by[0] ?? null;
}

/** e621 hides this post from signed-out visitors: no file to show, so the drawn card stands in. */
export const hiddenFromVisitors = (post: Post) => !post.files.original.url;

/** Chat apps drop a large card's picture under about 300 wide or over 5 MB. */
const MIN_W = 300;
const MAX_BYTES = 5_000_000;

/**
 * The picture a preview shows: the sample (a still for a video); a post with no sample has the
 * original there, used if it is small enough; then the thumbnail if it is wide enough; else none.
 */
function picture(post: Post): { url: string; width: number; height: number } | null {
  const { sample, preview, meta } = post.files;
  const fits = meta.has_sample || meta.size <= MAX_BYTES;
  if (sample.jpg && fits && sample.width >= MIN_W) return { url: sample.jpg, width: sample.width, height: sample.height };
  if (preview.jpg && preview.width >= MIN_W) return { url: preview.jpg, width: preview.width, height: preview.height };
  return null;
}

/** The tags a chat app reads. `post` null: the post can't be found, so the site's own preview stays. */
export function previewMetadata(id: number, post: Post | null, origin: string): Metadata {
  if (!post) return { metadataBase: new URL(origin) };
  const artist = previewArtist(post);
  const title = artist ? `${artist.replaceAll("_", " ")} on ${SITE}` : `Post #${id} on ${SITE}`;
  const description = `Post #${id} on e621 · ${compact(post.stats.score.total)} score · ${compact(post.stats.fav_count)} favorites`;
  // hidden from visitors, or no picture a chat app will take: the drawn card
  const shown = hiddenFromVisitors(post) ? null : picture(post);
  const image = shown ?? { url: `/post/${id}/card`, width: 1200, height: 630 };
  const images = [{ ...image, alt: title }];
  return {
    metadataBase: new URL(origin),
    // no top-level title: the shell moves between screens without a page load, and the tab would keep it
    description,
    openGraph: { siteName: SITE, title, description, type: "website", url: `/post/${id}`, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
