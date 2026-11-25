"use client";

import { useState } from "react";

/**
 * How many of `total` results a scrolling view renders: enough to reach `from`
 * (the post it opens on) plus a page, then a page more each time the end comes
 * near. Recommended publishes its whole result set (thousands of posts) at
 * once; building a card for every one in one render ran mobile tabs out of
 * memory, and the browser reloaded the page.
 */
export function useShown(total: number, from: number, page: number) {
  const [shown, setShown] = useState(() => from + page);
  // A new search empties the list first: start that one from a page again.
  const [wasEmpty, setWasEmpty] = useState(total === 0);
  if ((total === 0) !== wasEmpty) {
    setWasEmpty(total === 0);
    if (total === 0) setShown(page);
  }
  return {
    count: Math.min(shown, total),
    /** results that exist but aren't rendered yet */
    more: shown < total,
    showMore: () => setShown((n) => n + page),
  };
}
