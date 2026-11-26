"use client";

/**
 * A tab's title row: the large title and its tools (DESIGN.md "Top bar", owner-picked 2026-11-26,
 * "Capsule"). After 64 px of scroll the same row floats as a capsule: the title in headline, the
 * count in gold, the tools bare. It's the same elements, not a copy, so no button is there twice; the
 * row keeps its 52 in the page, so nothing under it moves. It arrives with a 150 ms fade and an 8 drop
 * and leaves with the fade.
 */
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { scrollY } from "@/nav/scroll";
import { ScreenContext } from "./context";

const AFTER = 64;
const LEAVE_MS = 150;

/** "in" past the line, "out" while it fades away, null in the page */
export function useTopBar(after: number = AFTER): "in" | "out" | null {
  // (Settings on a phone has no screen context: it's only ever there when shown)
  const visible = useContext(ScreenContext)?.visible ?? true;
  const [at, setAt] = useState<"in" | "out" | null>(null);
  const was = useRef(false);
  useEffect(() => {
    if (!visible) return;
    let leave: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const past = scrollY() > after;
      if (past === was.current) return;
      was.current = past;
      clearTimeout(leave);
      if (past) return setAt("in");
      setAt("out");
      leave = setTimeout(() => setAt(null), LEAVE_MS);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      clearTimeout(leave);
      // hidden mid-fade: don't come back stuck fading out
      setAt((a) => (a === "out" ? null : a));
    };
  }, [visible, after]);
  return at;
}

export function TitleRow({ title, count, children }: { title: string; count?: string | null; children?: ReactNode }) {
  const at = useTopBar();
  return (
    <div className="title-row">
      <div className="topbar" data-at={at ?? undefined} data-testid="top-bar">
        <div className="topcap">
          <h1 tabIndex={-1} className="screen-title">
            {title}
          </h1>
          {count && (
            <span className="topcap-count" aria-hidden>
              {count}
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
