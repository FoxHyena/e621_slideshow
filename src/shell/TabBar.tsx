"use client";

import { Droplets, Rss, Settings, Sparkle, Users, type LucideIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Tab } from "@/nav/routes";
import { calm } from "@/feed/motion";
import { getGoo } from "@/state/goo";
import { liveGoo, type GooBar } from "./gooLive";
import { useRail } from "./rail";
import { TAB_COUNT, tabAngle, tabTransform, tubeGeo, type TubeGeo } from "./tube";

const TABS: { tab: Tab; label: string; Icon: LucideIcon }[] = [
  { tab: "following", label: "Following", Icon: Rss },
  { tab: "for-you", label: "For You", Icon: Sparkle },
  { tab: "artists", label: "Artists", Icon: Users },
  { tab: "settings", label: "Settings", Icon: Settings },
];

/** On a computer: the sidebar, its own chunk (a phone never loads it). */
const Sidebar = lazy(() => import("./Sidebar"));

/** The optical nudges of globals.css ("Optical centring"), in px of a 24 icon, for the Goo Ink copies. */
const INK_NUDGE: Record<string, [number, number]> = { following: [0.96, -0.96], artists: [0.96, 0], goo: [0.48, -0.96] };
export { RAIL_QUERY, useRail } from "./rail";

/** The tube is 343 on a 375 phone: the screen less 16 each side, within reason. */
function tubeWidth(viewport: number): number {
  return Math.round(Math.max(280, Math.min(398, viewport - 32)));
}

function useViewportWidth(): number {
  return useSyncExternalStore(
    (cb) => {
      addEventListener("resize", cb);
      return () => removeEventListener("resize", cb);
    },
    () => window.innerWidth,
    () => 375,
  );
}

function plain(e: React.MouseEvent) {
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
}

interface Props {
  current: Tab;
  onTab: (t: Tab) => void;
  onSearch: () => void;
  hidden: boolean;
}

/**
 * The tab bar (DESIGN.md "Tab bar"): one bent tube on a phone, the sidebar at 900 px and up
 * (DESIGN.md "On a computer"). `current` lights the tab; tapping the current tab's root asks the screen to scroll to
 * top. Also draws the goo filter the heart's drip uses.
 */
export function TabBar(props: Props) {
  const rail = useRail();
  return (
    <>
      <svg className="goo-defs" width="0" height="0" aria-hidden focusable="false">
        <defs>
          <filter id="goo-drip" x="-20%" y="-20%" width="140%" height="170%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            <feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          </filter>
        </defs>
      </svg>
      {rail ? (
        <Suspense fallback={null}>
          <Sidebar {...props} />
        </Suspense>
      ) : (
        <Tube {...props} />
      )}
    </>
  );
}

/** The rail's scroll along the bend: 0 shows the four tabs, `max` (one tab) the secret fifth. */
interface Scroll {
  s: number;
  v: number;
  to: number;
  raf: number;
  last: number;
  raw: number;
  wheel: ReturnType<typeof setTimeout> | 0;
}

function Tube({ current, onTab, hidden }: Props) {
  const W = tubeWidth(useViewportWidth());
  const g = useMemo<TubeGeo>(() => tubeGeo(W), [W]);
  const uid = useId().replace(/:/g, "");
  const nav = useRef<HTMLElement>(null);
  const gg = useRef<SVGGElement>(null);
  const blade = useRef<HTMLSpanElement>(null);
  const gleam = useRef<HTMLSpanElement>(null);
  const secret = useRef<HTMLButtonElement>(null);
  const sc = useRef<Scroll>({ s: 0, v: 0, to: 0, raf: 0, last: 0, raw: 0, wheel: 0 });
  const idx = Math.max(0, TABS.findIndex((t) => t.tab === current));
  // The new tab's icon hops; the first paint doesn't.
  const [hop, setHop] = useState({ tab: current, n: 0 });
  if (hop.tab !== current) setHop({ tab: current, n: hop.n + 1 });

  // The goo: drawn now, then following the count.
  useEffect(() => {
    const [n, d, b, l] = [nav.current, gg.current, blade.current, gleam.current];
    if (!n || !d || !b || !l) return;
    // The drawing code loads once the page is idle, not with the first screen (the JS budget);
    // the count is kept meanwhile and drawn when it arrives.
    let bar: GooBar | null = null;
    let off = () => {};
    let gone = false;
    const load = () => import("./gooBar").then(({ createGooBar }) => {
      if (gone) return;
      const it = createGooBar(n, d, b, l, g);
      bar = it;
      const goo = getGoo();
      let { count, wipes } = goo.store.get();
      it.sync(count);
      off = goo.store.subscribe(() => {
        const s = goo.store.get();
        if (s.wipes !== wipes) {
          wipes = s.wipes;
          count = s.count;
          it.wipe();
          return;
        }
        if (s.count === count) return;
        count = s.count;
        // drops in the air draw their own landing
        if (it.falling() === 0) it.set(count);
      });
    });
    const idle = typeof requestIdleCallback === "function";
    const id = idle ? requestIdleCallback(() => void load(), { timeout: 1000 }) : window.setTimeout(() => void load(), 300);
    return () => {
      gone = true;
      if (idle) cancelIdleCallback(id);
      else clearTimeout(id);
      off();
      bar?.destroy();
    };
  }, [g]);

  // Scrolling the rail along the bend: a drag, a sideways wheel, or focus on the secret tab.
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const o = sc.current;
    const max = g.tw;
    const put = () => el.style.setProperty("--sc", `${(g.R ? -o.s / g.R : 0).toFixed(5)}rad`);
    const band = (s: number) => {
      const b = (x: number) => x / (1 + x / 46);
      return s < 0 ? -b(-s) : s > max ? max + b(s - max) : s;
    };
    const hold = () => {
      cancelAnimationFrame(o.raf);
      o.raf = 0;
    };
    const go = (to: number) => {
      o.to = to;
      el.toggleAttribute("data-open", to > 0);
      if (calm()) {
        o.s = to;
        o.v = 0;
        put();
        return;
      }
      if (o.raf) return;
      o.last = 0;
      const step = (now: number) => {
        const dt = Math.min(0.032, o.last ? (now - o.last) / 1000 : 0.016);
        o.last = now;
        const e = o.to - o.s;
        o.v += (e * 210 - o.v * 21) * dt;
        o.s += o.v * dt;
        if (Math.abs(e) < 0.2 && Math.abs(o.v) < 4) {
          o.s = o.to;
          o.v = 0;
          o.raf = 0;
        } else o.raf = requestAnimationFrame(step);
        put();
      };
      o.raf = requestAnimationFrame(step);
    };
    put();

    let drag: { id: number; x0: number; s0: number; on: boolean; px: number; pt: number; vx: number } | null = null;
    let upAt = -1e9;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button) return;
      drag = { id: e.pointerId, x0: e.clientX, s0: 0, on: false, px: e.clientX, pt: e.timeStamp, vx: 0 };
    };
    const move = (e: PointerEvent) => {
      const d = drag;
      if (!d || e.pointerId !== d.id) return;
      if (!d.on) {
        if (Math.abs(e.clientX - d.x0) < 6) return;
        d.on = true;
        hold();
        d.x0 = e.clientX;
        d.s0 = o.s;
        try {
          el.setPointerCapture(d.id);
        } catch {}
      }
      const dt = Math.max(1, e.timeStamp - d.pt) / 1000;
      d.vx = d.vx * 0.6 + (-(e.clientX - d.px) / dt) * 0.4;
      d.px = e.clientX;
      d.pt = e.timeStamp;
      o.s = band(d.s0 - (e.clientX - d.x0));
      put();
    };
    const up = (e: PointerEvent) => {
      const d = drag;
      if (!d || e.pointerId !== d.id) return;
      drag = null;
      if (!d.on) return;
      upAt = e.timeStamp;
      const v = e.timeStamp - d.pt > 90 ? 0 : Math.max(-1600, Math.min(1600, d.vx));
      o.v = v;
      go(o.s + v * 0.14 > max / 2 ? max : 0);
    };
    // the click that ends a drag is not a tap
    const click = (e: MouseEvent) => {
      if (e.timeStamp - upAt < 60) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!o.wheel) {
        hold();
        o.raw = o.s;
      }
      o.raw = Math.max(-70, Math.min(max + 70, o.raw + e.deltaX * 0.7));
      o.s = band(o.raw);
      o.v = 0;
      put();
      clearTimeout(o.wheel || undefined);
      o.wheel = setTimeout(() => {
        o.wheel = 0;
        go(o.s > max / 2 ? max : 0);
      }, 110);
    };
    // reaching the secret tab with the keyboard brings it into view; Following, out of it
    const focus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (drag) return;
      if (t === secret.current) go(max);
      else if (t.dataset.tab === "following" && o.to) go(0);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("focusin", focus);
    return () => {
      hold();
      clearTimeout(o.wheel || undefined);
      o.wheel = 0;
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("focusin", focus);
    };
  }, [g]);

  const clip = (d: string) => ({ clipPath: `path('${d}')`, WebkitClipPath: `path('${d}')` });
  const box = { width: W, height: g.H, viewBox: `0 0 ${W} ${g.H}`, "aria-hidden": true } as const;
  const cy = 32 + g.R;
  const rot = (k: number) => `rotate(${((tabAngle(g, k) * 180) / Math.PI).toFixed(3)} ${W / 2} ${cy.toFixed(2)})`;
  const copies = [...TABS.map((t) => ({ key: t.tab as string, label: t.label, Icon: t.Icon })), { key: "goo", label: "Goo", Icon: Droplets }];

  return (
    <nav
      ref={nav}
      className="tube"
      aria-label="Tabs"
      data-hidden={hidden || undefined}
      inert={hidden}
      style={{ width: W, height: g.H, marginLeft: -W / 2, ["--R" as string]: `${g.R.toFixed(2)}px`, ["--tw" as string]: `${g.tw.toFixed(2)}px` }}
    >
      <svg className="tube-shadow" {...box}>
        <path d={g.d} />
      </svg>
      <span className="tube-bg" style={clip(g.d)}>
        <span className="tube-clip" style={clip(g.di)}>
          <span className="tube-rail">
            <span className="tube-ind" style={{ transform: tabTransform(g, idx) }} />
          </span>
        </span>
        <span ref={gleam} className="tube-gleam" />
      </span>
      <svg className="tube-light" {...box}>
        <path className="ring" d={g.d} />
        <path d={g.hi} transform="translate(0 .5)" />
      </svg>
      <span className="tube-clip" style={clip(g.di)}>
        <span className="tube-rail">
          {TABS.map(({ tab, label, Icon }, k) => {
            const on = tab === current;
            return (
              <a
                key={tab}
                href={tab === "settings" ? "/settings" : `/${tab}`}
                className="tube-tab"
                draggable={false}
                aria-current={on ? "page" : undefined}
                data-tab={tab}
                data-testid={`tab-${tab}`}
                style={{ transform: tabTransform(g, k) }}
                onClick={(e) => {
                  if (!plain(e)) return;
                  e.preventDefault();
                  onTab(tab);
                }}
              >
                <Icon key={on ? hop.n : 0} aria-hidden className="tube-icon" data-hop={on && hop.n > 0 ? "" : undefined} />
                <span>{label}</span>
              </a>
            );
          })}
          <button
            ref={secret}
            type="button"
            className="tube-tab tube-secret"
            aria-label="Goo: ten more favorites of goo on the tab bar"
            data-testid="tab-goo"
            style={{ transform: tabTransform(g, TAB_COUNT) }}
            onClick={(e) => {
              const bar = liveGoo();
              // still loading: count it anyway, the bar draws it when it arrives
              if (bar) bar.spurt(tabAngle(g, TAB_COUNT) - sc.current.s / (g.R || 1), e.currentTarget.querySelector("svg"));
              else getGoo().add(10);
            }}
          >
            <Droplets aria-hidden className="tube-icon" />
            <span>Goo</span>
          </button>
        </span>
      </span>
      <svg className="tube-goo" {...box}>
        <defs>
          <filter id={`goo-bar-${uid}`} filterUnits="userSpaceOnUse" x={-40} y={-40} width={W + 80} height={190} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            <feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
          </filter>
          <mask id={`goo-mask-${uid}`} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x={-40} y={-40} width={W + 80} height={190}>
            <use href={`#goo-body-${uid}`} />
          </mask>
        </defs>
        <g ref={gg} id={`goo-body-${uid}`} className="goo-body" filter={`url(#goo-bar-${uid})`} fill="#fff" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" />
        {/* where goo covers a tab, an ink copy of its icon and label shows through */}
        <g mask={`url(#goo-mask-${uid})`}>
          <g className="goo-ink" style={{ transformOrigin: `${W / 2}px ${cy.toFixed(2)}px` }}>
            {copies.map(({ key, label, Icon }, k) => (
              <g key={key} className="goo-ink-tab" data-on={key === current || undefined} transform={rot(k)}>
                <Icon x={W / 2 - 12 + (INK_NUDGE[key]?.[0] ?? 0)} y={12.5 + (INK_NUDGE[key]?.[1] ?? 0)} width={24} height={24} strokeWidth={key === current ? 2.4 : 2} />
                <text x={W / 2} y={49} textAnchor="middle">
                  {label}
                </text>
              </g>
            ))}
          </g>
        </g>
      </svg>
      <span ref={blade} className="tube-blade" />
    </nav>
  );
}
