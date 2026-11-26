"use client";

/**
 * Pull to refresh (UX §4). Only a one-finger touch that starts at the top of the page and moves
 * down first counts: the axis locks after 10 px, and a sideways or upward start is left alone. The
 * spinner follows at half the finger's travel; 144 px of travel (72 on screen) arms it. Letting go
 * armed refreshes, with the spinner held at 48 px for at least 400 ms; letting go earlier springs
 * back. `touchmove` is listened to only while such a touch is live, and passively: the page's
 * `overscroll-behavior-y: none` already keeps the browser's own pull from starting.
 */
import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isLocked } from "@/nav/scroll";

export const PTR = { lock: 10, arm: 144, hold: 48, minMs: 400, max: 96, maxMs: 10_000 } as const;

export function PullToRefresh({ enabled, onRefresh }: { enabled: boolean; onRefresh: () => Promise<unknown> | void }) {
  const el = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(onRefresh);
  useEffect(() => {
    run.current = onRefresh;
  });

  useEffect(() => {
    if (!enabled || busy) return;
    const show = (offset: number, armed: boolean, animate: boolean) => {
      const n = el.current;
      if (!n) return;
      n.style.transition = animate ? "" : "none";
      n.style.transform = `translate(-50%, ${offset - PTR.hold}px) rotate(${offset * 4}deg)`;
      n.style.opacity = String(Math.min(1, offset / (PTR.arm / 2)));
      n.dataset.armed = armed ? "true" : "false";
    };
    let start: { x: number; y: number } | null = null;
    let locked = false;
    let armed = false;

    const move = (e: TouchEvent) => {
      if (!start) return;
      // A second finger (a pinch) isn't a pull.
      if (e.touches.length > 1) return end(false);
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!locked) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < PTR.lock) return;
        if (dy <= Math.abs(dx)) return end(false);
        locked = true;
      }
      armed = dy >= PTR.arm;
      show(Math.max(0, Math.min(PTR.max, dy / 2)), armed, false);
    };
    // Only the last finger up lets go.
    const up = (e: TouchEvent) => end(e.touches.length === 0);
    const detach = () => {
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      document.removeEventListener("touchcancel", cancel);
    };
    const cancel = () => end(false);
    function end(release: boolean) {
      detach();
      const go = release && locked && armed;
      start = null;
      locked = false;
      armed = false;
      if (!go) return show(0, false, true);
      show(PTR.hold * 2, true, true);
      setBusy(true);
      const t0 = performance.now();
      // The spinner never outlasts a hung request: it stops after 10 s whatever happens.
      void Promise.race([Promise.resolve().then(() => run.current()), new Promise((r) => setTimeout(r, PTR.maxMs))])
        .catch(() => {})
        .then(() => new Promise((r) => setTimeout(r, Math.max(0, PTR.minMs - (performance.now() - t0)))))
        .then(() => {
          show(0, false, true);
          setBusy(false);
        });
    }
    const down = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.scrollY > 0 || isLocked()) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      document.addEventListener("touchmove", move, { passive: true });
      document.addEventListener("touchend", up);
      document.addEventListener("touchcancel", cancel);
    };
    document.addEventListener("touchstart", down, { passive: true });
    return () => {
      document.removeEventListener("touchstart", down);
      detach();
      // Hidden or a sheet opened mid-pull: put the spinner away.
      if (start) show(0, false, true);
    };
  }, [enabled, busy]);

  return (
    <div ref={el} className="ptr" aria-hidden data-testid="ptr" data-busy={busy || undefined}>
      <RotateCw />
    </div>
  );
}
