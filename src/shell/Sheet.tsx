"use client";

/**
 * A bottom sheet (DESIGN.md "Sheets with a title", "Sheet (⋯ menu)"): the dim, the Panel sheet with
 * 24 top corners, the grabber, then a title row (Section title, the ✕ well on the 16 inset) or a head
 * of the caller's own (the ⋯ menu's context line, Post info's artist). It's a history entry
 * (nav.openSheet), so Back, Esc, the ✕, a tap on the dim and a swipe down all close it the same way:
 * by going back.
 *
 * On a computer (DESIGN.md "On a computer") a titled sheet is a dialog in the middle of the window. A
 * sheet opened from something on screen (`pop`: a ⋯, a tile, a row's choice) is a popover at that
 * thing instead: 300 wide, no grabber, no ✕, no dim; a click away or Esc closes it.
 */
import { X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { getNav } from "@/nav/history";
import { placePopover, takeOpener } from "./opener";
import { RAIL_QUERY, useRail } from "./rail";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

const close = () => void getNav().back();

/** The ✕: a 36 round well with a link-blue cross. */
export function SheetClose() {
  return (
    <button type="button" className="sheet-x" aria-label="Close" onClick={close} data-testid="sheet-close">
      <X aria-hidden strokeWidth={2.6} />
    </button>
  );
}

/** A row of a titled sheet's actions: an icon well and the label, straight on the sheet. */
export function SheetAction({ icon: Icon, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button type="button" className="list-row" {...rest}>
      <span className="row-well" aria-hidden>
        <Icon />
      </span>
      <span className="row-text">
        <b>{label}</b>
      </span>
    </button>
  );
}

export function Sheet({
  title,
  head,
  children,
  footer,
  testId,
  full,
  side,
  pop,
}: {
  /** the sheet's name; shown as its title unless `head` takes the title row's place */
  title: string;
  /** replaces the title row (it should carry its own SheetClose when it wants one) */
  head?: ReactNode;
  children: ReactNode;
  /** pinned under the content (a Done button) */
  footer?: ReactNode;
  testId?: string;
  /** fills the screen (the search editor) */
  full?: boolean;
  /** on a computer, a panel at the window's right with no dim (the player's Post info) */
  side?: boolean;
  /** opened from something on screen: on a computer, a popover at it (a dialog when nothing opened it) */
  pop?: boolean;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const rail = useRail();
  // a side panel on a computer sits beside what it describes: not modal, no Tab trap
  const panel = rail && !!side;
  // what opened it, read as it mounts (a reload onto an open sheet has none: a dialog then)
  const [opener] = useState(() => (pop ? takeOpener() : null));
  const popover = rail && opener !== null;

  // Hang the popover from its opener before it paints (so focus lands on a placed box).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !popover || !opener) return;
    const place = () => {
      el.style.maxHeight = "";
      const vw = document.documentElement.clientWidth;
      const at = placePopover(opener, el.offsetWidth, el.offsetHeight, vw, window.innerHeight);
      el.style.left = `${at.left}px`;
      el.style.top = `${at.top}px`;
      el.style.maxHeight = `${at.maxHeight}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [popover, opener]);

  // Focus the first control; keep Tab inside; Esc closes (wherever focus is: after a tap on the dim
  // it may be outside the sheet).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onEsc);
    const onKey = (e: KeyboardEvent) => {
      // (a side panel on a computer isn't modal: Tab leaves it for the player)
      if (e.key !== "Tab" || (side && matchMedia(RAIL_QUERY).matches)) return;
      // Real tab stops only: a menu's other rows are -1 (roving), so the last row isn't always one.
      const all = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.tabIndex >= 0 && n.getClientRects().length > 0);
      if (all.length === 0) return;
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
  }, [side]);

  // Drag the grabber down to dismiss (rubber-bands upward).
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const raw = e.clientY - d.y;
    d.dy = raw > 0 ? raw : -Math.sqrt(-raw) * 2;
    el.style.transition = "none";
    el.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    const el = box.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transition = "";
    // Dismissed: stay down while Back lands, instead of springing up first.
    if (d.dy > 96) {
      el.style.transform = "translateY(100%)";
      close();
    } else el.style.transform = "";
  };

  return (
    <div className="sheet-layer" data-side={side || undefined} data-pop={popover || undefined} data-testid={testId}>
      <div className="sheet-dim" onClick={close} aria-hidden />
      <div
        ref={box}
        className="sheet"
        data-full={full || undefined}
        role="dialog"
        aria-modal={panel ? undefined : "true"}
        aria-labelledby={head ? undefined : id}
        aria-label={head ? title : undefined}
      >
        <div className="sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span aria-hidden />
        </div>
        {head ?? (
          <div className="sheet-head">
            <h2 id={id} className="sheet-title">
              {title}
            </h2>
            <SheetClose />
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
