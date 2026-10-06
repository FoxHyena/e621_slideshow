"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const aspect = () => window.innerWidth / Math.max(1, window.innerHeight);

/** Width / height of the window, live across resizes. */
export function useViewportAspect(): number {
  return useSyncExternalStore(subscribe, aspect, () => 16 / 10);
}
