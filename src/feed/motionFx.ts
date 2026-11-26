/**
 * The Follow dot burst and the favourite pill's drip (DESIGN.md "Motion"). Apart from `motion.ts`
 * so they load when the page is idle, not with the first screen (the JS budget).
 */
import { bendsFor } from "@/lib/bends";
import { calm } from "./motion";

/**
 * Following: six 5 px dots in the artist's colours leave the mark's rim and fly 30 px out
 * (480 ms). The only burst in the app.
 */
export function followBurst(mark: HTMLElement | null | undefined, seed: string) {
  if (!mark || calm() || typeof mark.animate !== "function") return;
  const colors = bendsFor(seed).colors;
  const box = document.createElement("span");
  box.className = "dots";
  mark.appendChild(box);
  const N = 6;
  const reach = 30;
  const from = 18;
  const size = 5;
  for (let k = 0; k < N; k++) {
    const i = document.createElement("i");
    const ang = k * ((2 * Math.PI) / N) - Math.PI / 2;
    i.style.background = colors[k % colors.length];
    i.style.width = i.style.height = `${size}px`;
    i.style.left = i.style.top = `${-size / 2}px`;
    box.appendChild(i);
    const at = (d: number) => `translate(${(Math.cos(ang) * d).toFixed(1)}px, ${(Math.sin(ang) * d).toFixed(1)}px)`;
    i.animate(
      [
        { transform: `${at(from)} scale(.3)`, opacity: 1, easing: "cubic-bezier(.16,1,.3,1)" },
        { transform: `${at(reach)} scale(1)`, opacity: 1, offset: 0.6, easing: "ease-in" },
        { transform: `${at(reach * 1.12)} scale(0)`, opacity: 0 },
      ],
      { duration: 480, fill: "forwards" },
    );
  }
  setTimeout(() => box.remove(), 740);
}

/**
 * Goo off the bottom of the favourite pill (720 ms): a bead runs along the edge, three blobs sag
 * out of it on necks, and the heavy middle one lets go. Each blob and its neck share a clock, so
 * they stay joined until the neck is pulled thin and the #goo filter pinches it off.
 */
export function drip(btn: HTMLElement | null | undefined) {
  if (!btn || calm() || typeof btn.animate !== "function") return;
  btn.querySelector(".drip")?.remove();
  const box = document.createElement("span");
  box.className = "drip";
  box.setAttribute("aria-hidden", "true");
  btn.appendChild(box);
  const W = btn.offsetWidth;
  const T = 720;
  const sag = "cubic-bezier(.25,1.6,.45,1)";
  const pull = "cubic-bezier(.5,0,.2,1)";
  const el = (cls: string, css = "") => {
    const s = document.createElement("span");
    s.className = cls;
    s.style.cssText = css;
    box.appendChild(s);
    return s;
  };
  el("bead").animate(
    [
      { transform: "scale(.2, 0)", easing: "cubic-bezier(.2,.9,.3,1)" },
      { transform: "scale(1.08, 1.7)", offset: 0.12 },
      { transform: "scale(1, 1)", offset: 0.24 },
      { transform: "scale(1, 1)", offset: 0.76, easing: pull },
      { transform: "scale(.5, 0)" },
    ],
    { duration: T + 120, fill: "both" },
  );
  // [where along the pill, blob size, how far it sags, when it starts, whether it lets go]
  const blobs: [number, number, number, number, boolean][] = [
    [0.36, 7, 8, 50, false],
    [0.55, 9, 15, 0, true],
    [0.71, 6, 5, 100, false],
  ];
  for (const [x, d, len, delay, falls] of blobs) {
    const neck = el("neck", `left:${x * W}px;width:${d * 0.6}px;height:${len}px;margin-left:${-d * 0.3}px`);
    const blob = el("blob", `left:${x * W}px;width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px`);
    const o: KeyframeAnimationOptions = { duration: T, delay, fill: "both" };
    if (falls) {
      blob.animate(
        [
          { transform: "translateY(0) scale(.6)", easing: sag },
          { transform: `translateY(${len}px) scale(1, 1.12)`, offset: 0.4, easing: "cubic-bezier(.6,0,1,.7)" },
          { transform: `translateY(${len + 5}px) scale(.94, 1.24)`, offset: 0.52, easing: "cubic-bezier(.5,0,1,.6)" },
          { transform: `translateY(${len + 27}px) scale(.72, .98)`, offset: 0.84 },
          { transform: `translateY(${len + 32}px) scale(0)` },
        ],
        o,
      );
      neck.animate(
        [
          { transform: "scaleY(0)", easing: sag },
          { transform: "scaleY(1)", offset: 0.4 },
          { transform: "scale(.62, 1.3)", offset: 0.54, easing: pull },
          { transform: "scale(.4, 0)", offset: 0.74 },
          { transform: "scale(.4, 0)" },
        ],
        o,
      );
    } else {
      blob.animate(
        [
          { transform: "translateY(0) scale(.6)", easing: sag },
          { transform: `translateY(${len}px) scale(1, 1.1)`, offset: 0.44 },
          { transform: `translateY(${len}px) scale(1, 1.1)`, offset: 0.6, easing: pull },
          { transform: "translateY(0) scale(.5)" },
        ],
        o,
      );
      neck.animate(
        [
          { transform: "scaleY(0)", easing: sag },
          { transform: "scaleY(1)", offset: 0.44 },
          { transform: "scaleY(1)", offset: 0.6, easing: pull },
          { transform: "scaleY(0)" },
        ],
        o,
      );
    }
  }
  setTimeout(() => box.remove(), T + 300);
}
