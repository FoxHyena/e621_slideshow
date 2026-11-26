"use client";

/**
 * The slideshow styles row (DESIGN.md "Slideshow styles"): a sideways row of tiny previews, the
 * picked one ringed in gold. Shared by the player's Quick settings and Settings › Slideshow.
 */
import type { SlideStyle } from "@/lib/settings";

/** The styles, in Settings' order, with the short names the previews carry. */
export const STYLES: { value: SlideStyle; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "kenburns", label: "Ken Burns" },
  { value: "collage", label: "Collage" },
  { value: "prints", label: "Prints" },
  { value: "reflections", label: "Reflections" },
];

/** A tiny picture of what each style does, drawn in CSS (no posts in it). */
function StylePreview({ style }: { style: SlideStyle }) {
  return (
    <i className="style-pic" data-style={style} aria-hidden>
      <u />
      {(style === "collage" || style === "reflections") && <u />}
      {style === "collage" && <u />}
    </i>
  );
}

/** One radio group; the arrow keys move the pick (and focus) like any radio group. */
export function StyleRow({ value, onChange, testId }: { value: SlideStyle; onChange: (s: SlideStyle) => void; testId?: string }) {
  return (
    <div
      className="style-row"
      role="radiogroup"
      aria-label="Style"
      data-testid={testId}
      onKeyDown={(e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const i = Math.max(0, STYLES.findIndex((s) => s.value === value));
        const n = (i + d + STYLES.length) % STYLES.length;
        onChange(STYLES[n].value);
        e.currentTarget.querySelectorAll<HTMLButtonElement>(".style-pick")[n]?.focus();
      }}
    >
      {STYLES.map((s) => (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={value === s.value}
          tabIndex={value === s.value ? 0 : -1}
          className="style-pick"
          onClick={() => onChange(s.value)}
        >
          <StylePreview style={s.value} />
          {s.label}
        </button>
      ))}
    </div>
  );
}
