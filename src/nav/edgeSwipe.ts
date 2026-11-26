/**
 * Installed-app left-edge swipe → Back (UX §3). Browsers already do this themselves; a
 * home-screen app (display-mode: standalone) has no browser chrome, so we do it here.
 */

const EDGE_PX = 20;
const TRIGGER_PX = 64;

export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Returns a cleanup. Does nothing outside standalone mode. */
export function installEdgeSwipe(onBack: () => void): () => void {
  if (!isStandalone()) return () => {};
  let start: { x: number; y: number; id: number } | null = null;
  const down = (e: TouchEvent) => {
    const t = e.touches[0];
    start = e.touches.length === 1 && t.clientX <= EDGE_PX ? { x: t.clientX, y: t.clientY, id: t.identifier } : null;
  };
  const move = (e: TouchEvent) => {
    if (!start) return;
    const t = [...e.touches].find((x) => x.identifier === start!.id);
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (dy > 32 && dy > dx) start = null; // a vertical scroll that began at the edge
    else if (dx >= TRIGGER_PX) {
      start = null;
      onBack();
    }
  };
  const end = () => (start = null);
  window.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchmove", move, { passive: true });
  window.addEventListener("touchend", end, { passive: true });
  window.addEventListener("touchcancel", end, { passive: true });
  return () => {
    window.removeEventListener("touchstart", down);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", end);
    window.removeEventListener("touchcancel", end);
  };
}
