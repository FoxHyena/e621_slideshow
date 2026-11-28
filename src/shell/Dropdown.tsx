"use client";

/**
 * A chip's menu, dropped under the chip (DESIGN.md "Chip dropdown", owner-picked 2026-11-26): 8 below
 * it, left edges lined up (right edges when it would leave the window; inside the 16 inset). A
 * screen's ⋯ menu is one too, hung from the tools capsule with right edges lined up. No title,
 * no ✕, no dim: the chip is the title. It's still a history entry (nav.openSheet), so Back, Esc and a
 * tap or click outside all close it the same way. A settings row's value drops one too, at the row's
 * right end (designer, 2026-11-27). The page is held still under it (Shell's scroll lock),
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
  rowEnd,
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
  /** a row's value: right edges lined up with the row's content edge (inside its padding) */
  rowEnd?: boolean;
  children: ReactNode;
  testId?: string;
  /** how a tap outside or Esc closes it (Media applies what changed) */
  onClose?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top: number; left: number; width: number; maxHeight: number; up?: boolean } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const vw = document.documentElement.clientWidth;
      const w = Math.min(width, vw - 2 * INSET);
      // a ⋯ hangs it with right edges lined up (with its tools capsule); a chip, left edges
      const el = anchorOf(anchor);
      const { box: edge, end } = rowEnd ? { box: el, end: true } : popEdge(el);
      const r = edge?.getBoundingClientRect();
      const right = r && rowEnd && el ? r.right - parseFloat(getComputedStyle(el).paddingRight) : r?.right;
      let left = r && right !== undefined ? (end ? right - w : r.left) : INSET;
      if (r && right !== undefined && left + w > vw - INSET) left = Math.max(INSET, right - w);
      left = Math.min(Math.max(INSET, left), vw - INSET - w);
      const vh = window.innerHeight;
      // a row low on the page: above it when it doesn't fit below and there's more room above (measured
      // at its own width, so the first pass and the next frame agree)
      if (box.current) box.current.style.width = `${w}px`;
      const h = box.current?.scrollHeight ?? 0;
      const below = r ? vh - INSET - (r.bottom + GAP) : 0;
      const above = r ? r.top - GAP - INSET : 0;
      if (r && rowEnd && h > below && above > below && above >= Math.min(h, 160)) {
        const top = Math.max(INSET, r.top - GAP - h);
        setAt({ top, left, width: w, maxHeight: r.top - GAP - top, up: true });
        return;
      }
      const top = r ? r.bottom + GAP : 96;
      setAt({ top, left, width: w, maxHeight: Math.max(160, vh - top - INSET) });
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
  }, [anchor, width, rowEnd]);

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

  // Closed (picked, Esc, Back, a tap outside): focus goes back to the opener when it was left nowhere,
  // so Tab carries on from the row or chip (and stays inside a sheet under it)
  useEffect(
    () => () => {
      const a = document.activeElement;
      if (a && a !== document.body) return;
      anchorOf(anchor)?.focus({ preventScroll: true });
    },
    [anchor],
  );

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
        data-up={at?.up || undefined}
        style={at ? { top: at.top, left: at.left, width: at.width, maxHeight: at.maxHeight } : { visibility: "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}
