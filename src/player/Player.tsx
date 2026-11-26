"use client";

/**
 * The player over a feed screen (`?play=<postId>`, UX §5 "Player"). It plays the screen's own
 * queue (the feed registry's, by history entry), so paging here grows the feed too. All five
 * stages, the timer, preloading and stall skip are today's, moved from the legacy App.
 */
import { ChevronLeft, ChevronRight, Heart, Info, Maximize, Minimize, Pause, Play, Settings2, Share, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { postPageUrl } from "@/lib/e621/client";
import { mediaKind, type Post } from "@/lib/e621/types";
import { decodeResults } from "@/lib/feed/filters";
import { ago, artists, compact } from "@/lib/feed/format";
import { FollowPill } from "@/feed/FollowPill";
import { DEFAULT_PLAYBACK, type PlaybackSettings } from "@/lib/settings";
import { displayUrl, Preloader } from "@/lib/slideshow/media";
import Avatar from "@/components/Avatar";
import { ImageIcon, Loader, VideoIcon } from "@/components/Loader";
import Stage from "@/components/Stage";
import { getNav, type Entry } from "@/nav/history";
import { revealY, setLockedY } from "@/nav/scroll";
import { getFavs, favedOf } from "@/state/favs";
import { getFeeds } from "@/state/feeds";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { copyText, sharePost } from "@/screens/actions";
import { takePaused } from "./intent";
import { PlayerInfoSheet, QuickSettingsSheet } from "./sheets";
import { shareUrlFor } from "./share";

const HIDE_CONTROLS_MS = 2500;
/** A second tap this soon is a double tap (toggles nothing, favorites). */
const DOUBLE_TAP_MS = 250;
const SWIPE_MIN_PX = 50;
/** Swipes starting this close to the left edge belong to Back. */
const EDGE_PX = 24;
const STALL_MS = 30_000;
const PREVIOUS_KEPT = 2;
const TRAIL_MAX = 8;
const UPCOMING_SHOWN = 12;
/** Pages to look through for a reloaded `?play=` id before giving up on it. */
const FIND_PAGES = 5;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** A link's playback applies for this visit (videos start muted: autoplay needs it). */
/** Link screens already told "videos start muted", so a reopen doesn't say it again. */
const mutedNoted = new Set<string>();

function usePlayback(base: Entry): PlaybackSettings {
  const saved = useStore(getPrefs().store, (p) => p.playback);
  const screen = base.route.screen;
  useEffect(() => {
    if (screen.kind !== "results" || mutedNoted.has(base.key)) return;
    const link = decodeResults(screen.params).link;
    if (link?.kind !== "share" || link.playback.videoMuted) return;
    mutedNoted.add(base.key);
    toast("Videos start muted: unmute in settings");
  }, [base.key, screen]);
  return useMemo(() => {
    if (screen.kind !== "results") return saved;
    const link = decodeResults(screen.params).link;
    if (link?.kind !== "share") return saved;
    return { ...DEFAULT_PLAYBACK, ...link.playback, preloadCount: saved.preloadCount, videoMuted: true };
  }, [saved, screen]);
}

export function Player({ base, top }: { base: Entry; top: Entry }) {
  const nav = getNav();
  const reg = getFeeds();
  useStore(reg.generation, (g) => g);
  useStore(getSession().store, (s) => s.ready);
  const feed = reg.bound(base.key);
  useStore(feed?.version ?? reg.generation, (v) => v);
  const queue = feed?.queue ?? null;
  const posts = queue?.posts ?? [];
  const playback = usePlayback(base);
  const sheet = top.sheet;

  const wanted = top.route.play ?? "first";
  const found = wanted === "first" ? (posts.length ? 0 : -1) : posts.findIndex((p) => String(p.id) === wanted);
  const index = Math.max(0, found);
  const current: Post | undefined = found >= 0 ? posts[index] : undefined;

  const [paused, setPaused] = useState(takePaused);
  const [trail, setTrail] = useState<Post[]>([]);
  const [ready, setReady] = useState<{ id: number; durationSec?: number } | null>(null);
  const [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [now] = useState(() => Date.now());

  /** Show this post: its id goes in the URL (replacing the entry), so a reload comes back to it. */
  const show = (i: number) => {
    const p = posts[i];
    if (!p) return;
    if (current && trail[0]?.id === p.id) setTrail(trail.slice(1));
    else if (current) setTrail([current, ...trail.filter((t) => t.id !== current.id)].slice(0, TRAIL_MAX));
    setReady(null);
    nav.replace({ screen: top.route.screen, play: String(p.id) });
  };

  // `first` (a link) or an id from a reload: settle on a real post id, loading pages to find it.
  const looked = useRef(0);
  /** the last post we were on, and where: if it leaves the queue (blacklisted, failed), move on from there */
  const placed = useRef<{ id: string; index: number } | null>(null);
  useEffect(() => {
    if (!queue) return;
    if (wanted === "first") {
      if (posts.length) nav.replace({ screen: top.route.screen, play: String(posts[0].id) });
      else if (!queue.exhausted && !queue.error) void queue.ensure(0);
      return;
    }
    if (found >= 0) {
      placed.current = { id: wanted, index };
      return;
    }
    if (placed.current?.id === wanted) {
      // We were showing it and it's gone: the post that took its place, no searching.
      if (posts.length) nav.replace({ screen: top.route.screen, play: String(posts[Math.min(placed.current.index, posts.length - 1)].id) });
      else if (!queue.loading && !queue.exhausted && !queue.error) void queue.ensure(0);
      return;
    }
    if (!queue.exhausted && !queue.error && looked.current < FIND_PAGES) {
      if (queue.loading) return;
      looked.current++;
      void queue.ensure(posts.length - 1);
      return;
    }
    if (posts.length) {
      toast("Couldn't restore your place");
      nav.replace({ screen: top.route.screen, play: String(posts[0].id) });
    }
  });

  const next = async () => {
    if (!queue) return;
    const target = index + 1;
    if (target < queue.posts.length) return show(target);
    await queue.ensure(index);
    if (target < queue.posts.length) return show(target);
    if (queue.exhausted && queue.posts.length > 0) {
      if (playback.loop) show(0);
      else {
        setPaused(true);
        toast("End of results");
      }
    }
  };
  const prev = () => {
    if (index > 0) show(index - 1);
  };

  // Keep the buffer topped up as we move.
  useEffect(() => {
    if (current) void queue?.ensure(index);
  }, [queue, index, current]);

  // ---- preloading -----------------------------------------------------------
  const [preloader] = useState(() => new Preloader());
  useEffect(() => {
    if (!queue) return;
    const entries: { url: string; video: boolean }[] = [];
    let videos = 0;
    for (const p of queue.posts.slice(index + 1, index + 1 + playback.preloadCount)) {
      const url = displayUrl(p, playback.quality);
      if (!url) continue;
      if (mediaKind(p) === "video") {
        if (videos++ === 0) entries.push({ url, video: true });
        else if (p.files.sample.jpg) entries.push({ url: p.files.sample.jpg, video: false });
      } else entries.push({ url, video: false });
    }
    for (const p of queue.posts.slice(Math.max(0, index - PREVIOUS_KEPT), index)) {
      const url = mediaKind(p) === "video" ? p.files.sample.jpg : displayUrl(p, playback.quality);
      if (url) entries.push({ url, video: false });
    }
    preloader.sync(entries);
  }, [queue, index, posts.length, playback.preloadCount, playback.quality, preloader]);
  useEffect(() => () => preloader.clear(), [preloader]);

  // ---- slide timer ----------------------------------------------------------
  const isReady = !!current && ready?.id === current.id;
  const durationMs = useMemo(() => {
    const base = playback.intervalSec * 1000;
    if (!current || mediaKind(current) !== "video") return base;
    const len = ready?.durationSec ?? current.files.meta.duration ?? 0;
    const cap = playback.videoMaxSec > 0 ? playback.videoMaxSec : Infinity;
    return Math.max(base, Math.min(len, cap) * 1000);
  }, [current, ready, playback.intervalSec, playback.videoMaxSec]);

  // Opening a sheet pauses; closing it resumes.
  const running = isReady && !paused && sheet === null;
  const timer = useRef<{ key: string; remaining: number }>({ key: "", remaining: 0 });
  const timerKey = `${current?.id}:${durationMs}`;
  const onTimerDone = useEffectEvent(() => void next());
  useEffect(() => {
    if (!running) return;
    if (timer.current.key !== timerKey) timer.current = { key: timerKey, remaining: durationMs };
    const started = Date.now();
    const t = setTimeout(onTimerDone, timer.current.remaining);
    return () => {
      clearTimeout(t);
      timer.current.remaining = Math.max(0, timer.current.remaining - (Date.now() - started));
    };
  }, [running, timerKey, durationMs]);

  // A post that never loads must not freeze the show.
  const onStall = useEffectEvent((id: number) => {
    toast(`Post #${id} didn't load, skipped`);
    void next();
  });
  const stallWatch = !!current && !isReady && !paused && sheet === null;
  useEffect(() => {
    if (!stallWatch || !current) return;
    const id = current.id;
    const t = setTimeout(() => onStall(id), STALL_MS);
    return () => clearTimeout(t);
  }, [stallWatch, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- closing lands the feed on the last post shown --------------------------
  const shownId = useRef<number | null>(null);
  useLayoutEffect(() => {
    shownId.current = current?.id ?? null;
  });
  useLayoutEffect(
    () => () => {
      // Runs before the shell unlocks the page (removals clean up first), so it lands here.
      // Still on a player entry: not a close (Strict Mode's test unmount in development).
      if (getNav().current().route.play !== null) return;
      const id = shownId.current;
      const y = id === null ? null : revealY(base.key, id);
      if (y !== null) setLockedY(y);
    },
    [base.key],
  );
  const close = () => void nav.back();

  // ---- controls -------------------------------------------------------------
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hovering = useRef(false);
  const poke = () => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!hovering.current) setControls(false);
    }, HIDE_CONTROLS_MS);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  // Controls stay while paused.
  const showControls = controls || paused || !current;

  // ---- favorites ------------------------------------------------------------
  const favs = getFavs();
  const faved = useStore(favs.store, (s) => (current ? favedOf(s, current) : false));
  const toggleFav = () => current && favs.toggle(current);

  // ---- taps and swipes --------------------------------------------------------
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ x: number; y: number; id: number; axis: "x" | "y" | null } | null>(null);
  const swipeable = !(playback.style === "classic" && playback.fit === "original");
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = null;
    if ((e.target as Element).closest("button, a, input, [role=dialog]")) return;
    if (e.pointerType === "touch" && e.clientX < EDGE_PX) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (e.pointerType === "touch" && swipeable && Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_MIN_PX) {
      if (Math.abs(dx) > 1.5 * Math.abs(dy)) {
        if (dx < 0) void next();
        else prev();
      } else if (dy > 0 && Math.abs(dy) > 1.5 * Math.abs(dx)) close();
      return;
    }
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
    // A tap toggles the controls; a double tap favorites (never un-favorites) and never seeks.
    const t = performance.now();
    if (t - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      setBurst((b) => b + 1);
      if (current && !favedOf(favs.store.get(), current)) favs.toggle(current);
      return;
    }
    lastTap.current = t;
    tapTimer.current = setTimeout(() => {
      if (e.pointerType === "mouse") poke();
      else if (showControls && !paused) setControls(false);
      else poke();
    }, DOUBLE_TAP_MS);
  };

  // ---- fullscreen -----------------------------------------------------------
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => toast("Fullscreen isn't allowed here"));
  };
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const share = () => {
    const url = shareUrlFor(base);
    if (url) void copyText(url.href, url.withSignIn ? "Share link copied, with your sign-in" : "Share link copied");
    else if (current) void sharePost(current);
  };

  // ---- keys (desktop, UX §8) ------------------------------------------------
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target) || sheet) return;
    switch (e.key) {
      case "ArrowRight":
        void next();
        break;
      case "ArrowLeft":
        prev();
        break;
      case " ":
        setPaused((p) => !p);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "i":
      case "I":
        nav.openSheet("player-info");
        break;
      case "l":
      case "L":
        toggleFav();
        break;
      case "c":
      case "C":
        share();
        break;
      case "o":
      case "O":
        if (current) window.open(postPageUrl(current.id), "_blank", "noopener");
        break;
      case "g":
      case "G":
      case "t":
      case "T":
        close();
        break;
      case "s":
      case "S":
        nav.openSheet("player-settings");
        break;
      case "Escape":
        close();
        break;
      default:
        return;
    }
    e.preventDefault();
    poke();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Focus the player when it opens, so keys and screen readers land here.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  const by = current ? artists(current)[0] : undefined;
  const count = `${index + 1} / ${posts.length}${queue && !queue.exhausted ? "+" : ""}`;

  return (
    <div
      ref={box}
      className="player"
      role="dialog"
      aria-modal="true"
      aria-label="Player"
      tabIndex={-1}
      data-controls={showControls || undefined}
      onMouseMove={poke}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      data-testid="player"
      data-post-id={current?.id}
    >
      {current && (
        <Stage
          post={current}
          trail={trail}
          upcoming={posts.slice(index + 1, index + 1 + UPCOMING_SHOWN)}
          playback={playback}
          currentReady={isReady}
          durationMs={durationMs}
          running={running}
          onReady={(id, durationSec) => setReady({ id, durationSec })}
          onError={(id) => queue?.remove(id)}
        />
      )}
      {current && !isReady && (
        <div className="player-center" data-testid="slide-loading">
          <Loader
            step={{ phase: "media" }}
            size="md"
            bare
            delayMs={600}
            label={mediaKind(current) === "video" ? "Loading video" : "Loading image"}
            icons={[mediaKind(current) === "video" ? VideoIcon : ImageIcon]}
          />
        </div>
      )}
      {!current && (
        <div className="player-center">
          {queue?.error ? (
            <p className="player-note">e621: {queue.error}</p>
          ) : queue?.exhausted && posts.length === 0 ? (
            <p className="player-note">Nothing to play here.</p>
          ) : (
            <Loader step={null} label="Searching e621" detail={queue?.query || "all posts"} testId="search-loading" />
          )}
        </div>
      )}
      {burst > 0 && <Heart key={burst} className="heart-burst player-burst" aria-hidden />}

      <div className="player-chrome" aria-hidden={!showControls || undefined} data-testid="controls" data-visible={showControls}>
        <div className="player-top">
          <button type="button" className="art-circle" aria-label="Close" onClick={close} data-testid="player-close">
            <X aria-hidden />
          </button>
          <span className="count-pill" data-testid="counter">
            {count}
          </span>
          <button type="button" className="art-circle player-desktop" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
          </button>
        </div>
        <div
          className="player-bottom"
          onMouseEnter={() => (hovering.current = true)}
          onMouseLeave={() => (hovering.current = false)}
        >
          {current && (
            <div className="player-who">
              <Avatar seed={by ?? `post:${current.id}`} className="post-avatar" />
              <span className="post-name">{by?.replaceAll("_", " ") ?? "unknown artist"}</span>
              <span className="post-time">{ago(current.created_at, now)}</span>
              {by && <FollowPill key={by} name={by} art />}
            </div>
          )}
          <div className="player-rail">
            <button
              type="button"
              className="art-circle"
              aria-label={`Favorite, ${current ? compact(current.stats.fav_count) : 0}`}
              aria-pressed={faved}
              data-on={faved || undefined}
              onClick={toggleFav}
              disabled={!current}
              data-testid="favorite-button"
            >
              <Heart aria-hidden />
            </button>
            <button type="button" className="art-circle" aria-label="Post info" onClick={() => nav.openSheet("player-info")} disabled={!current} data-testid="info-button">
              <Info aria-hidden />
            </button>
            <button type="button" className="art-circle" aria-label="Slideshow settings" onClick={() => nav.openSheet("player-settings")} data-testid="quick-settings-button">
              <Settings2 aria-hidden />
            </button>
            <button type="button" className="art-circle" aria-label="Share" onClick={share} data-testid="share-button">
              <Share aria-hidden />
            </button>
          </div>
          <div className="player-transport">
            <button type="button" className="art-circle" aria-label="Previous" onClick={prev} disabled={index === 0}>
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              className="player-play"
              aria-label={paused ? "Play" : "Pause"}
              onClick={() => setPaused((p) => !p)}
              data-testid="pause-button"
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            </button>
            <button type="button" className="art-circle" aria-label="Next" onClick={() => void next()} data-testid="next-button">
              <ChevronRight aria-hidden />
            </button>
          </div>
          <div className="player-progress">
            {current && isReady && (
              <div
                key={timerKey}
                className="progress-bar"
                data-testid="progress"
                style={{ animationDuration: `${durationMs}ms`, animationPlayState: running ? "running" : "paused" }}
              />
            )}
          </div>
        </div>
      </div>

      {sheet === "player-settings" && <QuickSettingsSheet base={base} />}
      {sheet === "player-info" && current && <PlayerInfoSheet post={current} base={base} />}
    </div>
  );
}
