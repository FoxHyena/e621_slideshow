/**
 * The small v6 moments (DESIGN.md "Motion"), driven straight on the DOM with the Web Animations
 * API so a tap never re-renders a card: the mark's turn, the Follow dot burst and the goo that
 * drips off the favourite pill. Reduced motion turns every one of them off. The burst and the
 * drip live in `motionFx.ts`, fetched when the page is idle (the JS budget).
 */

export function calm(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const turns = new WeakMap<Element, number>();

/** The app mark pops once (92% to 100%; the animation and its reduced-motion rule live in CSS). */
export function popMark(mark: Element | null | undefined) {
  if (!mark) return;
  mark.removeAttribute("data-pop");
  void (mark as HTMLElement).offsetWidth;
  mark.setAttribute("data-pop", "");
}

/** An artist's mark spins once (600 ms, springy; the transition lives in CSS). */
export function turnMark(mark: Element | null | undefined) {
  const svg = mark?.querySelector("svg");
  if (!mark || !svg || calm()) return;
  const n = (turns.get(mark) ?? 0) + 1;
  turns.set(mark, n);
  svg.style.transform = `rotate(${n * 360}deg)`;
}
