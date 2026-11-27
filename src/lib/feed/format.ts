import type { Post, TagCategoryName } from "../e621/types";

/** Artist tags that aren't a person. */
export const NOT_ARTISTS = new Set(["conditional_dnp", "sound_warning", "epilepsy_warning", "avoid_posting", "third-party_edit"]);
/** Artist tags that name no one (e621's placeholders), never suggested. */
export const NOBODY = new Set(["unknown_artist", "anonymous_artist", "unknown_artist_signature", "third-party_edit", "sketch_artist", "artist_request"]);
/** The order tags show in on a card (the artist tag is in the artist line, not here). */
export const TAG_ORDER: TagCategoryName[] = ["copyright", "character", "species", "general", "lore", "meta"];

export function artists(post: Pick<Post, "tags">): string[] {
  return (post.tags.artist ?? []).filter((t) => !NOT_ARTISTS.has(t));
}

/** "3h", "2d": how long ago, in the largest whole unit. */
export function ago(iso: string, now: number): string {
  const sec = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(sec)) return "";
  const steps: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
  ];
  let v = sec;
  for (const [n, unit] of steps) {
    if (v < n) return `${Math.floor(v)}${unit}`;
    v /= n;
  }
  return `${Math.floor(v)}y`;
}

export function compact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function cardTags(post: Pick<Post, "tags">): (readonly [TagCategoryName, string])[] {
  return TAG_ORDER.flatMap((c) => (post.tags[c] ?? []).map((t) => [c, t] as const));
}

/** The follow toast's second line: "2 skipped: saffron hare, harbor seal"; past two, "5 skipped: saffron hare, harbor seal and 3 more". */
export function skippedLine(names: string[]): string {
  const shown = names
    .slice(0, 2)
    .map((n) => n.replaceAll("_", " "))
    .join(", ");
  return `${names.length} skipped: ${shown}${names.length > 2 ? ` and ${names.length - 2} more` : ""}`;
}
