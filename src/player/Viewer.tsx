"use client";

/**
 * The picture viewer (`?view=<postId>`, DESIGN.md "A post on its own"): one picture full screen, to
 * zoom and save, without the slideshow. The player's room and glass: ✕, the artist's row, and
 * Favorite, Post info, Share and Save. One tap shows or hides the buttons; a double tap zooms (it
 * does not favorite here); pinch zooms 1 to 5 times, a drag moves a zoomed picture, and a drag down
 * on an unzoomed one closes. On a computer the wheel zooms and Post info stands beside the picture.
 */
import { ChevronLeft, ChevronRight, CircleAlert, Download, EyeOff, Heart, Info, Pause, Play, RefreshCw, Share, SkipBack, SkipForward, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { turnMark } from "@/feed/motion";
import { searchPosts } from "@/lib/e621/client";
import { mediaKind, type Post } from "@/lib/e621/types";
import { ago, artists, compact } from "@/lib/feed/format";
import { displayUrl } from "@/lib/slideshow/media";
import { blacklistedBy, parseBlacklist } from "@/lib/query/blacklist";
import { revealed } from "@/feed/revealed";
import { askPost, hasKnownPost, knownPost } from "@/feed/postCache";
import { blacklistOf, getPrefs } from "@/state/prefs";
import Avatar from "@/components/Avatar";
import { ImageIcon, Loader } from "@/components/Loader";
import { getNav, type Entry } from "@/nav/history";
import { revealY, setLockedY } from "@/nav/scroll";
import { getFavs, favedOf } from "@/state/favs";
import { getGoo } from "@/state/goo";
import { getFeeds } from "@/state/feeds";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { sharePost } from "@/screens/actions";
import { openPaused } from "./intent";
import { savePost } from "./save";
import { actionLook } from "@/shell/toastLook";
import { ComicTimeSheet, PlayerInfoSheet, QualitySheet, QuickSettingsSheet } from "./sheets";
import { TimeLeft } from "./timeLeft";
import { ComicBar, PagesSheet, setPlace, useComic, usePages, usePool } from "@/feed/comics";
import { FollowPill } from "@/feed/FollowPill";
import { Goo } from "@/components/Goo";

/** A second tap this soon is a double tap. */
const DOUBLE_TAP_MS = 250;
const MAX_ZOOM = 5;
/** A double tap zooms to this, at the tapped point (owner-picked "Zoom"). */
const TAP_ZOOM = 2.5;
const ZOOM_MS = 280;
/** A drag down this far (unzoomed) closes the viewer. */
const CLOSE_PX = 120;
/** Swipes starting this close to the left edge belong to Back. */
const EDGE_PX = 24;
/** A comic's page turns in this long (DESIGN.md "A comic"), and past this much of a sideways drag. */
const TURN_MS = 320;
const TURN_PX = 60;

/** While the reader plays, the buttons step aside after this long (as in the player). */
const HIDE_CONTROLS_MS = 2500;

/** Kept from page to page of a comic: whether the buttons show, and which side the new page comes in from. */
let chromeShown = true;
let enterFrom = 0;

interface View {
  s: number;
  x: number;
  y: number;
}
const FIT: View = { s: 1, x: 0, y: 0 };

/** How long a link waits, once the sign-in is settled, for its screen's feed before it's taken as having none. */
const FEED_WAIT_MS = 2000;

/** The post: from the screen's feed when it is there, else asked of e621 (a reload, a link). */
function useViewedPost(base: Entry, id: string): { post: Post | null; missing: boolean; inFeed: boolean; feedAnswered: boolean } {
  const reg = getFeeds();
  useStore(reg.generation, (g) => g);
  const feed = reg.bound(base.key);
  useStore(feed?.version ?? reg.generation, (v) => v);
  const inFeed = feed?.queue.posts.find((p) => String(p.id) === id) ?? null;
  const creds = useStore(getSession().store, (s) => s.creds);
  const user = creds?.username;
  // the post's page already asked for it (src/feed/postCache.ts): no second ask, no loader
  const cached = hasKnownPost(user, id) ? { id, post: knownPost(user, id) ?? null } : null;
  const [fetched, setFetched] = useState<{ id: string; post: Post | null } | null>(null);
  const got = cached ?? (fetched?.id === id ? fetched : null);
  useEffect(() => {
    if (inFeed || got) return;
    let live = true;
    askPost(user, id, () => searchPosts(`id:${id}`, 1, 1, creds))
      .then((p) => live && setFetched({ id, post: p }))
      .catch(() => live && setFetched({ id, post: null }));
    return () => {
      live = false;
    };
  }, [id, inFeed, got, creds, user]);
  const post = inFeed ?? got?.post ?? null;
  // Whether "not in the feed" means anything yet: a reload asks for the post and the feed's first page
  // together, and the post can come first.
  // No feed binds before the sign-in is settled, so the wait starts from then; only a video waits.
  const ready = useStore(getSession().store, (s) => s.ready);
  const [late, setLate] = useState(false);
  const waiting = ready && !inFeed && post !== null && mediaKind(post) === "video";
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setLate(true), FEED_WAIT_MS);
    return () => clearTimeout(t);
  }, [waiting]);
  const q = feed?.queue;
  const feedAnswered = ready && ((!!q && (q.posts.length > 0 || q.exhausted || q.error !== null)) || late);
  return { post, missing: !inFeed && got !== null && got.post === null, inFeed: inFeed !== null, feedAnswered };
}

/** The viewer, or the comic reader when the route names one (it shares the viewer's place in the shell). */
export function Viewer({ base, top }: { base: Entry; top: Entry }) {
  return top.route.read ? <Reader key="read" base={base} top={top} /> : <PictureViewer key="view" base={base} top={top} />;
}

/** One page at a time: a comic's next page is a fresh picture (its zoom, its file, its loader). */
function PictureViewer({ base, top }: { base: Entry; top: Entry }) {
  // what a comic keeps from page to page ends with the viewer: the next one opens with its buttons
  useEffect(
    () => () => {
      chromeShown = true;
      enterFrom = 0;
    },
    [],
  );
  // the room opens (a fade and a rise) on the first page only: a turned-to page is already in it
  const [first] = useState(top.route.view);
  const [turned, setTurned] = useState(false);
  if (!turned && top.route.view !== first) setTurned(true);
  return <ViewerPage key={top.route.view ?? ""} base={base} top={top} turned={turned} />;
}

/** What the reader keeps from page to page: whether its timer turns the pages, and the end. */
interface Reading {
  pool: number;
  paused: boolean;
  setPaused: (p: boolean) => void;
  ended: boolean;
  setEnded: (e: boolean) => void;
}

/**
 * The comic reader (`?read=<pool>&post=<postId>`, DESIGN.md "Comics, part two"): the player on one
 * comic, a page at a time. The viewer's picture (pinch, sideways turns, a drag down to close) under
 * the player's chrome: the count in pages, the capsule (the Pages sheet), the artist with Follow,
 * Favorite, Post info, Quick settings and Share, Previous, Play and Next, and the bar. It starts
 * paused; playing, it turns a page each "Comic page time". After the last page, the end.
 */
function Reader({ base, top }: { base: Entry; top: Entry }) {
  const read = top.route.read!;
  // owner: "Start paused"
  const [paused, setPaused] = useState(true);
  const [ended, setEnded] = useState(false);
  useEffect(
    () => () => {
      chromeShown = true;
      enterFrom = 0;
    },
    [],
  );
  const [first] = useState(read.page);
  const [turned, setTurned] = useState(false);
  if (!turned && read.page !== first) setTurned(true);
  const reading: Reading = { pool: read.pool, paused, setPaused, ended, setEnded };
  return <ViewerPage key={read.page} base={base} top={top} turned={turned} reading={reading} />;
}

function ViewerPage({ base, top, turned, reading }: { base: Entry; top: Entry; turned: boolean; reading?: Reading }) {
  const nav = getNav();
  const id = reading ? String(top.route.read!.page) : (top.route.view ?? "");
  const sheet = top.sheet;
  const { post, missing, inFeed, feedAnswered } = useViewedPost(base, id);
  const [now] = useState(() => Date.now());
  const [controls, setControlsState] = useState(chromeShown);
  const setControls = (f: (c: boolean) => boolean) =>
    setControlsState((c) => {
      chromeShown = f(c);
      return chromeShown;
    });
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** the full file, once the picture is zoomed past fit and it has loaded */
  const [sharp, setSharp] = useState(false);

  const close = () => void nav.back();

  // ---- a comic (src/feed/comics.tsx): its pages, and the ones either side of this one --------
  const comic = useComic(post, reading?.pool ?? null);
  // where you stopped in this comic: the last page open here or in the viewer
  useEffect(() => {
    if (comic && post) setPlace(comic.pool.id, post.id);
  }, [comic?.pool.id, post?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // a reader link to a post the comic doesn't list (edited, or the pool changed since): its first page
  const named = usePool(reading?.pool ?? null);
  const stray = !!named && named.post_ids.length > 0 && !named.post_ids.includes(Number(id));
  useEffect(() => {
    if (stray && named) nav.replace({ ...top.route, read: { pool: named.id, page: named.post_ids[0] } });
  }, [stray]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = usePages(comic);
  const ids = comic?.pool.post_ids;
  const at = ids && post ? ids.indexOf(post.id) : -1;
  const blacklist = useStore(getPrefs().store, blacklistOf);
  const username = useStore(getSession().store, (s) => s.user?.name);
  const rules = parseBlacklist(blacklist);
  /** A page a turn can land on: not one e621 didn't send, hides from you, or your blacklist hides (unless shown once). */
  const turnable = (i: number) => {
    // until the pages are known, a turn could land on one your blacklist hides: wait for them
    if (!list) return false;
    const p = list[i];
    if (p === null) return false;
    if (p === undefined) return true; // its ask failed: the page itself says what it is
    return displayUrl(p, "sample") !== null && (revealed.has(p.id) || blacklistedBy(rules, p, { username }) === null);
  };
  /** The page a turn goes to (+1 on, -1 back), past the ones it can't land on; null at either end. */
  const nearAt = (d: number) => {
    if (!ids || at < 0) return -1;
    for (let i = at + d; i >= 0 && i < ids.length; i += d) if (turnable(i)) return i;
    return -1;
  };
  const near = (d: number) => {
    const i = nearAt(d);
    return i < 0 ? null : ids![i];
  };
  // the pages either side load before they're turned to (only ones a turn can land on)
  const preload = [-1, 1].map((d) => {
    const p = list?.[nearAt(d)];
    return (p && displayUrl(p, "sample")) || "";
  });
  useEffect(() => {
    for (const src of preload) if (src) new Image().src = src;
  }, [preload[0], preload[1]]); // eslint-disable-line react-hooks/exhaustive-deps -- the two urls
  const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Go to a page in this viewer's place (Back still closes the viewer). */
  const goTo = (pid: number, from = 0) => {
    enterFrom = from;
    nav.replace(reading ? { ...top.route, read: { pool: reading.pool, page: pid } } : { ...top.route, view: String(pid) });
  };
  const turning = useRef(false);
  const turnTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(turnTimer.current), []);
  /** Turn one page on (+1) or back (-1): the picture slides off, the next comes in from the other side. */
  const turn = (d: 1 | -1) => {
    if (reading?.ended) {
      // Previous (←), or a drag to the right on the end, goes back to the last page; the end goes no further
      if (d === -1) reading.setEnded(false);
      return void paint(FIT, true);
    }
    const pid = near(d);
    // past the last page: the end (a comic does not loop, whatever Loop says)
    if (pid === null && d === 1 && reading && list && !turning.current) {
      reading.setPaused(true);
      reading.setEnded(true);
      return void paint(FIT, true);
    }
    if (pid === null || turning.current) return void paint(FIT, true);
    const w = stage.current?.clientWidth ?? 0;
    if (reducedMotion() || !w) return goTo(pid);
    turning.current = true;
    slide(-d * w);
    turnTimer.current = setTimeout(() => {
      // still this viewer's entry (not closed, no sheet opened over it meanwhile): turn
      if (getNav().current().key === top.key) return goTo(pid, d * w);
      turning.current = false;
      slide(0);
    }, TURN_MS);
  };

  // Videos don't open the viewer in this pass (DESIGN.md): a video tile, or a link to one, opens the
  // player paused in this entry's place.
  const video = post !== null && mediaKind(post) === "video";
  // the reader plays a comic's video page itself, and says so when a page can't be shown
  const hidden =
    post !== null && (displayUrl(post, "sample") === null || (!revealed.has(post.id) && blacklistedBy(parseBlacklist(blacklist), post, { username }) !== null));
  // What the viewer can't show goes to the post's own page, which plays it or says why (a review,
  // 2026-11-27: these sat on a loader): a video with no feed for the player to find it in, a picture
  // e621 hides from you, a post on your blacklist you haven't chosen to see there.
  const away = !reading && post !== null && ((video && !inFeed && feedAnswered) || hidden);
  useEffect(() => {
    if (!away || !post) return;
    nav.replace({ screen: { kind: "post", id: post.id }, play: null });
  }, [away]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // the player plays it from the feed: wait until it's there (or `away` takes it to its page)
    if (reading || !video || !inFeed || away) return;
    openPaused(true);
    nav.replace({ screen: top.route.screen, play: id });
  }, [video, inFeed, away]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing lands the feed on this post, as the player's close does.
  useLayoutEffect(
    () => () => {
      const now = getNav().current().route;
      if (now.view || now.play || now.read) return;
      const y = revealY(base.key, Number(id));
      if (y !== null) setLockedY(y);
    },
    [base.key, id],
  );

  // ---- the picture's place ---------------------------------------------------
  const stage = useRef<HTMLDivElement>(null);
  const pic = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const view = useRef<View>(FIT);
  /** the picture's box at fit, for keeping a zoomed picture over the screen */
  const fitBox = () => {
    const st = stage.current?.getBoundingClientRect();
    const im = img.current;
    if (!st || !im || !im.naturalWidth) return { w: st?.width ?? 0, h: st?.height ?? 0, W: st?.width ?? 0, H: st?.height ?? 0 };
    const k = Math.min(st.width / im.naturalWidth, st.height / im.naturalHeight);
    return { w: im.naturalWidth * k, h: im.naturalHeight * k, W: st.width, H: st.height };
  };
  const clamp = (v: View): View => {
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s));
    const { w, h, W, H } = fitBox();
    const mx = Math.max(0, (w * s - W) / 2);
    const my = Math.max(0, (h * s - H) / 2);
    return { s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  };
  const paint = (v: View, animate = false, drop = 0) => {
    view.current = v;
    const el = pic.current;
    if (!el) return;
    el.style.transition = animate ? `transform ${ZOOM_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : "none";
    el.style.transform = `translate(${v.x}px, ${v.y + drop}px) scale(${v.s})`;
    // the room fades as the picture is dragged down, so the feed it came from shows through
    stage.current?.parentElement?.style.setProperty("--drop", String(Math.min(1, Math.abs(drop) / (CLOSE_PX * 2.5))));
    const z = v.s > 1.01;
    setZoomed(z);
    if (z) setSharp(true);
  };
  /** Move the unzoomed picture sideways to x, at a page turn's pace. */
  const slide = (x: number) => {
    view.current = FIT;
    const el = pic.current;
    if (!el) return;
    el.style.transition = `transform ${TURN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
    el.style.transform = `translate(${x}px, 0px)`;
  };
  // a turned-to page comes in from the side it was turned from
  const picShown = !!post && displayUrl(post, "sample") !== null;
  // Held by this page until the slide starts: an effect that runs again (Strict Mode, or the picture
  // arriving a render later) slides it in again rather than leaving it off to the side.
  const entering = useRef(enterFrom);
  useLayoutEffect(() => {
    enterFrom = 0;
    const from = entering.current;
    const el = pic.current;
    if (!from || !el) return;
    el.style.transition = "none";
    el.style.transform = `translate(${from}px, 0px)`;
    let f = requestAnimationFrame(() => {
      f = requestAnimationFrame(() => {
        entering.current = 0;
        slide(0);
      });
    });
    return () => cancelAnimationFrame(f);
  }, [picShown]);
  /** Zoom to `s` keeping the screen point (cx, cy), from the stage's centre, where it is. */
  const zoomAt = (s: number, cx: number, cy: number, animate: boolean) => {
    const v = view.current;
    const k = Math.min(MAX_ZOOM, Math.max(1, s)) / v.s;
    paint(clamp({ s: v.s * k, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }), animate);
  };
  const fromCentre = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    return [clientX - r.left - r.width / 2, clientY - r.top - r.height / 2] as const;
  };
  // ---- the reader's timer (DESIGN.md "Comics, part two", Its time) -------------------------------
  const playback = useStore(getPrefs().store, (p) => p.playback);
  const [burst, setBurst] = useState(0);
  const [videoSec, setVideoSec] = useState<number | null>(null);
  const pageMs = useMemo(() => {
    const ms = (playback.comicPageSec ?? 20) * 1000;
    // a video page plays to its end, by the player's video rules
    if (!post || !video) return ms;
    const len = videoSec ?? post.files.meta.duration ?? 0;
    const cap = playback.videoMaxSec > 0 ? playback.videoMaxSec : Infinity;
    return Math.max(ms, Math.min(len, cap) * 1000);
  }, [playback.comicPageSec, playback.videoMaxSec, post, video, videoSec]);
  // it waits while a sheet is open, while the page is zoomed, and at the end
  const running = !!reading && loaded && !reading.paused && !reading.ended && sheet === null && !zoomed && !hidden;
  // The time this page has played, as the bar counts it: a new page time (or a video's length, known
  // once it loads) moves the end, not where it is. A page's round starts again when its time is up, on
  // "Read again", or when the end is left (a review, 2026-11-28: the end came straight back).
  const spent = useRef(0);
  const [round, setRound] = useState(0);
  const restart = () => {
    spent.current = 0;
    setRound((r) => r + 1);
  };
  const onPageDone = useEffectEvent(() => {
    restart();
    turn(1);
  });
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    let done = false;
    const t = setTimeout(() => {
      done = true;
      onPageDone();
    }, Math.max(0, pageMs - spent.current));
    return () => {
      clearTimeout(t);
      // the page's time ran out: its round starts again from nothing
      if (!done) spent.current += Date.now() - started;
    };
  }, [running, pageMs, round]);
  // a video page plays only while the page's time runs (paused, under a sheet, zoomed or at the end, it waits)
  const clip = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = clip.current;
    if (!v) return;
    if (running) void v.play().catch(() => {});
    else v.pause();
  }, [running, loaded]);
  const bar = useRef<HTMLDivElement>(null);
  // while it plays, the buttons step aside after 2.5 s, as in the player; a tap brings them back
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hovering = useRef(false);
  /** The buttons come back (a move, a key, a tap) and, while it plays, step aside again after 2.5 s. */
  const stepAside = (playing: boolean) => {
    clearTimeout(hideTimer.current);
    if (playing)
      hideTimer.current = setTimeout(() => {
        if (!hovering.current) setControls(() => false);
      }, HIDE_CONTROLS_MS);
  };
  const poke = () => {
    if (!reading) return;
    setControls(() => true);
    stepAside(!reading.paused);
  };
  const play = (on: boolean) => {
    if (!reading) return;
    reading.setPaused(!on);
    setControls(() => true);
    stepAside(on);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  /** "Read again": page 1 (the first there is to read), paused. */
  const again = () => {
    if (!reading || !ids) return;
    reading.setPaused(true);
    reading.setEnded(false);
    restart();
    const i = ids.findIndex((_, k) => turnable(k));
    if (i >= 0 && ids[i] !== post?.id) goTo(ids[i]);
  };
  const shareIt = () => post && void sharePost(post);
  // a drag to the right on the end goes back to the last page, as a turn back does
  const endFrom = useRef<number | null>(null);
  const endDown = (e: React.PointerEvent) => {
    endFrom.current = e.target === e.currentTarget || !(e.target as Element).closest("button") ? e.clientX : null;
  };
  const endUp = (e: React.PointerEvent) => {
    if (endFrom.current !== null && e.clientX - endFrom.current > TURN_PX) turn(-1);
    endFrom.current = null;
  };

  // ---- hands -------------------------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: "one"; x: number; y: number; v: View; moved: boolean; axis: "down" | "pan" | "turn" | "none" | null; t: number }
    | { kind: "pinch"; d: number; mx: number; my: number; v: View }
    | null
  >(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(tapTimer.current), []);
  const two = () => {
    const [a, b] = [...pointers.current.values()];
    const [mx, my] = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx, my };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    // a page on its way off answers nothing until the next one is in
    if (turning.current) return;
    if (e.pointerType === "touch" && e.clientX < EDGE_PX && pointers.current.size === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) gesture.current = { kind: "pinch", ...two(), v: view.current };
    else if (pointers.current.size === 1) gesture.current = { kind: "one", x: e.clientX, y: e.clientY, v: view.current, moved: false, axis: null, t: performance.now() };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const { d, mx, my } = two();
      const s = Math.min(MAX_ZOOM, Math.max(1, (g.v.s * d) / g.d));
      const k = s / g.v.s;
      paint(clamp({ s, x: mx - (g.mx - g.v.x) * k, y: my - (g.my - g.v.y) * k }));
      return;
    }
    if (g.kind !== "one") return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 8) return;
    g.moved = true;
    // a mouse never drags the viewer shut: Esc and ✕ do that on a computer
    // a comic's page turns with a sideways drag; a mouse turns it too
    g.axis ??=
      g.v.s > 1.01
        ? "pan"
        : comic && Math.abs(dx) > Math.abs(dy)
          ? "turn"
          : e.pointerType !== "mouse" && dy > 0 && Math.abs(dy) > Math.abs(dx)
            ? "down"
            : "none";
    if (g.axis === "pan") paint(clamp({ s: g.v.s, x: g.v.x + dx, y: g.v.y + dy }));
    else if (g.axis === "down") paint(FIT, false, Math.max(0, dy));
    // no page that way: the picture holds back, a third of the finger's travel
    else if (g.axis === "turn") paint({ s: 1, x: near(dx < 0 ? 1 : -1) === null ? dx / 3 : dx, y: 0 });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.kind === "pinch") {
      // the finger left on the glass carries on as a pan from here
      const [rest] = [...pointers.current.values()];
      gesture.current = rest ? { kind: "one", x: rest.x, y: rest.y, v: view.current, moved: true, axis: "pan", t: 0 } : null;
      if (view.current.s < 1.01) paint(FIT, true);
      return;
    }
    gesture.current = null;
    if (!g || g.kind !== "one") return;
    const dy = e.clientY - g.y;
    if (g.axis === "down") {
      if (dy > CLOSE_PX) close();
      else paint(FIT, true);
      return;
    }
    if (g.axis === "turn") {
      const dx = e.clientX - g.x;
      if (Math.abs(dx) > TURN_PX) turn(dx < 0 ? 1 : -1);
      else paint(FIT, true);
      return;
    }
    if (g.moved) return;
    // A tap shows or hides the buttons; a double tap zooms to 2.5 at the point, or back to fit.
    const t = performance.now();
    if (t - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (reading) {
        // as in the player: a double tap favorites (never un-favorites)
        setBurst((b) => b + 1);
        if (post && !favedOf(getFavs().store.get(), post)) {
          if (getSession().store.get().creds) getGoo().addFav(post.id);
          getFavs().toggle(post);
        }
        return;
      }
      if (view.current.s > 1.01) paint(FIT, true);
      else zoomAt(TAP_ZOOM, ...fromCentre(e.clientX, e.clientY), true);
      return;
    }
    lastTap.current = t;
    tapTimer.current = setTimeout(() => {
      const shown = !controls;
      setControls(() => shown);
      // shown again while it plays: they step aside again in 2.5 s
      if (reading) stepAside(shown && !reading.paused);
    }, DOUBLE_TAP_MS);
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (gesture.current?.kind === "one" && (gesture.current.axis === "down" || gesture.current.axis === "turn")) paint(FIT, true);
    gesture.current = null;
  };
  // the wheel zooms at the pointer (a computer); a native listener, so it can stop the page's scroll
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(view.current.s * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  // ---- buttons ------------------------------------------------------------------
  const favs = getFavs();
  const faved = useStore(favs.store, (s) => (post ? favedOf(s, post) : false));
  const toggleFav = () => {
    if (!post) return;
    if (!favedOf(favs.store.get(), post) && getSession().store.get().creds) {
      getGoo().addFav(post.id);
      turnMark(document.querySelector(".viewer .player-who .mark"));
    }
    favs.toggle(post);
  };
  const by = post ? (artists(post)[0] ?? null) : null;
  /** Save (src/player/save.ts): the share sheet on a phone, a download on a computer. */
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!post || saving) return;
    setSaving(true);
    const r = await savePost(post, by).finally(() => setSaving(false));
    // DESIGN.md, the viewer's Save: two-line toasts; the failed one offers "Open" (6 s, with the ring)
    if (r === "again") toast("The picture is ready", { description: "Tap Save again", icon: <Download /> });
    else if (r === "failed") {
      const url = post.files.original.url;
      toast("Couldn't save it here", {
        description: "Open the full picture instead",
        icon: <CircleAlert data-tone="danger" />,
        // straight from the tap on Open, so no browser blocks the tab
        ...(url && { ...actionLook(), action: { label: "Open", onClick: () => void window.open(url, "_blank", "noopener") } }),
      });
    }
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (sheet && e.key !== "Escape") return;
    if (reading) {
      // the player's keys (UX §8), with ← → turning the page
      if (e.key === " ") {
        e.preventDefault();
        return play(!reading.paused);
      }
      if (e.key === "s" || e.key === "S") return nav.openSheet("player-settings");
    }
    switch (e.key) {
      case "Escape":
        if (!sheet) close();
        break;
      case "l":
      case "L":
        toggleFav();
        break;
      case "i":
      case "I":
        if (post) nav.openSheet("player-info");
        break;
      case "+":
      case "=":
        zoomAt(view.current.s * 1.5, 0, 0, true);
        break;
      case "-":
        zoomAt(view.current.s / 1.5, 0, 0, true);
        break;
      case "0":
        paint(FIT, true);
        break;
      // a comic's pages (on a computer, beside the two glass buttons)
      case "ArrowRight":
        if (comic && view.current.s <= 1.01) turn(1);
        if (reading) poke();
        break;
      case "ArrowLeft":
        if (comic && view.current.s <= 1.01) turn(-1);
        if (reading) poke();
        break;
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Focus the viewer when it opens, as the player does, so keys and screen readers land here.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  const src = post ? displayUrl(post, "sample") : null;
  const full = post?.files.original.url ?? null;
  // paused, the reader keeps its buttons, as the player does
  const showControls = (controls || !!reading?.paused) && !zoomed;

  const ended = !!reading?.ended;
  // the end's way back: to the slide the reader was opened from, or to the comic's page
  const backTo = top.route.play ? "Back to the slideshow" : comic ? `Back to ${comic.name}` : "Back";

  return (
    <div
      ref={box}
      className={reading ? "player viewer reader" : "player viewer"}
      role="dialog"
      aria-modal="true"
      aria-label={reading ? "Comic" : "Picture"}
      tabIndex={-1}
      data-controls={showControls || undefined}
      data-info={sheet === "player-info" || undefined}
      data-testid={reading ? "reader" : "viewer"}
      data-post-id={post?.id}
      data-zoomed={zoomed || undefined}
      data-comic={comic ? "" : undefined}
      data-turned={turned || undefined}
      data-pages={list ? "" : undefined}
      data-ended={ended || undefined}
      data-paused={reading ? reading.paused || undefined : undefined}
      onMouseMove={reading ? poke : undefined}
    >
      <div
        ref={stage}
        className="player-stage viewer-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        data-testid="viewer-stage"
      >
        {post && src && !hidden && (!video || reading) && (
          <div ref={pic} className="viewer-pic" data-testid="viewer-pic">
            {/* eslint-disable @next/next/no-img-element -- e621's CDN, shown as is */}
            {video ? (
              <video
                ref={clip}
                src={src}
                playsInline
                loop
                muted={playback.videoMuted}
                onLoadedMetadata={(e) => setVideoSec(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : null)}
                onLoadedData={() => setLoaded(true)}
              />
            ) : (
              <img ref={img} src={src} alt="" draggable={false} onLoad={() => setLoaded(true)} />
            )}
            {!video && sharp && full && full !== src && <img src={full} alt="" draggable={false} className="viewer-sharp" onLoad={(e) => e.currentTarget.setAttribute("data-in", "")} />}
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        )}
      </div>
      {post && !loaded && !hidden && !ended && (
        <div className="player-center">
          <Loader step={{ phase: "media" }} size="md" bare delayMs={600} label={video ? "Loading video" : "Loading image"} icons={[ImageIcon]} />
        </div>
      )}
      {reading && post && hidden && !ended && (
        <div className="player-center">
          <p className="player-note" data-testid="reader-hidden">
            <EyeOff aria-hidden />
            {displayUrl(post, "sample") === null ? "e621 doesn't show this page here" : "This page is on your blacklist"}
          </p>
        </div>
      )}
      {!post && (
        <div className="player-center">
          {missing ? <p className="player-note">No post #{id} on e621</p> : <Loader step={null} label="Finding the post" detail={`#${id}`} />}
        </div>
      )}
      {burst > 0 && <Heart key={burst} className="heart-burst player-burst" aria-hidden />}
      {ended && comic && (
        <div className="comic-end" data-testid="comic-end" onPointerDown={endDown} onPointerUp={endUp}>
          <Goo mood="wave" size={112} />
          <b>The end</b>
          <small>
            {comic.name} · {comic.total} {comic.total === 1 ? "page" : "pages"}
          </small>
          <div className="comic-end-acts">
            <button type="button" className="glass-btn" onClick={again} data-testid="comic-again">
              <RefreshCw aria-hidden />
              Read again
            </button>
            <button type="button" className="glass-btn" onClick={close} data-testid="comic-end-back">
              {backTo}
            </button>
          </div>
        </div>
      )}

      <div className="player-chrome" aria-hidden={!(showControls || ended) || undefined} data-testid="controls" data-visible={showControls || ended}>
        <div className="player-top">
          <button type="button" className="art-circle" aria-label="Close" onClick={close} data-testid="viewer-close">
            <X aria-hidden />
          </button>
          {comic && (
            <span className="count-pill" data-testid="viewer-count">
              {comic.page} / {comic.total}
            </span>
          )}
        </div>
        {comic && !reading && (
          <>
            <button type="button" className="art-circle viewer-turn" data-side="l" aria-label="Previous page" disabled={near(-1) === null} onClick={() => turn(-1)} data-testid="viewer-prev">
              <ChevronLeft aria-hidden />
            </button>
            <button type="button" className="art-circle viewer-turn" data-side="r" aria-label="Next page" disabled={near(1) === null} onClick={() => turn(1)} data-testid="viewer-next">
              <ChevronRight aria-hidden />
            </button>
          </>
        )}
        {post && reading && !ended && (
          <div className="player-bottom" onMouseEnter={() => (hovering.current = true)} onMouseLeave={() => (hovering.current = false)}>
            {comic && <ComicBar comic={comic} up />}
            <div className="player-who">
              <Avatar seed={by ?? `post:${post.id}`} className="post-avatar" />
              <span className="player-idn">
                <span className="post-name">{by?.replaceAll("_", " ") ?? "unknown artist"}</span>
                <span className="post-time">
                  {ago(post.created_at, now)} · #{post.id}
                </span>
              </span>
              {by && <FollowPill key={by} name={by} art />}
            </div>
            <div className="player-rail">
              <button
                type="button"
                className="art-circle"
                aria-label={`Favorite, ${compact(post.stats.fav_count)}`}
                aria-pressed={faved}
                data-on={faved || undefined}
                onClick={toggleFav}
                data-testid="favorite-button"
              >
                <Heart aria-hidden />
              </button>
              <button
                type="button"
                className="art-circle"
                aria-label="Post info"
                aria-expanded={sheet === "player-info"}
                onClick={() => (sheet === "player-info" ? void nav.back() : nav.openSheet("player-info"))}
                data-testid="info-button"
              >
                <Info aria-hidden />
              </button>
              <button type="button" className="art-circle" aria-label="Slideshow settings" onClick={() => nav.openSheet("player-settings")} data-testid="quick-settings-button">
                <SlidersHorizontal aria-hidden />
              </button>
              <button type="button" className="art-circle" aria-label="Share" onClick={shareIt} data-testid="share-button">
                <Share aria-hidden />
              </button>
            </div>
            <div className="player-transport">
              <button type="button" className="art-circle" aria-label="Previous" onClick={() => turn(-1)} disabled={near(-1) === null} data-testid="reader-prev">
                <SkipBack aria-hidden className="solid" />
              </button>
              <button type="button" className="player-play" aria-label={reading.paused ? "Play" : "Pause"} onClick={() => play(reading.paused)} data-testid="pause-button">
                {reading.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              </button>
              <button type="button" className="art-circle" aria-label="Next" onClick={() => turn(1)} disabled={!list} data-testid="reader-next">
                <SkipForward aria-hidden className="solid" />
              </button>
            </div>
            <div className="player-bar">
              <div className="player-progress">
                {loaded && !hidden && (
                  <div
                    key={round}
                    ref={bar}
                    className="progress-bar"
                    data-testid="progress"
                    style={{ animationDuration: `${pageMs}ms`, animationPlayState: running ? "running" : "paused" }}
                  />
                )}
              </div>
              <TimeLeft bar={bar} />
            </div>
          </div>
        )}
        {post && !reading && (
          <div className="player-bottom">
            {comic && <ComicBar comic={comic} />}
            <button
              type="button"
              className="player-who viewer-who"
              onClick={() => by && nav.push({ screen: { kind: "artist", name: by }, play: null })}
              disabled={!by}
              data-testid="viewer-artist"
            >
              <Avatar seed={by ?? `post:${post.id}`} className="post-avatar" />
              <span className="player-idn">
                <span className="post-name">
                  <span className="viewer-name">{by?.replaceAll("_", " ") ?? "unknown artist"}</span>
                  {by && <ChevronRight aria-hidden className="viewer-chev" />}
                </span>
                <span className="post-time">
                  {ago(post.created_at, now)} · #{post.id}
                </span>
              </span>
            </button>
            <div className="player-rail">
              <button
                type="button"
                className="art-circle"
                aria-label={`Favorite, ${compact(post.stats.fav_count)}`}
                aria-pressed={faved}
                data-on={faved || undefined}
                onClick={toggleFav}
                data-testid="favorite-button"
              >
                <Heart aria-hidden />
              </button>
              <button
                type="button"
                className="art-circle"
                aria-label="Post info"
                aria-expanded={sheet === "player-info"}
                onClick={() => (sheet === "player-info" ? void nav.back() : nav.openSheet("player-info"))}
                data-testid="info-button"
              >
                <Info aria-hidden />
              </button>
              <button type="button" className="art-circle" aria-label="Share" onClick={() => void sharePost(post)} data-testid="share-button">
                <Share aria-hidden />
              </button>
              <button
                type="button"
                className="art-circle"
                aria-label="Save"
                aria-busy={saving || undefined}
                onClick={() => void save()}
                data-testid="save-button"
              >
                <Download aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>

      {sheet === "player-info" && post && <PlayerInfoSheet post={post} base={base} />}
      {reading && (sheet === "player-settings" || sheet === "player-quality" || sheet === "player-comic-time") && (
        <QuickSettingsSheet base={base} playback={playback} picking={sheet === "player-quality"} pickingComic={sheet === "player-comic-time"} />
      )}
      {reading && sheet === "player-quality" && <QualitySheet base={base} playback={playback} />}
      {reading && sheet === "player-comic-time" && <ComicTimeSheet playback={playback} />}
      {sheet === "comic-pages" && post && comic && (
        <PagesSheet
          comic={comic}
          post={post}
          onPage={(pid) =>
            void nav.back().then(() => {
              reading?.setEnded(false);
              if (pid !== post.id) goTo(pid);
            })
          }
        />
      )}
    </div>
  );
}
