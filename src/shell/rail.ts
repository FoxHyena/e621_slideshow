"use client";

import { useSyncExternalStore } from "react";

/** At 900 px and up: the sidebar, and the layout on a computer (DESIGN.md "On a computer"). */
export const RAIL_QUERY = "(min-width: 900px)";

export function useRail(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(RAIL_QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(RAIL_QUERY).matches,
    () => false,
  );
}
