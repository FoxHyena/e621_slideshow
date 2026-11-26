/**
 * Share links (UX §5 "⤴ Share"): Results copy a link to the search with its filters and your
 * playback; feeds that depend on the account (Favorites) share the post instead.
 */
import { decodeResults } from "@/lib/feed/filters";
import { encodeShare, encodeShareCreds } from "@/lib/share";
import { DEFAULT_SEARCH } from "@/lib/settings";
import type { Entry } from "@/nav/history";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";

/** The share link for a screen, or null when the screen shares posts instead. */
export function shareUrlFor(base: Entry): { href: string; withSignIn: boolean } | null {
  const screen = base.route.screen;
  if (screen.kind !== "results") return null;
  const r = decodeResults(screen.params);
  const { search, playback } = getPrefs().store.get();
  const { creds, user, link, shareSignIn } = getSession().store.get();
  const withSignIn = shareSignIn && !!creds && !!user && !link;
  // What the screen shows: a share link's ratings, every rating for a launch link, else yours.
  const ratings = r.link?.kind === "share" ? r.link.ratings : r.link?.kind === "launch" ? { s: true, q: true, e: true } : search.ratings;
  const query = encodeShare(
    { ...DEFAULT_SEARCH, tags: r.tags, ratings, ...r.filters },
    { ...playback, ...(r.link?.kind === "share" ? r.link.playback : {}) },
  );
  const href = `${location.origin}/?${query}${withSignIn && creds ? `#${encodeShareCreds(creds)}` : ""}`;
  return { href, withSignIn };
}
