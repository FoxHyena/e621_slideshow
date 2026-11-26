/**
 * The goo on the tab bar, drawn and animated (DESIGN.md "Tab bar goo"). Ported from the approved
 * mock (`docs/path-a/mocks/feed-v6.html`: `gooDraw`, `gooStep`, `gooSet`, `gooWipe`, `gooFall`,
 * `gooSpurt`).
 *
 * Drawn the way the drip under the heart is: a bead, necks and blobs, all one colour, merged by a
 * blur-and-threshold filter. The bead lies along the bar's top edge and spreads from where the
 * drops land; drips creep down the face a little more with each favourite. What n favourites
 * leave is a pure function of n (`gooTarget`); the bar eases and springs from what it shows to
 * that. It only runs a frame loop while something is moving.
 */
import { calm } from "@/feed/motion";
import { getGoo } from "@/state/goo";
import { setLiveGoo, type GooBar } from "./gooLive";
import { edgeAt, gooColor, gooEdge, gooGeo, gooTarget, type Drip, type GooGeo, type GooShape, type TubeGeo } from "./tube";

interface Cur {
  uL: number;
  uR: number;
  t: number;
  tint: number;
}
interface Wipe {
  t0: number;
  pile: number;
  ub: number;
}

export function createGooBar(nav: HTMLElement, gg: SVGGElement, blade: HTMLElement, gleam: HTMLElement, g: TubeGeo): GooBar {
  const q: GooGeo = gooGeo(g);
  let T: GooShape = gooTarget(0, q);
  let cur: Cur = { uL: T.uL, uR: T.uR, t: 0, tint: 0 };
  let drips: Drip[] = [];
  let len = new Map<number, { l: number; v: number }>();
  let plops: { u: number; t0: number }[] = [];
  let wipe: Wipe | null = null;
  let last = 0;
  let raf = 0;
  let inAir = 0;
  /** the count the bar is drawn for */
  let shown = 0;
  let dead = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!dead) fn();
    }, ms);
    timers.add(t);
  };

  const snap = () => {
    cur = { uL: T.uL, uR: T.uR, t: T.t, tint: T.tint };
    drips = T.drips;
    len = new Map(drips.map((d) => [d.id, { l: d.len, v: 0 }]));
  };

  const draw = () => {
    const c = cur;
    const w = wipe;
    const fx = (v: number) => v.toFixed(1);
    const lo = w ? Math.max(c.uL, w.ub) : c.uL;
    const now = performance.now();
    let s = "";
    const dot = (x: number, y: number, r: number) => (r > 0.2 ? `<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(r)}" stroke="none"/>` : "");
    const line = (a: number, b: number, wd: number) => {
      if (b - a < 0.5) return "";
      let d = "";
      for (let u = a; ; u += 3) {
        const uu = Math.min(u, b);
        const e = gooEdge(q, uu);
        d += (d ? "L" : "M") + fx(e.x - e.nx) + " " + fx(e.y - e.ny);
        if (uu >= b) break;
      }
      return `<path d="${d}" fill="none" stroke-width="${fx(wd)}"/>`;
    };
    // the bead, fatter towards where the drops land
    if (c.t > 0.3) s += line(lo, c.uR, c.t) + line(Math.max(lo, T.hu - (T.hu - c.uL) * 0.45), c.uR, c.t + 3);
    // nothing may stand above the bead, or it shows as a tick on the top edge
    const sink = (R: number) => Math.max(0, R - c.t / 2 + 1.6);
    const hanging: [Drip, number][] = [];
    for (const dr of drips) {
      const m = len.get(dr.id);
      if (m && m.l >= 0.5 && !(w && dr.u < w.ub)) hanging.push([dr, m.l]);
    }
    // the skirt: goo hanging under the bead, deeper as it gets heavier, swelling toward each drip
    if (c.t > 0.3 && c.uR - lo > 6) {
      const base = Math.max(0, c.t - 4) * 0.9;
      let top = "";
      let bot = "";
      for (let u = lo; ; u += 2) {
        const uu = Math.min(u, c.uR);
        const e = gooEdge(q, uu);
        const en = Math.min(1, (uu - lo) / 12, (c.uR - uu) / 12);
        let sk = Math.max(0, base * (1 + 0.45 * Math.sin(uu * 0.09 + 0.7) + 0.3 * Math.sin(uu * 0.23 + 2.1)));
        for (const [dr, l] of hanging) {
          const x = (uu - dr.u) / dr.d;
          sk += Math.min(l * 0.7, 14) * Math.exp(-x * x);
        }
        sk = Math.min(sk, 24) * en * en * (3 - 2 * en);
        top += (top ? "L" : "M") + fx(e.x) + " " + fx(e.y);
        bot = "L" + fx(e.x + e.dx * sk) + " " + fx(e.y + e.dy * sk) + bot;
        if (uu >= c.uR) break;
      }
      s += `<path d="${top}${bot}Z" stroke="none"/>`;
    }
    // each drip: as wide as its blob where it leaves the bead, with a heavy round end
    for (const [dr, l] of hanging) {
      const e = gooEdge(q, dr.u);
      const r = dr.d / 2;
      const rb = Math.min(r * (1 + Math.min(0.25, l / 200)), l);
      const by = Math.max(l - rb, sink(rb));
      const bx = e.x + e.dx * by;
      const bY = e.y + e.dy * by;
      const px = -e.dy;
      const py = e.dx;
      const w0 = dr.d * 0.5;
      const w1 = dr.d * 0.36;
      const rr = Math.min(r * 1.1, l);
      const rd = sink(rr);
      s += dot(e.x + e.dx * rd, e.y + e.dy * rd, rr);
      if (by > rd + 1)
        s += `<path d="M${fx(e.x + px * w0)} ${fx(e.y + py * w0)}L${fx(bx + px * w1)} ${fx(bY + py * w1)}L${fx(bx - px * w1)} ${fx(bY - py * w1)}L${fx(e.x - px * w0)} ${fx(e.y - py * w0)}Z" stroke="none"/>`;
      s += dot(bx, bY, rb);
    }
    // a drop that has just landed sinks into the bead
    for (const pl of plops) {
      const k = 1 - (now - pl.t0) / 340;
      const e = gooEdge(q, pl.u);
      if (k > 0) s += dot(e.x + e.nx * 3 * k, e.y + e.ny * 3 * k, 8 * k);
    }
    // while wiping, what the blade has taken off rides in front of it
    if (w && w.pile > 4) {
      const rp = Math.min(13, Math.sqrt(w.pile) * 0.36);
      const e = gooEdge(q, w.ub + 4 + rp * 0.6);
      s += dot(e.x - e.nx * rp * 0.2, e.y - e.ny * rp * 0.2, rp) + dot(e.x + e.dx * rp * 1.2, e.y + e.dy * rp * 1.2, rp * 0.72);
    }
    const col = gooColor(c.tint || 0);
    gg.setAttribute("fill", col);
    gg.setAttribute("stroke", col);
    gg.innerHTML = s;
    nav.toggleAttribute("data-goo", s.length > 0);
  };

  const after = (pile: number, col: string) => {
    if (typeof nav.animate !== "function") return;
    if (pile > 30)
      for (let i = 0; i < 4; i++) {
        const el = document.createElement("span");
        el.className = "tube-fling";
        el.style.background = col;
        el.style.left = `${q.W - 16}px`;
        el.style.top = `${24 + i * 5}px`;
        nav.appendChild(el);
        el.animate(
          [
            { transform: "translate(0, 0) scale(1)", easing: "cubic-bezier(.2,.7,.5,1)" },
            { transform: `translate(${20 + i * 8}px, ${-16 + i * 4}px) scale(.9)`, offset: 0.45, easing: "ease-in" },
            { transform: `translate(${32 + i * 11}px, ${28 + i * 6}px) scale(0)` },
          ],
          { duration: 400 + i * 45, fill: "forwards" },
        ).onfinish = () => el.remove();
      }
    gleam.animate([{ transform: "translateX(-100px) skewX(-14deg)" }, { transform: `translateX(${q.W + 30}px) skewX(-14deg)` }], {
      duration: 520,
      easing: "cubic-bezier(.3,0,.3,1)",
    });
    const n = getGoo().store.get().count;
    if (n > 0) api.set(n);
  };

  /** One frame. Returns whether anything is still moving. */
  const step = (now: number): boolean => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000) || 0.016;
    last = now;
    let moving = false;
    plops = plops.filter((pl) => now - pl.t0 < 340);
    if (plops.length) moving = true;
    if (wipe) {
      const w = wipe;
      const p = Math.min(1, Math.max(0, (now - w.t0) / 900));
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2;
      const m = 36 / q.ro;
      const a = -q.th - m + e * (2 * q.th + 2 * m);
      const ub = (a + q.th) * q.ro;
      const from = Math.max(cur.uL, w.ub);
      const to = Math.min(cur.uR, ub);
      if (to > from) w.pile += (to - from) * cur.t;
      drips = drips.filter((d) => {
        if (d.u >= ub) return true;
        w.pile += (len.get(d.id)?.l ?? 0) * d.d * 0.6;
        return false;
      });
      w.ub = ub;
      blade.style.transform = `rotate(${a.toFixed(4)}rad)`;
      blade.style.opacity = String(p >= 1 ? 0 : Math.min(1, p / 0.06, (1 - p) / 0.06));
      if (p >= 1) {
        wipe = null;
        last = 0;
        const col = gooColor(cur.tint);
        cur = { uL: T.hu, uR: T.hu, t: 0, tint: 0 };
        drips = [];
        len.clear();
        after(w.pile, col);
        return false;
      }
      return true;
    }
    // the bead spreads slowly; drips sag on a soft spring, like the ones under the heart
    const k = 1 - Math.exp(-dt * 3.2);
    for (const key of ["uL", "uR", "t", "tint"] as const) {
      const e = T[key] - cur[key];
      if (Math.abs(e) > 0.05) moving = true;
      cur[key] += e * k;
    }
    for (const d of drips) {
      const m = len.get(d.id);
      if (!m) continue;
      const e = d.len - m.l;
      m.v += (e * 40 - m.v * 9) * dt;
      m.l += m.v * dt;
      if (Math.abs(e) > 0.05 || Math.abs(m.v) > 0.5) moving = true;
    }
    if (!moving) last = 0;
    return moving;
  };

  const tick = (now: number) => {
    raf = 0;
    if (dead) return;
    const moving = step(now);
    draw();
    if (moving) raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf && !dead) raf = requestAnimationFrame(tick);
  };

  const api: GooBar = {
    sync(n) {
      shown = n;
      T = gooTarget(n, q);
      snap();
      draw();
    },
    set(n, landedAt) {
      if (wipe) return;
      shown = n;
      const old = len;
      const u = landedAt ?? q.L * 0.9;
      T = gooTarget(n, q);
      if (calm()) {
        snap();
        draw();
        return;
      }
      // a clean bar starts its bead where the first drop lands
      if (cur.t < 0.1) cur.uL = cur.uR = u;
      drips = T.drips;
      len = new Map(drips.map((d) => [d.id, old.get(d.id) ?? { l: 0, v: 0 }]));
      // nothing to sink into once it's been wiped
      if (n > 0) plops.push({ u, t0: performance.now() });
      kick();
    },
    wipe() {
      shown = 0;
      T = gooTarget(0, q);
      if (calm() || typeof nav.animate !== "function") {
        snap();
        draw();
        return;
      }
      if (wipe) return;
      wipe = { t0: performance.now(), pile: 0, ub: -1e9 };
      kick();
    },
    dropFrom(x, y) {
      if (calm() || typeof nav.animate !== "function") return false;
      const r = nav.getBoundingClientRect();
      if (r.width === 0) return false;
      const u = edgeAt(q, x - r.left);
      const y1 = r.top + gooEdge(q, u).y - 4;
      const dist = y1 - y;
      if (dist < 10) return false;
      inAir++;
      later(() => {
        const el = document.createElement("span");
        el.className = "goo-drop";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        el.animate([{ transform: "translateY(0) scale(.8, 1)" }, { transform: `translateY(${dist}px) scale(.8, 1.5)` }], {
          duration: 70 + 17 * Math.sqrt(dist),
          easing: "cubic-bezier(.45,0,1,.55)",
          fill: "forwards",
        }).onfinish = () => {
          el.remove();
          inAir--;
          if (!dead) api.set(getGoo().store.get().count, u);
        };
      }, 380);
      return true;
    },
    spurt(a, icon) {
      if (calm() || typeof nav.animate !== "function") {
        getGoo().add(10);
        return;
      }
      const x0 = q.cx + (q.R + 16) * Math.sin(a);
      const y0 = 32 + q.R - (q.R + 16) * Math.cos(a);
      const r = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
      // counted now, so none is lost if the bar goes away mid-flight; the drops only draw it.
      // Reserve the ten drops first, so the store's change doesn't draw them all at once.
      inAir += 10;
      getGoo().add(10);
      icon?.animate(
        [0, 1, 2]
          .flatMap((k): Keyframe[] => [
            { transform: "scale(1)", offset: k / 3, easing: "cubic-bezier(.3,0,.4,1)" },
            { transform: `translateY(${3 - k * 0.5}px) scale(${1.24 - k * 0.04}, ${0.74 + k * 0.05})`, offset: k / 3 + 0.1, easing: "cubic-bezier(.3,1.6,.5,1)" },
          ])
          .concat({ transform: "scale(1)" }),
        { duration: 400 },
      );
      // [how many, where along the top edge they come down]: the first pulse reaches the far end
      const pulses: [number, number, number][] = [
        [4, 0.04, 0.44],
        [3, 0.36, 0.7],
        [3, 0.62, 0.92],
      ];
      pulses.forEach(([n, lo, hi], pulse) => {
        for (let j = 0; j < n; j++) {
          later(() => {
            const u = q.L * (lo + ((hi - lo) * (j + r(0.1, 0.9))) / n);
            const e = gooEdge(q, u);
            const dx = e.x + e.nx * 2 - x0;
            const dy = e.y + e.ny * 2 - y0;
            const dist = Math.abs(dx);
            const h = 18 + dist * 0.23 + r(0, 10);
            const dur = 240 + dist * 1.4 + r(0, 50);
            const k = r(0.8, 1.25);
            const N = 12;
            const frames: Keyframe[] = [];
            let prev: number | null = null;
            for (let i = 0; i <= N; i++) {
              const t = i / N;
              const vy = dy - 4 * h * (1 - 2 * t);
              let ang = Math.atan2(vy, dx);
              if (prev != null) {
                while (ang - prev > Math.PI) ang -= 2 * Math.PI;
                while (prev - ang > Math.PI) ang += 2 * Math.PI;
              }
              prev = ang;
              const sp = Math.hypot(dx, vy) / dur;
              const grow = Math.min(1, 0.4 + t * 4);
              frames.push({
                offset: t,
                transform: `translate(${(dx * t).toFixed(1)}px, ${(dy * t - 4 * h * t * (1 - t)).toFixed(1)}px) rotate(${((ang * 180) / Math.PI - 90).toFixed(1)}deg) scale(${(k * grow * 0.85).toFixed(2)}, ${(k * grow * (1 + Math.min(0.7, sp * 0.8))).toFixed(2)})`,
              });
            }
            const el = document.createElement("span");
            el.className = "goo-drop goo-drop-bar";
            el.style.left = `${x0.toFixed(1)}px`;
            el.style.top = `${y0.toFixed(1)}px`;
            nav.appendChild(el);
            el.animate(frames, { duration: dur, fill: "forwards" }).onfinish = () => {
              el.remove();
              inAir--;
              // each drop draws one more; the last one catches up with anything counted meanwhile
              const all = getGoo().store.get().count;
              if (!dead) api.set(inAir === 0 ? all : Math.min(all, shown + 1), u);
            };
          }, pulse * 133 + j * 26);
        }
      });
    },
    toss(x0, y0, n, scale) {
      // calm, or the bar has no box (under the player, say): counted in place, nothing flies
      if (calm() || typeof nav.animate !== "function" || nav.getBoundingClientRect().width === 0) {
        getGoo().add(n);
        return;
      }
      const r = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
      // counted now (none lost if the bar goes away mid-flight); each landing draws one more
      inAir += n;
      getGoo().add(n);
      for (let i = 0; i < n; i++) {
        later(() => {
          const box = nav.getBoundingClientRect();
          // onto the goo that is there, or where goo starts on a clean bar
          const on = cur.t >= 0.1;
          const u = Math.min(Math.max(on ? r(cur.uL - 12, cur.uR + 12) : q.L * 0.9 + r(-14, 14), 10), q.L - 10);
          const e = gooEdge(q, u);
          const dx = box.left + e.x - x0;
          const dy = Math.max(1, box.top + e.y - 4 - y0);
          // up first, then down: a ballistic arc whose top is `rise` above the tip
          const rise = r(22, 40) * Math.max(1, scale);
          const b = 2 * (rise + Math.sqrt(rise * rise + rise * dy));
          const a = dy + b;
          const dur = 70 + 17 * (Math.sqrt(rise) + Math.sqrt(rise + dy));
          const k = r(0.85, 1.2);
          const N = 14;
          const frames: Keyframe[] = [];
          let prev: number | null = null;
          for (let j = 0; j <= N; j++) {
            const t = j / N;
            const vy = 2 * a * t - b;
            let ang = Math.atan2(vy, dx);
            if (prev != null) {
              while (ang - prev > Math.PI) ang -= 2 * Math.PI;
              while (prev - ang > Math.PI) ang += 2 * Math.PI;
            }
            prev = ang;
            const sp = Math.hypot(dx, vy) / dur;
            const grow = Math.min(1, 0.4 + t * 5);
            frames.push({
              offset: t,
              transform: `translate(${(dx * t).toFixed(1)}px, ${(a * t * t - b * t).toFixed(1)}px) rotate(${((ang * 180) / Math.PI - 90).toFixed(1)}deg) scale(${(k * grow * 0.85).toFixed(2)}, ${(k * grow * (1 + Math.min(0.7, sp * 0.8))).toFixed(2)})`,
            });
          }
          const el = document.createElement("span");
          el.className = "goo-drop";
          el.style.left = `${x0.toFixed(1)}px`;
          el.style.top = `${y0.toFixed(1)}px`;
          document.body.appendChild(el);
          el.animate(frames, { duration: dur, fill: "forwards" }).onfinish = () => {
            el.remove();
            inAir--;
            const all = getGoo().store.get().count;
            if (!dead) api.set(inAir === 0 ? all : Math.min(all, shown + 1), u);
          };
        }, 120 + i * 70);
      }
    },
    falling: () => inAir,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      setLiveGoo(null, api);
    },
  };
  setLiveGoo(api);
  return api;
}
