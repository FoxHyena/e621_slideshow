"use client";

/**
 * The picture viewer (`?view=<postId>`, DESIGN.md "A post on its own"): one picture full screen, to
 * zoom and save, without the slideshow. The player's room and glass: ✕, the artist's row, and
 * Favorite, Post info, Share and Save. One tap shows or hides the buttons; a double tap zooms (it
 * does not favorite here); pinch zooms 1 to 5 times, a drag moves a zoomed picture, and a drag down
 * on an unzoomed one closes. On a computer the wheel zooms and Post info stands beside the picture.
 */
import { ChevronRight, CircleAlert, Download, Heart, Info, Share, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { turnMark } from "@/feed/motion";
import { searchPosts } from "@/lib/e621/client";
import { mediaKind, type Post } from "@/lib/e621/types";
import { ago, artists, compact } from "@/lib/feed/format";
import { displayUrl } from "@/lib/slideshow/media";
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
import { PlayerInfoSheet } from "./sheets";

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

interface View {
  s: number;
  x: number;
  y: number;
}
const FIT: View = { s: 1, x: 0, y: 0 };

/** The post: from the screen's feed when it is there, else asked of e621 (a reload, a link). */
function useViewedPost(base: Entry, id: string): { post: Post | null; missing: boolean } {
  const reg = getFeeds();
  useStore(reg.generation, (g) => g);
  const feed = reg.bound(base.key);
  useStore(feed?.version ?? reg.generation, (v) => v);
  const inFeed = feed?.queue.posts.find((p) => String(p.id) === id) ?? null;
  const creds = useStore(getSession().store, (s) => s.creds);
  const [fetched, setFetched] = useState<{ id: string; post: Post | null } | null>(null);
  useEffect(() => {
    if (inFeed || fetched?.id === id) return;
    let live = true;
    searchPosts(`id:${id}`, 1, 1, creds)
      .then((ps) => live && setFetched({ id, post: ps[0] ?? null }))
      .catch(() => live && setFetched({ id, post: null }));
    return () => {
      live = false;
    };
  }, [id, inFeed, fetched?.id, creds]);
  const post = inFeed ?? (fetched?.id === id ? fetched.post : null);
  return { post, missing: !inFeed && fetched?.id === id && fetched.post === null };
}

export function Viewer({ base, top }: { base: Entry; top: Entry }) {
  const nav = getNav();
  const id = top.route.view ?? "";
  const sheet = top.sheet;
  const { post, missing } = useViewedPost(base, id);
  const [now] = useState(() => Date.now());
  const [controls, setControls] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** the full file, once the picture is zoomed past fit and it has loaded */
  const [sharp, setSharp] = useState(false);

  const close = () => void nav.back();

  // Videos don't open the viewer in this pass (DESIGN.md): a video tile, or a link to one, opens the
  // player paused in this entry's place.
  const video = post !== null && mediaKind(post) === "video";
  useEffect(() => {
    if (!video) return;
    openPaused(true);
    nav.replace({ screen: top.route.screen, play: id });
  }, [video]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing lands the feed on this post, as the player's close does.
  useLayoutEffect(
    () => () => {
      const now = getNav().current().route;
      if (now.view || now.play) return;
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
  // ---- hands -------------------------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: "one"; x: number; y: number; v: View; moved: boolean; axis: "down" | "pan" | "none" | null; t: number }
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
    g.axis ??= g.v.s > 1.01 ? "pan" : e.pointerType !== "mouse" && dy > 0 && Math.abs(dy) > Math.abs(dx) ? "down" : "none";
    if (g.axis === "pan") paint(clamp({ s: g.v.s, x: g.v.x + dx, y: g.v.y + dy }));
    else if (g.axis === "down") paint(FIT, false, Math.max(0, dy));
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
    if (g.moved) return;
    // A tap shows or hides the buttons; a double tap zooms to 2.5 at the point, or back to fit.
    const t = performance.now();
    if (t - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (view.current.s > 1.01) paint(FIT, true);
      else zoomAt(TAP_ZOOM, ...fromCentre(e.clientX, e.clientY), true);
      return;
    }
    lastTap.current = t;
    tapTimer.current = setTimeout(() => setControls((c) => !c), DOUBLE_TAP_MS);
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (gesture.current?.kind === "one" && gesture.current.axis === "down") paint(FIT, true);
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
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const src = post ? displayUrl(post, "sample") : null;
  const full = post?.files.original.url ?? null;
  const showControls = controls && !zoomed;

  return (
    <div
      className="player viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Picture"
      tabIndex={-1}
      data-controls={showControls || undefined}
      data-info={sheet === "player-info" || undefined}
      data-testid="viewer"
      data-post-id={post?.id}
      data-zoomed={zoomed || undefined}
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
        {post && src && mediaKind(post) !== "video" && (
          <div ref={pic} className="viewer-pic" data-testid="viewer-pic">
            {/* eslint-disable @next/next/no-img-element -- e621's CDN, shown as is */}
            <img ref={img} src={src} alt="" draggable={false} onLoad={() => setLoaded(true)} />
            {sharp && full && full !== src && <img src={full} alt="" draggable={false} className="viewer-sharp" onLoad={(e) => e.currentTarget.setAttribute("data-in", "")} />}
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        )}
      </div>
      {post && !loaded && (
        <div className="player-center">
          <Loader step={{ phase: "media" }} size="md" bare delayMs={600} label="Loading image" icons={[ImageIcon]} />
        </div>
      )}
      {!post && (
        <div className="player-center">
          {missing ? <p className="player-note">No post #{id} on e621</p> : <Loader step={null} label="Finding the post" detail={`#${id}`} />}
        </div>
      )}

      <div className="player-chrome" aria-hidden={!showControls || undefined} data-testid="controls" data-visible={showControls}>
        <div className="player-top">
          <button type="button" className="art-circle" aria-label="Close" onClick={close} data-testid="viewer-close">
            <X aria-hidden />
          </button>
        </div>
        {post && (
          <div className="player-bottom">
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
    </div>
  );
}
