"use client";

/**
 * A menu: one choice from a list (DESIGN.md "Menu"). A sunk track of 44 rows; the chosen row rides a
 * raised capsule that slides to it. No check mark. The rows are radios, but the arrow keys only move
 * focus: choosing a row applies it (and usually closes the sheet), so it waits for Enter or a tap.
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";

export function Menu({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Put the capsule under the chosen row (no slide the first time), and keep one tab stop.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rows = [...el.querySelectorAll<HTMLElement>(".menu-row")];
    const on = rows.find((r) => r.getAttribute("aria-checked") === "true");
    const thumb = el.querySelector<HTMLElement>(".menu-thumb");
    if (thumb) thumb.hidden = !on;
    if (on) el.style.setProperty("--y", `${(on.parentElement?.offsetTop ?? 4) - 4}px`);
    rows.forEach((r) => (r.tabIndex = r === (on ?? rows[0]) ? 0 : -1));
    if (!el.hasAttribute("data-placed")) {
      const id = requestAnimationFrame(() => el.setAttribute("data-placed", ""));
      return () => cancelAnimationFrame(id);
    }
  });
  return (
    <div
      ref={ref}
      className="menu"
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      onKeyDown={(e) => {
        const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        const rows = [...e.currentTarget.querySelectorAll<HTMLElement>(".menu-row")];
        const i = rows.indexOf(document.activeElement as HTMLElement);
        if (i < 0) return;
        e.preventDefault();
        rows[(i + d + rows.length) % rows.length].focus();
      }}
    >
      <span className="menu-thumb" aria-hidden />
      {children}
    </div>
  );
}

/** A row; `action` (Reshuffle) shows at its right end while it's chosen, as a sibling button. */
export function MenuRow({
  on,
  onPick,
  action,
  testId,
  children,
}: {
  on: boolean;
  onPick: () => void;
  action?: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div className="menu-item">
      <button type="button" role="radio" aria-checked={on} className="menu-row" onClick={onPick} data-testid={testId}>
        {children}
      </button>
      {on && action}
    </div>
  );
}

/** A divider between groups of rows (Sort: the main four, then the rest). */
export const MenuSep = () => <div className="menu-sep" aria-hidden />;
