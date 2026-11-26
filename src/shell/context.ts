"use client";

import { createContext, useContext } from "react";
import type { Entry } from "@/nav/history";

export interface ScreenCtx {
  /** the history entry this screen belongs to (its base entry) */
  entry: Entry;
  /** this screen is the one on screen (an overlay may sit on top of it) */
  visible: boolean;
  /** the sheet open over this screen, if any */
  sheet: string | null;
  /** `?play=` over this screen, if any */
  play: string | null;
}

export const ScreenContext = createContext<ScreenCtx | null>(null);

export function useScreen(): ScreenCtx {
  const c = useContext(ScreenContext);
  if (!c) throw new Error("useScreen outside a screen");
  return c;
}
