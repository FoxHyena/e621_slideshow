"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
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
import { mediaKind, type CurrentUser, type Post } from "@/lib/e621/types";
import { DEFAULT_BLACKLIST, mergeBlacklists, syncAccountBlacklist } from "@/lib/query/blacklist";
import { buildQuery, DEFAULT_TAG_LIMIT, type BuiltQuery } from "@/lib/query/build";
import type { PlaybackSettings, SearchSettings } from "@/lib/settings";
import { displayUrl, Preloader } from "@/lib/slideshow/media";
import { PostQueue } from "@/lib/slideshow/queue";
import { pushHistory, storage, type HistoryEntry, type SavedSearch } from "@/lib/storage";
import InfoOverlay from "./InfoOverlay";
import SettingsPanel from "./SettingsPanel";
import Stage from "./Stage";

const HIDE_CONTROLS_MS = 2500;
/** Skip a post whose media hasn't become displayable in this long. */
const STALL_MS = 30_000;
const PREVIOUS_KEPT = 2;

/** Identity of a queue: anything that changes which posts we'd show. */
function queueKey(built: BuiltQuery, media: SearchSettings["media"], creds: Credentials | null) {
  return JSON.stringify([built.query, built.rules.map((r) => r.line), media, creds?.username ?? null]);
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

interface Active {
  queue: PostQueue;
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
  const built = useMemo(() => buildQuery(search, tagLimit), [search, tagLimit]);

  // ---- slideshow state ----------------------------------------------------
  const [active, setActive] = useState<Active | null>(null);
  const [, setVersion] = useState(0);
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<Post | null>(null);
  const [paused, setPaused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [ready, setReady] = useState<{ id: number; durationSec?: number } | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const queue = active?.queue ?? null;
  const posts = queue?.posts ?? [];
  const current: Post | undefined = posts[Math.min(index, posts.length - 1)];
  const currentIndex = current ? Math.min(index, posts.length - 1) : 0;

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

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
    const b = buildQuery(s, tagLimit);
    const key = queueKey(b, s.media, creds);
    if (active && active.key === key) return false;
    const q = new PostQueue(
      b,
      s.media,
      (tags, page, limit) => searchPosts(tags, page, limit, creds),
      { username: user?.name },
      () => setVersion((v) => v + 1),
    );
    setActive({ queue: q, key });
    setIndex(0);
    setPrevious(null);
    setReady(null);
    void q.ensure(0);
    const h = pushHistory(history, s.tags, Date.now());
    setHistory(h);
    storage.saveHistory(h);
    return true;
  };

  /** Close the panel; restart only if the query changed. */
  const apply = (resume: boolean, s: SearchSettings = search) => {
    if (buildQuery(s, tagLimit).overLimit) {
      showToast(`Too many tags: e621 allows ${tagLimit}`);
      return;
    }
    startQueue(s);
    setPanelOpen(false);
    // Focus left inside the (now inert) panel would swallow keyboard shortcuts.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (resume) setPaused(false);
  };

  const pendingKey = queueKey(built, search.media, creds);
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

  const prev = () => {
    if (!queue || currentIndex === 0) return;
    goTo(currentIndex - 1);
  };

  // Keep the buffer topped up as we move.
  useEffect(() => {
    void queue?.ensure(currentIndex);
  }, [queue, currentIndex]);

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

  const running = isReady && !paused && !panelOpen && !infoOpen;
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
  const stallWatch = !!current && !isReady && !paused && !panelOpen;
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
    setSearch({ ...search, tags: e.tags, ratings: e.ratings, date: e.date, order: e.order });
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
      className={`relative h-full w-full select-none overflow-hidden ${showControls || panelOpen ? "" : "cursor-none"}`}
      onMouseMove={poke}
      onClick={poke}
      data-testid="app"
    >
      {current && (
        <Stage
          post={current}
          previous={previous}
          playback={playback}
          currentReady={isReady}
          onReady={(id, durationSec) => setReady({ id, durationSec })}
          onError={(id) => queue?.remove(id)}
        />
      )}

      {current && !isReady && (
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

      {infoOpen && current && (
        <InfoOverlay
          post={current}
          onClose={() => setInfoOpen(false)}
          onAddTag={(t) => editTags(t)}
          onExcludeTag={(t) => editTags(`-${t}`)}
        />
      )}

      {/* controls */}
      <div
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
      </div>

      {current && isReady && (
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
        playLabel={playLabel}
        search={search}
        setSearch={setSearch}
        playback={playback}
        setPlayback={setPlayback}
        built={built}
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
        onLoadHistory={(tags) => setSearch({ ...search, tags })}
        onClearHistory={() => {
          setHistory([]);
          storage.saveHistory([]);
        }}
        stats={queue?.stats ?? null}
      />
    </main>
  );
}
