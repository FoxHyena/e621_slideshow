"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  LayoutGrid,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
} from "lucide-react";
import {
  addFavorite,
  getCurrentUser,
  postPageUrl,
  removeFavorite,
  searchPosts,
  type Credentials,
} from "@/lib/e621/client";
import { allTags, mediaKind, type CurrentUser, type Post } from "@/lib/e621/types";
import { DEFAULT_BLACKLIST, mergeBlacklists, syncAccountBlacklist } from "@/lib/query/blacklist";
import {
  buildQuery,
  buildRecommendedQuery,
  DEFAULT_TAG_LIMIT,
  type BuiltQuery,
} from "@/lib/query/build";
import { RecommendedQueue, REC_PAGE_BUDGET } from "@/lib/recommend/stream";
import { searchPlan, topTags } from "@/lib/recommend/weights";
import type { PlaybackSettings, SearchSettings } from "@/lib/settings";
import { displayUrl, Preloader } from "@/lib/slideshow/media";
import { PostQueue, type SlideQueue } from "@/lib/slideshow/queue";
import { pushHistory, storage, type HistoryEntry, type SavedSearch } from "@/lib/storage";
import Gallery from "./Gallery";
import InfoOverlay from "./InfoOverlay";
import SettingsPanel from "./SettingsPanel";
import Stage from "./Stage";
import { useRecommendations } from "./useRecommendations";

const HIDE_CONTROLS_MS = 2500;
/** A touch drag at least this far sideways changes the slide. */
const SWIPE_MIN_PX = 50;
/** Skip a post whose media hasn't become displayable in this long. */
const STALL_MS = 30_000;
const PREVIOUS_KEPT = 2;

/** Identity of a queue: anything that changes which posts we'd show. */
function queueKey(
  built: BuiltQuery,
  media: SearchSettings["media"],
  creds: Credentials | null,
  /** Recommended only: the ranking inputs, which the query string doesn't capture */
  ranking: string | null,
) {
  return JSON.stringify([built.query, built.rules.map((r) => r.line), media, creds?.username ?? null, ranking]);
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

interface Active {
  queue: SlideQueue;
  key: string;
}

export default function App() {
  // ---- persisted settings -------------------------------------------------
  const [search, setSearchState] = useState<SearchSettings>(storage.loadSearch);
  const [playback, setPlaybackState] = useState<PlaybackSettings>(storage.loadPlayback);
  const [saved, setSaved] = useState<SavedSearch[]>(storage.loadSaved);
  const [history, setHistory] = useState<HistoryEntry[]>(storage.loadHistory);
  const [creds, setCreds] = useState<Credentials | null>(storage.loadCredentials);
  const [remember, setRemember] = useState(() => storage.loadCredentials() !== null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const setSearch = (s: SearchSettings) => {
    setSearchState(s);
    storage.saveSearch(s);
  };
  const setPlayback = (p: PlaybackSettings) => {
    setPlaybackState(p);
    storage.savePlayback(p);
  };

  const tagLimit = user?.tag_query_limit ?? DEFAULT_TAG_LIMIT;

  // ---- slideshow state ----------------------------------------------------
  const [active, setActive] = useState<Active | null>(null);
  const [, setVersion] = useState(0);
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<Post | null>(null);
  const [paused, setPaused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [ready, setReady] = useState<{ id: number; durationSec?: number } | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const queue = active?.queue ?? null;
  const posts = queue?.posts ?? [];
  const current: Post | undefined = posts[Math.min(index, posts.length - 1)];
  const currentIndex = current ? Math.min(index, posts.length - 1) : 0;
  const match = current ? queue?.matchFor?.(current.id) : undefined;

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ---- recommendations ----------------------------------------------------
  const rec = useRecommendations(creds, user, showToast);
  /** every weighted profile tag, strongest first, for the settings panel */
  const recTags = useMemo(() => topTags(rec.weights, rec.weights.size), [rec.weights]);
  /** the tags that get their own candidate search: pins, then the highest weights */
  const recCandidates = useMemo(
    () => (rec.profile ? searchPlan(rec.weights, rec.overrides, search.breadth) : []),
    [rec.weights, rec.profile, rec.overrides, search.breadth],
  );
  const isRec = (s: SearchSettings) => s.source === "recommended";
  const recTagNames = useMemo(() => recCandidates.map((c) => c.tag), [recCandidates]);
  const buildFor = (s: SearchSettings): BuiltQuery =>
    isRec(s) ? buildRecommendedQuery(s, recTagNames, tagLimit) : buildQuery(s, tagLimit);
  const keyFor = (s: SearchSettings, b: BuiltQuery) =>
    queueKey(b, s.media, creds, isRec(s) ? rec.signature : null);
  const built = useMemo(
    () => (isRec(search) ? buildRecommendedQuery(search, recTagNames, tagLimit) : buildQuery(search, tagLimit)),
    [search, recTagNames, tagLimit],
  );

  /** Replace defaults/old account lines with the account's current blacklist. */
  const syncBlacklist = (u: CurrentUser) => {
    const account = u.blacklisted_tags ?? "";
    setSearchState((prev) => {
      const next = { ...prev, blacklist: syncAccountBlacklist(prev.blacklist, storage.loadAccountBlacklist(), account) };
      storage.saveSearch(next);
      return next;
    });
    storage.saveAccountBlacklist(account);
    return account.split("\n").filter((l) => l.trim()).length;
  };

  // ---- credentials: re-verify a remembered key on load --------------------
  useEffect(() => {
    if (!creds || user) return;
    let cancelled = false;
    getCurrentUser(creds)
      .then((u) => {
        if (cancelled || u.id === null) return;
        setUser(u);
        syncBlacklist(u);
      })
      .catch((e: Error) => {
        if (!cancelled) showToast(`e621 sign-in failed: ${e.message}`);
      });
    return () => {
      cancelled = true;
    };
    // only on mount / when creds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creds]);

  const signIn = async (c: Credentials, keep: boolean) => {
    const u = await getCurrentUser(c);
    if (u.id === null) throw new Error("e621 didn't accept that username and API key");
    setCreds(c);
    setUser(u);
    syncBlacklist(u);
    setRemember(keep);
    storage.saveCredentials(keep ? c : null);
  };

  const signOut = () => {
    setCreds(null);
    setUser(null);
    setRemember(false);
    storage.saveCredentials(null);
  };

  // ---- starting / applying ------------------------------------------------
  const startQueue = (s: SearchSettings) => {
    const b = buildFor(s);
    const key = keyFor(s, b);
    if (active && active.key === key) return false;
    const onChange = () => setVersion((v) => v + 1);
    const ctx = { username: user?.name };
    let q: SlideQueue;
    if (isRec(s)) {
      q = new RecommendedQueue(
        [{ tag: "candidates", query: b.query, pages: REC_PAGE_BUDGET }],
        (query, page, limit) => searchPosts(query, page, limit, creds),
        rec.weights,
        { media: s.media, rules: b.rules, ctx },
        new Set(rec.overrides.muted),
        onChange,
      );
    } else {
      q = new PostQueue(b, s.media, (tags, page, limit) => searchPosts(tags, page, limit, creds), ctx, onChange);
    }
    setActive({ queue: q, key });
    setIndex(0);
    setPrevious(null);
    setReady(null);
    void q.ensure(0);
    if (!isRec(s)) {
      const h = pushHistory(history, s.tags, Date.now());
      setHistory(h);
      storage.saveHistory(h);
    }
    return true;
  };

  /** Why Recommended can't run yet, or null if it can. */
  const recBlocker = (): string | null => {
    if (!user || !creds) return "Sign in to get recommendations from your favorites";
    if (recCandidates.length > 0) return null;
    if (rec.syncing) return rec.progress ?? "Still reading your favorites…";
    if (rec.error) return `Couldn't read favorites: ${rec.error}`;
    return "Not enough favorites yet: a tag needs to be on at least 3 of them";
  };

  /** Close the panel; restart only if the query changed. */
  const apply = (resume: boolean, s: SearchSettings = search) => {
    const blocker = isRec(s) ? recBlocker() : null;
    if (blocker) {
      showToast(blocker);
      return false;
    }
    if (buildFor(s).overLimit) {
      showToast(`Too many tags: e621 allows ${tagLimit}`);
      return false;
    }
    startQueue(s);
    setPanelOpen(false);
    // Focus left inside the (now inert) panel would swallow keyboard shortcuts.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (resume) {
      setPaused(false);
      setGalleryOpen(false);
    }
    return true;
  };

  /** Show the current search as a grid instead of starting the show. */
  const openPreview = () => {
    if (apply(false)) setGalleryOpen(true);
  };

  const pendingKey = keyFor(search, built);
  const playLabel = !active ? "Play" : active.key !== pendingKey ? "Play new search" : "Resume";

  // ---- navigation ---------------------------------------------------------
  const goTo = (i: number) => {
    if (current) setPrevious(current);
    setIndex(i);
    setReady(null);
  };

  const next = async () => {
    if (!queue) return;
    const target = currentIndex + 1;
    if (target < queue.posts.length) return goTo(target);
    await queue.ensure(currentIndex);
    if (target < queue.posts.length) return goTo(target);
    if (queue.exhausted && queue.posts.length > 0) {
      if (playback.loop) goTo(0);
      else {
        setPaused(true);
        showToast("End of results");
      }
    }
  };

  /** Start the show at a post picked from the gallery. */
  const pick = (i: number) => {
    if (i !== currentIndex) goTo(i);
    setGalleryOpen(false);
    setPaused(false);
  };

  const needMore = useCallback(() => {
    if (queue) void queue.ensure(queue.posts.length - 1);
  }, [queue]);

  const prev = () => {
    if (!queue || currentIndex === 0) return;
    goTo(currentIndex - 1);
  };

  // Keep the buffer topped up as we move.
  useEffect(() => {
    void queue?.ensure(currentIndex);
  }, [queue, currentIndex]);

  // A replaced (or unmounted) show stops fetching, so it can't eat the rate limit.
  useEffect(() => () => queue?.dispose?.(), [queue]);

  // ---- preloading ---------------------------------------------------------
  const [preloader] = useState(() => new Preloader());
  useEffect(() => {
    if (!queue) return;
    const entries: { url: string; video: boolean }[] = [];
    let videos = 0;
    const ahead = queue.posts.slice(currentIndex + 1, currentIndex + 1 + playback.preloadCount);
    for (const p of ahead) {
      const url = displayUrl(p, playback.quality);
      if (!url) continue;
      if (mediaKind(p) === "video") {
        // Buffer only the next video; for later ones just warm the poster.
        if (videos++ === 0) entries.push({ url, video: true });
        else if (p.sample.url) entries.push({ url: p.sample.url, video: false });
      } else entries.push({ url, video: false });
    }
    for (const p of queue.posts.slice(Math.max(0, currentIndex - PREVIOUS_KEPT), currentIndex)) {
      const url = mediaKind(p) === "video" ? p.sample.url : displayUrl(p, playback.quality);
      if (url) entries.push({ url, video: false });
    }
    preloader.sync(entries);
    // `posts.length` re-runs this when a new page lands.
  }, [queue, currentIndex, posts.length, playback.preloadCount, playback.quality, preloader]);

  useEffect(() => () => preloader.clear(), [preloader]);

  // ---- slide timer --------------------------------------------------------
  const isReady = !!current && ready?.id === current.id;
  const durationMs = useMemo(() => {
    if (!current) return playback.intervalSec * 1000;
    const base = playback.intervalSec * 1000;
    if (mediaKind(current) !== "video") return base;
    const len = ready?.durationSec ?? current.duration ?? 0;
    const cap = playback.videoMaxSec > 0 ? playback.videoMaxSec : Infinity;
    return Math.max(base, Math.min(len, cap) * 1000);
  }, [current, ready, playback.intervalSec, playback.videoMaxSec]);

  const running = isReady && !paused && !panelOpen && !infoOpen && !galleryOpen;
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

  // A post that never loads (dead CDN file, stalled stream) must not freeze the show.
  const onStall = useEffectEvent((id: number) => {
    showToast(`Post #${id} didn't load, skipped`);
    void next();
  });
  const stallWatch = !!current && !isReady && !paused && !panelOpen && !galleryOpen;
  useEffect(() => {
    if (!stallWatch || !current) return;
    const id = current.id;
    const t = setTimeout(() => onStall(id), STALL_MS);
    return () => clearTimeout(t);
  }, [stallWatch, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- favorites ----------------------------------------------------------
  const toggleFavorite = async () => {
    if (!queue || !current || !creds || !user) return;
    const post = current;
    const was = post.is_favorited;
    queue.patch(post.id, { is_favorited: !was, fav_count: post.fav_count + (was ? -1 : 1) });
    try {
      if (was) await removeFavorite(post.id, creds);
      else await addFavorite(post.id, creds);
    } catch (e) {
      queue.patch(post.id, { is_favorited: was, fav_count: post.fav_count });
      showToast(`Favorite failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ---- info overlay tag actions --------------------------------------------
  const editTags = (token: string) => {
    if (isRec(search)) {
      // Recommended has no tag box: + / − pin and mute profile tags instead.
      const tag = token.replace(/^-/, "");
      setInfoOpen(false);
      if (!token.startsWith("-")) {
        if (!rec.overrides.pinned.includes(tag)) rec.togglePin(tag);
        showToast(`Pinned ${tag}. Press Play in settings to re-rank`);
        return;
      }
      if (!rec.overrides.muted.includes(tag)) rec.toggleMute(tag);
      // Muting hides posts with the tag; take the upcoming ones out of this show now.
      const upcoming = queue ? queue.posts.slice(currentIndex + 1).filter((p) => allTags(p).includes(tag)) : [];
      for (const p of upcoming) queue?.remove(p.id);
      showToast(`Muted ${tag}${upcoming.length ? `: hid ${upcoming.length} upcoming` : ""}`);
      return;
    }
    const tags = `${search.tags} ${token}`.trim();
    const s = { ...search, tags };
    setSearch(s);
    setInfoOpen(false);
    apply(true, s);
    showToast(`Search: ${tags}`);
  };

  // ---- controls auto-hide -------------------------------------------------
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hovering = useRef(false);
  const poke = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!hovering.current) setControlsVisible(false);
    }, HIDE_CONTROLS_MS);
  };

  // ---- swipe --------------------------------------------------------------
  // 1:1 is excluded: a sideways drag there pans the overflowing image.
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const swipeable = !galleryOpen && !panelOpen && playback.fit !== "original";
  const onPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = null;
    if (e.pointerType !== "touch" || !swipeable) return;
    if ((e.target as Element).closest("button, a, input, select, textarea, [data-no-swipe]")) return;
    swipeStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= 1.5 * Math.abs(dy)) return;
    if (dx < 0) void next();
    else prev();
  };

  // ---- fullscreen ---------------------------------------------------------
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => showToast("Fullscreen not allowed"));
  };
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ---- keyboard -----------------------------------------------------------
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (panelOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        apply(false);
      }
      return;
    }
    if (isTyping(e.target)) return;
    if (galleryOpen) {
      // Leave arrows/space alone so they scroll the grid.
      if (["Escape", "g", "G"].includes(e.key)) {
        e.preventDefault();
        setGalleryOpen(false);
      } else if (e.key === "s" || e.key === "S") setPanelOpen(true);
      return;
    }
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        void next();
        break;
      case "ArrowLeft":
        e.preventDefault();
        prev();
        break;
      case " ":
        e.preventDefault();
        setPaused((p) => !p);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "i":
      case "I":
        setInfoOpen((o) => !o);
        break;
      case "l":
      case "L":
        void toggleFavorite();
        break;
      case "g":
      case "G":
        if (queue) {
          setInfoOpen(false);
          setGalleryOpen(true);
        }
        break;
      case "o":
      case "O":
        if (current) window.open(postPageUrl(current.id), "_blank", "noopener");
        break;
      case "s":
      case "S":
      case "Escape":
        if (e.key === "Escape" && infoOpen) setInfoOpen(false);
        else setPanelOpen(true);
        break;
      default:
        return;
    }
    poke();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ---- saved searches / history / blacklist import ------------------------
  const saveSearch = (name: string) => {
    const entry: SavedSearch = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      tags: search.tags,
      ratings: search.ratings,
      date: search.date,
      order: search.order,
    };
    const list = [entry, ...saved];
    setSaved(list);
    storage.saveSaved(list);
  };
  const loadSaved = (e: SavedSearch) =>
    setSearch({ ...search, source: "search", tags: e.tags, ratings: e.ratings, date: e.date, order: e.order });
  const deleteSaved = (id: string) => {
    const list = saved.filter((s) => s.id !== id);
    setSaved(list);
    storage.saveSaved(list);
  };
  const importBlacklist = async () => {
    if (creds) {
      const n = syncBlacklist(await getCurrentUser(creds));
      return `Synced ${n} rule${n === 1 ? "" : "s"} from your account.`;
    }
    const count = (t: string) => t.split("\n").filter((l) => l.trim()).length;
    const merged = mergeBlacklists(search.blacklist, DEFAULT_BLACKLIST);
    const added = count(merged) - count(search.blacklist);
    setSearch({ ...search, blacklist: merged });
    return added > 0 ? `Added ${added} rule${added === 1 ? "" : "s"}.` : "Nothing new to add.";
  };

  // ---- render -------------------------------------------------------------
  const showControls = controlsVisible || !current;
  const status = (() => {
    if (!queue) return null;
    if (queue.error)
      return (
        <div className="space-y-3 text-center">
          <p className="text-red-300">e621: {queue.error}</p>
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 font-semibold text-black"
            onClick={() => {
              queue.retry();
              void queue.ensure(currentIndex);
            }}
          >
            Retry
          </button>
        </div>
      );
    if (!current && queue.loading) return <Loader2 className="size-10 animate-spin text-neutral-500" aria-label="Loading" />;
    if (!current && queue.exhausted)
      return (
        <div className="space-y-2 text-center text-neutral-300" data-testid="no-results">
          <p className="text-lg">No posts found.</p>
          {queue.stats.blacklisted > 0 && <p className="text-sm text-neutral-500">{queue.stats.blacklisted} hidden by your blacklist.</p>}
          {queue.stats.hidden > 0 && !user && (
            <p className="text-sm text-neutral-500">{queue.stats.hidden} hidden from anonymous users: sign in to see them.</p>
          )}
        </div>
      );
    return null;
  })();

  const iconBtn =
    "flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <main
      className={`relative h-full w-full select-none overflow-hidden ${showControls || panelOpen ? "" : "cursor-none"} ${
        swipeable ? "touch-pan-y" : ""
      }`}
      onMouseMove={poke}
      onClick={poke}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipeStart.current = null)}
      data-testid="app"
    >
      {current && !galleryOpen && (
        <Stage
          post={current}
          previous={previous}
          playback={playback}
          currentReady={isReady}
          onReady={(id, durationSec) => setReady({ id, durationSec })}
          onError={(id) => queue?.remove(id)}
        />
      )}

      {current && !isReady && !galleryOpen && (
        <div className="delayed-show pointer-events-none absolute inset-0 flex items-center justify-center" data-testid="slide-loading">
          <Loader2 className="size-10 animate-spin text-white/50" aria-label="Loading" />
        </div>
      )}

      {status && <div className="absolute inset-0 flex items-center justify-center p-6">{status}</div>}

      {!queue && !panelOpen && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button type="button" className="rounded-md bg-accent px-5 py-2.5 font-semibold text-black" onClick={() => setPanelOpen(true)}>
            Set up a slideshow
          </button>
        </div>
      )}

      {galleryOpen && queue && (
        <Gallery
          posts={posts}
          currentIndex={currentIndex}
          loading={queue.loading}
          exhausted={queue.exhausted}
          error={queue.error}
          stats={queue.stats}
          signedIn={!!user}
          onPick={pick}
          onNeedMore={needMore}
          onRetry={() => {
            queue.retry();
            needMore();
          }}
          onClose={() => setGalleryOpen(false)}
          onPlay={() => pick(currentIndex)}
        />
      )}

      {infoOpen && current && (
        <InfoOverlay
          post={current}
          reasons={match?.reasons}
          recommended={isRec(search)}
          onClose={() => setInfoOpen(false)}
          onAddTag={(t) => editTags(t)}
          onExcludeTag={(t) => editTags(`-${t}`)}
        />
      )}

      {/* search progress (Recommended): the show starts once every page is in and ranked */}
      {queue?.progress && !queue.exhausted && !queue.error && !galleryOpen && (
        <div
          className={`pointer-events-none absolute bottom-6 left-4 z-10 w-48 rounded-md bg-black/75 px-3 py-2 backdrop-blur transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-80"
          }`}
          role="status"
          aria-label="Search progress"
          data-testid="search-progress"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Searching · page {queue.progress.done + 1}
            </span>
            <span className="text-neutral-400">{queue.progress.found.toLocaleString()} found</span>
          </div>
          {/* indeterminate: the last page is only known when a short one arrives */}
          <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse bg-accent/80" />
          </div>
        </div>
      )}

      {/* controls */}
      {!galleryOpen && <div
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        data-testid="controls"
        data-visible={showControls}
      >
        <div
          className="pointer-events-auto absolute right-4 top-4 flex gap-2"
          onMouseEnter={() => (hovering.current = true)}
          onMouseLeave={() => (hovering.current = false)}
        >
          {current && user && creds && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => void toggleFavorite()}
              aria-label={current.is_favorited ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={current.is_favorited}
              data-testid="favorite-button"
            >
              <Heart
                className={`size-5 ${current.is_favorited ? "fill-red-500 text-red-500" : ""}`}
                aria-hidden
              />
            </button>
          )}
          {queue && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => {
                setInfoOpen(false);
                setGalleryOpen(true);
              }}
              aria-label="Gallery"
              data-testid="gallery-button"
            >
              <LayoutGrid className="size-5" aria-hidden />
            </button>
          )}
          {current && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => setInfoOpen((o) => !o)}
              aria-label="Post info"
              aria-pressed={infoOpen}
              data-testid="info-button"
            >
              <Info className="size-5" aria-hidden />
            </button>
          )}
          <button type="button" className={iconBtn} onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {fullscreen ? <Minimize className="size-5" aria-hidden /> : <Maximize className="size-5" aria-hidden />}
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => setPanelOpen(true)}
            aria-label="Open settings"
            data-testid="settings-button"
          >
            <Settings className="size-5" aria-hidden />
          </button>
        </div>

        {queue && queue.stats.hidden > 0 && !user && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="pointer-events-auto absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-xs text-accent backdrop-blur"
          >
            {queue.stats.hidden} hidden · sign in to see
          </button>
        )}

        {current && (
          <div
            className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3"
            onMouseEnter={() => (hovering.current = true)}
            onMouseLeave={() => (hovering.current = false)}
          >
            <button type="button" className={iconBtn} onClick={prev} disabled={currentIndex === 0} aria-label="Previous">
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play" : "Pause"}
              data-testid="pause-button"
            >
              {paused ? <Play className="size-5 fill-current" aria-hidden /> : <Pause className="size-5 fill-current" aria-hidden />}
            </button>
            <button type="button" className={iconBtn} onClick={() => void next()} aria-label="Next" data-testid="next-button">
              <ChevronRight className="size-6" aria-hidden />
            </button>
            <span className="rounded-full bg-black/50 px-3 py-1 font-mono text-xs text-neutral-300 backdrop-blur" data-testid="counter">
              {currentIndex + 1} / {posts.length}
              {queue && !queue.exhausted ? "+" : ""}
            </span>
          </div>
        )}

        {current && (
          <div
            className="pointer-events-none absolute bottom-6 left-4 rounded-full bg-black/50 px-3 py-1 font-mono text-xs text-neutral-300 backdrop-blur"
            data-testid="post-score"
          >
            {match && (
              <span title="How well this post matches your profile: its 5 strongest tag weights, summed">
                Match {match.score.toFixed(1)}
                <span className="px-1.5 text-neutral-600">·</span>
              </span>
            )}
            <span title="Score on e621">▲ {current.score.total}</span>
          </div>
        )}
      </div>}

      {current && isReady && !galleryOpen && (
        <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/10">
          <div
            key={timerKey}
            className="progress-bar h-full bg-accent/80"
            data-testid="progress"
            style={{ animationDuration: `${durationMs}ms`, animationPlayState: running ? "running" : "paused" }}
          />
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="absolute left-1/2 top-4 z-50 max-w-[80vw] -translate-x-1/2 rounded-md bg-panel-2 px-4 py-2 text-sm shadow-lg"
          data-testid="toast"
        >
          {toast}
        </div>
      )}

      <SettingsPanel
        open={panelOpen}
        onClose={() => apply(false)}
        onPlay={() => apply(true)}
        onPreview={openPreview}
        playLabel={playLabel}
        search={search}
        setSearch={setSearch}
        playback={playback}
        setPlayback={setPlayback}
        built={built}
        rec={rec}
        recTags={recTags}
        recPlan={recCandidates}
        creds={creds}
        user={user}
        remember={remember}
        onSignIn={signIn}
        onSignOut={signOut}
        onImportBlacklist={importBlacklist}
        saved={saved}
        onSave={saveSearch}
        onLoadSaved={loadSaved}
        onDeleteSaved={deleteSaved}
        history={history}
        onLoadHistory={(tags) => setSearch({ ...search, source: "search", tags })}
        onClearHistory={() => {
          setHistory([]);
          storage.saveHistory([]);
        }}
        stats={queue?.stats ?? null}
      />
    </main>
  );
}
