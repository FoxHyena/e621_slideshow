"use client";

/**
 * A chip's menu, dropped under the chip (DESIGN.md "Chip dropdown", owner-picked 2026-11-26): 8 below
 * it, left edges lined up (right edges when it would leave the window; inside the 16 inset). A
 * screen's ⋯ menu is one too, hung from the tools capsule with right edges lined up. No title,
 * no ✕, no dim: the chip is the title. It's still a history entry (nav.openSheet), so Back, Esc and a
 * tap or click outside all close it the same way. The page is held still under it (Shell's scroll lock),
 * so the chip stays where it was measured.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getNav } from "@/nav/history";
import { popEdge } from "./opener";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
const INSET = 16;
const GAP = 8;

const back = () => void getNav().back();

/** The opener on show (a hidden screen keeps its own copy of the chips). */
function anchorOf(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-menu="${CSS.escape(name)}"]`)) if (el.getClientRects().length > 0) return el;
  return null;
}

export function Dropdown({
  anchor,
  label,
  width,
  menu,
  children,
  testId,
  onClose = back,
}: {
  /** the opener's `data-menu` */
  anchor: string;
  /** what a screen reader calls it (the chip's name) */
  label: string;
  width: number;
  /** one of a list (the Menu with its sliding capsule): the Menu's own shape, no side padding */
  menu?: boolean;
  children: ReactNode;
  testId?: string;
  /** how a tap outside or Esc closes it (Media applies what changed) */
  onClose?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const vw = document.documentElement.clientWidth;
      const w = Math.min(width, vw - 2 * INSET);
      // a ⋯ hangs it with right edges lined up (with its tools capsule); a chip, left edges
      const { box, end } = popEdge(anchorOf(anchor));
      const r = box?.getBoundingClientRect();
      const top = r ? r.bottom + GAP : 96;
      let left = r ? (end ? r.right - w : r.left) : INSET;
      if (r && left + w > vw - INSET) left = Math.max(INSET, r.right - w);
      left = Math.min(Math.max(INSET, left), vw - INSET - w);
      setAt({ top, left, width: w, maxHeight: Math.max(160, window.innerHeight - top - INSET) });
    };
    place();
    // again a frame on: the page's scroll lock (a parent's effect, after this one) can drop the scrollbar
    // and move the chip, and a chip row that wasn't there yet (a reload onto the menu) has come
    const again = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(again);
      window.removeEventListener("resize", place);
    };
  }, [anchor, width]);

  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  // Focus the first control once it's placed (a hidden box can't take focus).
  const placed = at !== null;
  useEffect(() => {
    const el = box.current;
    if (!el || !placed) return;
    const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>('[aria-checked="true"]') ?? el.querySelector<HTMLElement>(FOCUSABLE);
    // nothing to use right now (every row disabled): the box itself holds focus, inside the dialog
    (first ?? el).focus({ preventScroll: true });
  }, [placed]);

  // Keep Tab inside; Esc closes.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close.current();
    };
    window.addEventListener("keydown", onEsc);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const all = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.tabIndex >= 0 && n.getClientRects().length > 0);
      if (all.length === 0) {
        e.preventDefault();
        return;
      }
      const [a, z] = [all[0], all[all.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="drop-layer" data-testid={testId}>
      <div className="drop-catch" onClick={() => close.current()} aria-hidden data-testid="drop-outside" />
      <div
        ref={box}
        className="drop"
        data-menu-shape={menu || undefined}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={label}
        style={at ?? { visibility: "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}
