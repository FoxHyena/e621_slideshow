/**
 * What the feed screens share: where a search goes, the filters a new search starts with, and the
 * tag, artist and post actions (UX §5 "Feed card").
 */
import { toast } from "sonner";
import { postPageUrl } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { encodeResults, normTags, type Filters } from "@/lib/feed/filters";
import type { SearchSettings } from "@/lib/settings";
import { getNav } from "@/nav/history";
import type { Route } from "@/nav/routes";
import { getPrefs } from "@/state/prefs";

/**
 * A new search's filters. Until slice 3 retires the legacy panel, they follow its saved search
 * settings (DECISIONS: "Results defaults").
 */
export function defaultFilters(s: SearchSettings = getPrefs().store.get().search): Filters {
  return { media: s.media, order: s.order, seed: s.seed, date: s.date, minScore: s.minScore, hideFaved: false };
}

export function resultsRoute(tags: string, filters: Filters = defaultFilters()): Route {
  return { screen: { kind: "results", params: encodeResults({ tags: normTags(tags), filters, link: null }) }, play: null };
}

/** Open Results for a search, and remember it as a recent search. */
export function openResults(tags: string, filters?: Filters): void {
  getPrefs().addHistory(tags);
  getNav().push(resultsRoute(tags, filters));
}

/** Add a line to this browser's blacklist, with Undo. Your e621 account blacklist isn't touched. */
export function blacklistLine(line: string, label = line.replaceAll("_", " ")): void {
  const prefs = getPrefs();
  const before = prefs.store.get();
  const current = before.visitBlacklist ?? before.search.blacklist;
  if (current.split("\n").some((l) => l.trim().toLowerCase() === line.toLowerCase())) {
    toast(`${label} is already blacklisted`);
    return;
  }
  // Into this browser's own list (and a link visit's, which stays unsaved).
  prefs.editBlacklist((b) => (b.trim() ? `${b.trimEnd()}\n${line}` : line));
  toast(`Blacklisted ${label}`, {
    action: {
      label: "Undo",
      onClick: () =>
        getPrefs().editBlacklist((b) =>
          b
            .split("\n")
            .filter((l) => l.trim().toLowerCase() !== line.toLowerCase())
            .join("\n"),
        ),
    },
  });
}

export async function copyText(text: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    // The browser blocked the clipboard: let the user copy it by hand.
    window.prompt("Copy this link", text);
  }
}

export async function sharePost(post: Post): Promise<void> {
  const url = postPageUrl(post.id);
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  await copyText(url, "Link to the post copied");
}
