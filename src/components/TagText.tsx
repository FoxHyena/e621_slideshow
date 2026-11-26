/**
 * A search shown as text (DESIGN.md "Search"): tags spaced, joined by a muted middle dot. Its own module
 * because the first load needs it (the Results header) and not the rest of the v6 parts.
 */
/** A search shown as text: its tags, spaced, joined by a muted middle dot ("wolf · solo"). */
export function TagText({ tags, empty = "All posts" }: { tags: string; empty?: string }) {
  const list = tags.split(/\s+/).filter(Boolean);
  if (list.length === 0) return <>{empty}</>;
  return (
    <>
      {list.map((t, i) => (
        <span key={i}>
          {i > 0 && <span className="tag-dot"> · </span>}
          {t.replaceAll("_", " ")}
        </span>
      ))}
    </>
  );
}

/** The same, as plain text (for labels). */
export const tagText = (tags: string, empty = "All posts") =>
  tags
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replaceAll("_", " "))
    .join(" · ") || empty;
