"use client";

/**
 * A pool of goo inside its box (`src/shell/pool.ts`): the sidebar's foot on a computer, the Settings
 * goo row's card on a phone. It lies over what's under it and takes no clicks; `ink` is that content
 * drawn again in Goo Ink, cut by a clip path made of the goo's own shapes, so the cut moves with it.
 *
 * How it moves (DESIGN.md "How a pool moves", owner-approved 2026-11-26): a new count rides the goo's
 * spring with a swell where the goo arrives; Wipe clean drains it in 900 ms, leaning; on a phone the
 * jar starts where it last showed and catches up 250 ms after Settings opens; on a computer a heart's
 * drop falls off the bottom of the window and the pool rises 140 ms after it has left. Reduced
 * motion: the level changes at once, no drop, swell or lean. Drawn by hand each frame (not React).
 */
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { calm } from "@/feed/motion";
import { setLivePool, type GooPool } from "@/shell/gooLive";
import { gooColor } from "@/shell/tube";
import {
  easeInOut,
  POOL_DRAIN_MS,
  POOL_FILTER,
  POOL_LAND,
  POOL_PLOP_MS,
  POOL_TILT,
  poolLevel,
  poolMarkup,
  poolShapesAt,
  poolSpring,
  type PoolKind,
} from "@/shell/pool";
import { getGoo } from "@/state/goo";

/** The level each kind of pool last showed, so the jar can rise from there when Settings opens again. */
const shown: Partial<Record<PoolKind, number>> = {};
const CATCH_UP_MS = 250;
const DROP_DELAY_MS = 380;
const AFTER_DROP_MS = 140;

export function Pool({ kind, ink, className }: { kind: PoolKind; ink?: ReactNode; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gooRef = useRef<SVGGElement>(null);
  const clipRef = useRef<SVGClipPathElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const id = `pool${useId().replace(/[^\w-]/g, "")}`;

  useLayoutEffect(() => {
    const el = box.current!;
    const svg = svgRef.current!;
    const gooG = gooRef.current!;
    const clip = clipRef.current!;
    const inkEl = inkRef.current;
    const goo = getGoo();
    let W = 0;
    let H = 0;
    let dead = false;
    let raf = 0;
    let air = 0;
    // the secret's drops: already on the store's count, shown one by one as each lands
    let held = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const drops = new Set<HTMLElement>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!dead) fn();
      }, ms);
      timers.add(t);
    };

    const count = () => Math.max(0, goo.store.get().count - held);
    const levelOf = (n: number) => (n > 0 ? poolLevel(kind, n) : 0);
    // h: the surface now; tgt: where it's going; cn: the count that sets colour and swell size
    const st = {
      h: 0,
      v: 0,
      tgt: 0,
      cn: count(),
      plops: [] as { x: number; t0: number }[],
      drain: null as { t0: number; from: number } | null,
      last: 0,
      tilt: 0,
    };

    const paint = (now: number) => {
      shown[kind] = st.h;
      el.dataset.drawn = String(Math.round(st.h));
      if (!W || !H) return;
      // clamped: a frame stamped just before the swell began would give it a negative height
      const plops = st.plops.map((p) => ({
        x: p.x,
        p: Math.min(1, Math.max(0, (now - p.t0) / POOL_PLOP_MS)),
      }));
      const shapes = poolShapesAt(kind, st.cn, W, H, st.h, st.tilt, plops);
      if (shapes.length === 0) {
        svg.style.display = "none";
        if (inkEl) inkEl.style.visibility = "hidden";
        return;
      }
      svg.style.display = "";
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", String(W));
      svg.setAttribute("height", String(H));
      const markup = poolMarkup(shapes);
      gooG.setAttribute("fill", gooColor(1 - Math.exp(-st.cn / 70)));
      gooG.innerHTML = markup;
      clip.innerHTML = markup;
      if (inkEl) inkEl.style.visibility = "";
    };

    /** One frame; whether anything is still moving. */
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - (st.last || now)) / 1000) || 0.016;
      st.last = now;
      let moving = false;
      st.plops = st.plops.filter((p) => now - p.t0 < POOL_PLOP_MS);
      if (st.plops.length) moving = true;
      st.tilt = 0;
      if (st.drain) {
        const p = Math.min(1, (now - st.drain.t0) / POOL_DRAIN_MS);
        st.h = st.drain.from * (1 - easeInOut(p));
        st.tilt = POOL_TILT * Math.sin(Math.PI * p) * Math.min(1, st.drain.from / 20);
        st.v = 0;
        if (p >= 1) {
          st.drain = null;
          st.h = 0;
          // a favorite that came during the drain: rise to it now
          if (st.tgt > 0.5) moving = true;
        } else moving = true;
      } else {
        const e = st.tgt - st.h;
        [st.h, st.v] = poolSpring(st.h, st.v, st.tgt, dt);
        if (Math.abs(e) > 0.05 || Math.abs(st.v) > 0.5) moving = true;
        else {
          st.h = st.tgt;
          st.v = 0;
        }
      }
      if (!moving) st.last = 0;
      return moving;
    };
    const tick = (now: number) => {
      const more = step(now);
      paint(now);
      raf = more ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf && !dead) raf = requestAnimationFrame(tick);
    };

    /** Aim at the count's level; a rise brings a swell where the goo arrives (`x` along, if given). */
    const aim = (x?: number) => {
      const n = count();
      const t = levelOf(n);
      el.dataset.level = String(Math.round(t));
      if (n > 0) st.cn = n;
      if (calm()) {
        Object.assign(st, {
          h: t,
          v: 0,
          tgt: t,
          drain: null,
          plops: [],
          tilt: 0,
        });
        return paint(performance.now());
      }
      if (!st.drain && t > st.tgt + 0.01) st.plops.push({ x: x ?? W * POOL_LAND[kind], t0: performance.now() });
      st.tgt = t;
      kick();
    };
    /** Wipe clean (or signing out): sink to nothing in step with the blade. */
    const drain = () => {
      const t = levelOf(count());
      el.dataset.level = String(Math.round(t));
      if (calm() || st.h <= 0.5) return aim();
      st.tgt = t;
      st.drain = { t0: performance.now(), from: st.h };
      st.plops = [];
      kick();
    };

    // Where it starts: at rest, or (the jar, opened again) where it last showed, then catching up.
    const t0 = levelOf(count());
    el.dataset.level = String(Math.round(t0));
    const from = shown[kind];
    if (kind === "jar" && from !== undefined && Math.abs(from - t0) > 0.5 && !calm()) {
      st.h = st.tgt = from;
      later(aim, CATCH_UP_MS);
    } else st.h = st.tgt = t0;

    const measure = () => {
      const r = el.getBoundingClientRect();
      W = Math.round(r.width * 100) / 100;
      H = Math.round(r.height * 100) / 100;
      paint(performance.now());
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let wipes = goo.store.get().wipes;
    const off = goo.store.subscribe(() => {
      const s = goo.store.get();
      if (s.wipes !== wipes) {
        wipes = s.wipes;
        held = 0;
        return drain();
      }
      // a drop still falling: the pool waits for it
      if (air === 0) aim();
    });

    // On a computer, a heart's drop falls past the bottom of the window, and the pool takes it in.
    let api: GooPool | undefined;
    if (kind === "side") {
      api = {
        dropFrom(x, y) {
          if (calm() || typeof document.body.animate !== "function") return false;
          air++;
          const land = () => {
            air = Math.max(0, air - 1);
            if (air === 0) aim();
          };
          later(() => {
            const dist = window.innerHeight + 12 - y;
            if (dist < 10) return later(land, AFTER_DROP_MS);
            const d = document.createElement("span");
            d.className = "goo-drop";
            d.style.left = `${x}px`;
            d.style.top = `${y}px`;
            document.body.appendChild(d);
            drops.add(d);
            d.animate([{ transform: "translateY(0) scale(.8, 1)" }, { transform: `translateY(${dist}px) scale(.8, 1.5)` }], {
              duration: 70 + 17 * Math.sqrt(dist),
              easing: "cubic-bezier(.45,0,1,.55)",
              fill: "forwards",
            }).onfinish = () => {
              d.remove();
              drops.delete(d);
              later(land, AFTER_DROP_MS);
            };
          }, DROP_DELAY_MS);
          return true;
        },
        spurt(icon) {
          if (calm() || typeof document.body.animate !== "function") return void goo.add(10);
          // counted now, so none is lost if the sidebar goes; the pool takes them in one by one
          held += 10;
          goo.add(10);
          icon?.animate(
            [0, 1, 2]
              .flatMap((k): Keyframe[] => [
                {
                  transform: "scale(1)",
                  offset: k / 3,
                  easing: "cubic-bezier(.3,0,.4,1)",
                },
                {
                  transform: `translateY(${3 - k * 0.5}px) scale(${1.24 - k * 0.04}, ${0.74 + k * 0.05})`,
                  offset: k / 3 + 0.1,
                  easing: "cubic-bezier(.3,1.6,.5,1)",
                },
              ])
              .concat({ transform: "scale(1)" }),
            { duration: 400 },
          );
          const r = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
          [4, 3, 3].forEach((n, pulse) => {
            for (let j = 0; j < n; j++) {
              later(
                () => {
                  const ir = icon?.getBoundingClientRect();
                  const pr = el.getBoundingClientRect();
                  const x0 = ir ? ir.left + ir.width / 2 : pr.left + pr.width / 2;
                  const y0 = ir ? ir.top + ir.height / 2 : pr.top;
                  // thrown up a little, then down onto the surface somewhere along the pool
                  const along = r(28, Math.max(29, pr.width - 28));
                  const dx = pr.left + along - x0;
                  const dy = Math.max(0, pr.bottom - st.h - 2 - y0);
                  const U = r(180, 320);
                  const k = r(0.8, 1.2);
                  const frames: Keyframe[] = Array.from({ length: 13 }, (_, i) => {
                    const t = i / 12;
                    return {
                      offset: t,
                      transform: `translate(${(dx * t).toFixed(1)}px, ${(-U * t + (dy + U) * t * t).toFixed(1)}px) scale(${(k * 0.85).toFixed(2)}, ${(k * (1 + 0.5 * t)).toFixed(2)})`,
                    };
                  });
                  const d = document.createElement("span");
                  d.className = "goo-drop";
                  d.style.left = `${x0.toFixed(1)}px`;
                  d.style.top = `${y0.toFixed(1)}px`;
                  document.body.appendChild(d);
                  drops.add(d);
                  d.animate(frames, {
                    duration: 300 + 17 * Math.sqrt(dy) + r(0, 80),
                    fill: "forwards",
                  }).onfinish = () => {
                    d.remove();
                    drops.delete(d);
                    if (held > 0) held--;
                    // (a heart's drop still falling: the pool waits for that one too)
                    if (air === 0) aim(along);
                  };
                },
                pulse * 133 + j * 26,
              );
            }
          });
        },
      };
      setLivePool(api);
    }

    return () => {
      dead = true;
      off();
      ro.disconnect();
      cancelAnimationFrame(raf);
      for (const t of timers) clearTimeout(t);
      for (const d of drops) d.remove();
      if (api) setLivePool(null, api);
    };
  }, [kind]);

  return (
    <span ref={box} className={`pool ${className ?? ""}`} data-kind={kind} aria-hidden data-testid={`pool-${kind}`}>
      <svg ref={svgRef} style={{ display: "none" }}>
        <filter id={`${id}f`} x="-10%" y="-10%" width="120%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={POOL_FILTER.blur} />
          <feColorMatrix values={POOL_FILTER.matrix} />
        </filter>
        <clipPath ref={clipRef} id={`${id}c`} clipPathUnits="userSpaceOnUse" />
        <g ref={gooRef} filter={`url(#${id}f)`} />
      </svg>
      {ink && (
        <span ref={inkRef} className="pool-ink" style={{ clipPath: `url(#${id}c)`, visibility: "hidden" }}>
          {ink}
        </span>
      )}
    </span>
  );
}
