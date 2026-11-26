"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GalleryVerticalEnd,
  Heart,
  Info,
  LayoutGrid,
  Link,
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
import { DEFAULT_BLACKLIST, mergeBlacklists, parseBlacklist, syncAccountBlacklist } from "@/lib/query/blacklist";
import {
  buildQuery,
  buildRecommendedQuery,
  favoritesTags,
  tokenize,
  DEFAULT_TAG_LIMIT,
  type BuiltQuery,
} from "@/lib/query/build";
import { RecommendedQueue, REC_PAGE_BUDGET, REC_POPULAR_PAGES } from "@/lib/recommend/stream";
import { searchPlan, topTags } from "@/lib/recommend/weights";
import { DEFAULT_PLAYBACK, DEFAULT_SEARCH, type PlaybackSettings, type SearchSettings } from "@/lib/settings";
import {
  decodeLaunch,
  decodeShare,
  decodeShareCreds,
  encodeShare,
  encodeShareCreds,
  type SharedShow,
} from "@/lib/share";
import { displayUrl, Preloader } from "@/lib/slideshow/media";
import { PostQueue, type SlideQueue } from "@/lib/slideshow/queue";
import { pushHistory, storage, type HistoryEntry, type SavedSearch } from "@/lib/storage";
import Feed from "./Feed";
import Gallery from "./Gallery";
import InfoOverlay from "./InfoOverlay";
import { ImageIcon, Loader, recSteps, stepText, VideoIcon } from "./Loader";
import SettingsPanel from "./SettingsPanel";
import Stage from "./Stage";
import { useRecommendations } from "./useRecommendations";
import { ownState } from "@/nav/history";

const HIDE_CONTROLS_MS = 2500;
/** A touch drag at least this far sideways changes the slide. */
const SWIPE_MIN_PX = 50;
/** Skip a post whose media hasn't become displayable in this long. */
const STALL_MS = 30_000;
const PREVIOUS_KEPT = 2;
/** Enough for the deepest style (the prints pile) plus slack. */
const TRAIL_MAX = 8;
/** Upcoming posts a style may draw on (the prints background takes panels from them). */
const UPCOMING_SHOWN = 12;

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
  /** what the show was started with, so a share link describes what's playing */
  search: SearchSettings;
  /** counts up per new queue, to remount views that should start over */
  serial: number;
}

/** One artist's posts, opened from the scroll view over the feed it was opened from. */
interface ArtistFeed {
  id: number;
  artist: string;
  queue: PostQueue;
  /** the show it was opened from: a new search leaves it behind */
  serial: number;
  needMore: () => void;
}

/** A share link's settings on top of the visitor's own blacklist and preload. Not saved. */
function sharedSearch(shared: SharedShow): SearchSettings {
  return { ...DEFAULT_SEARCH, ...shared.search, blacklist: storage.loadSearch().blacklist };
}
function sharedPlayback(shared: SharedShow): PlaybackSettings {
  // Unmuted video can't autoplay without a click, so a link always starts muted.
  return { ...DEFAULT_PLAYBACK, ...shared.playback, preloadCount: storage.loadPlayback().preloadCount, videoMuted: true };
}

/**
 * A launch link's tags with default filters, so the show matches the e621 search it came
 * from; only the visitor's blacklist carries over (e621 hides the same posts). Not saved.
 */
function launchedSearch(tags: string): SearchSettings {
  return { ...DEFAULT_SEARCH, tags, blacklist: storage.loadSearch().blacklist };
}

export default function App({
  onScreen = true,
  onImmersive,
}: {
  /** false while the shell shows another screen: no timer, no keys */
  onScreen?: boolean;
  onImmersive?: (on: boolean) => void;
} = {}) {
  // ---- persisted settings -------------------------------------------------
  // A share link's settings apply for this visit; they're saved only once the visitor edits something.
  const [shared] = useState(() => decodeShare(new URLSearchParams(location.search)));
  // A launch link (the userscript's button) plays an e621 search with the visitor's own playback.
  const [launch] = useState(() => (shared ? null : decodeLaunch(new URLSearchParams(location.search))));
  const [search, setSearchState] = useState<SearchSettings>(() =>
    shared ? sharedSearch(shared) : launch ? launchedSearch(launch) : storage.loadSearch(),
  );
  const [playback, setPlaybackState] = useState<PlaybackSettings>(() =>
    shared ? sharedPlayback(shared) : storage.loadPlayback(),
  );
  const [saved, setSaved] = useState<SavedSearch[]>(storage.loadSaved);
  const [history, setHistory] = useState<HistoryEntry[]>(storage.loadHistory);
  // A link's sign-in is used for this tab only: never saved, and it doesn't replace a saved key.
  // The shell's head script moved the fragment into memory before hydration (src/app/link-fragment.ts).
  const [linkCreds] = useState(() => decodeShareCreds(window.__e6link ?? location.hash));
  const [linkSession, setLinkSession] = useState(linkCreds !== null);
  const [creds, setCreds] = useState<Credentials | null>(() => linkCreds ?? storage.loadCredentials());
  const [remember, setRemember] = useState(() => !linkCreds && storage.loadCredentials() !== null);
  const [shareSignIn, setShareSignInState] = useState(storage.loadShareSignIn);
  const setShareSignIn = (on: boolean) => {
    setShareSignInState(on);
    storage.saveShareSignIn(on);
  };
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
  /** Posts shown before the current one, newest first, for styles that keep them on screen. */
  const [trail, setTrail] = useState<Post[]>([]);
  const [paused, setPaused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  /** A browsable view of the results over the show: the grid, or the scrolling feed. */
  const [browse, setBrowseState] = useState<"grid" | "feed" | null>(null);
  /** Artists' feeds opened from the scroll view, innermost last; each covers the one below. */
  const [artistFeeds, setArtistFeeds] = useState<ArtistFeed[]>([]);
  const artistFeedId = useRef(0);
  /**
   * History entries pushed for open artist feeds, so the browser's back (a phone's edge
   * swipe included) closes the artist feed instead of leaving the page.
   */
  const artistHistory = useRef(0);
  /** Close every artist feed, taking their history entries back off too. */
  const clearArtists = () => {
    setArtistFeeds([]);
    const n = artistHistory.current;
    if (n === 0) return;
    // The popstate this fires finds no entries left to close, so it does nothing.
    artistHistory.current = 0;
    window.history.go(-n);
  };
  /** Leaving the scroll view (or switching views) closes any artist feeds over it. */
  const setBrowse = (view: "grid" | "feed" | null) => {
    setBrowseState(view);
    clearArtists();
  };
  /** Where the open grid or feed was opened from, so closing it goes back there. */
  const browseFrom = useRef<"panel" | "show">("show");
  /** The feed's last place (post in view and scroll offset), so closing it doesn't lose it. */
  const feedPlace = useRef<{ serial: number; id: number; top: number } | null>(null);
  const [ready, setReady] = useState<{ id: number; durationSec?: number } | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Recommended, asked for during the first read of the favorites: starts once that's done. */
  const [waiting, setWaiting] = useState<SearchSettings | null>(null);

  const browsing = browse !== null;
  const openArtists = browse === "feed" && active ? artistFeeds.filter((f) => f.serial === active.serial) : [];
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
  // A borrowed sign-in doesn't read (and store) the sharer's favorites profile.
  const rec = useRecommendations(linkSession ? null : creds, linkSession ? null : user, showToast);
  /** every weighted profile tag, strongest first, for the settings panel */
  const recTags = useMemo(() => topTags(rec.weights, rec.weights.size), [rec.weights]);
  /** the tags that get their own candidate search: pins, then the highest weights */
  const recCandidates = useMemo(
    () => (rec.profile ? searchPlan(rec.weights, rec.overrides, search.breadth) : []),
    [rec.weights, rec.profile, rec.overrides, search.breadth],
  );
  const isRec = (s: SearchSettings) => s.source === "recommended";
  const isFav = (s: SearchSettings) => s.source === "favorites";
  /** The search e621 actually runs: Favorites swaps the tag box for `fav:<name>`. */
  const effective = (s: SearchSettings): SearchSettings =>
    isFav(s) && user ? { ...s, tags: favoritesTags(user.name) } : s;
  const recTagNames = useMemo(() => recCandidates.map((c) => c.tag), [recCandidates]);
  const buildFor = (s: SearchSettings): BuiltQuery =>
    isRec(s) ? buildRecommendedQuery(s, recTagNames, tagLimit) : buildQuery(effective(s), tagLimit);
  const keyFor = (s: SearchSettings, b: BuiltQuery) =>
    queueKey(b, s.media, creds, isRec(s) ? rec.signature : null);
  const userName = user?.name ?? null;
  const built = useMemo(() => {
    if (search.source === "recommended") return buildRecommendedQuery(search, recTagNames, tagLimit);
    const fav = search.source === "favorites" && userName;
    return buildQuery(fav ? { ...search, tags: favoritesTags(userName) } : search, tagLimit);
  }, [search, recTagNames, tagLimit, userName]);

  /** Replace defaults/old account lines with the account's current blacklist. */
  const syncBlacklist = (u: CurrentUser) => {
    const account = u.blacklisted_tags ?? "";
    // A link's sign-in applies the sharer's blacklist for this visit without saving it.
    const keep = !linkSession;
    setSearchState((prev) => {
      const blacklist = syncAccountBlacklist(prev.blacklist, storage.loadAccountBlacklist(), account);
      // Save only the blacklist: `prev` may be an unsaved share link's search.
      if (keep) storage.saveSearch({ ...storage.loadSearch(), blacklist });
      return { ...prev, blacklist };
    });
    if (keep) storage.saveAccountBlacklist(account);
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
    setLinkSession(false);
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
    setShareSignIn(false);
    // Leaving a link's sign-in keeps whatever key this browser had saved.
    if (linkSession) setLinkSession(false);
    else storage.saveCredentials(null);
  };

  // ---- starting / applying ------------------------------------------------
  const startQueue = (s: SearchSettings) => {
    const b = buildFor(s);
    const key = keyFor(s, b);
    if (active && active.key === key) return false;
    setWaiting(null);
    const onChange = () => setVersion((v) => v + 1);
    const ctx = { username: user?.name };
    let q: SlideQueue;
    if (isRec(s)) {
      const rq = buildRecommendedQuery(s, recTagNames, tagLimit);
      q = new RecommendedQueue(
        [
          { tag: "candidates", query: rq.query, pages: REC_PAGE_BUDGET },
          { tag: "popular", query: rq.popular, pages: REC_POPULAR_PAGES },
        ],
        (query, page, limit) => searchPosts(query, page, limit, creds),
        rec.weights,
        { media: s.media, rules: b.rules, ctx },
        new Set(rec.overrides.muted),
        onChange,
        rec.learned,
      );
    } else {
      q = new PostQueue(b, s.media, (tags, page, limit) => searchPosts(tags, page, limit, creds), ctx, onChange);
    }
    setActive({ queue: q, key, search: s, serial: (active?.serial ?? 0) + 1 });
    clearArtists();
    setIndex(0);
    setTrail([]);
    setReady(null);
    void q.ensure(0);
    if (s.source === "search") {
      const h = pushHistory(history, s.tags, Date.now());
      setHistory(h);
      storage.saveHistory(h);
    }
    return true;
  };

  const goTo = (i: number) => {
    const target = queue?.posts[i];
    // Stepping back to the post just shown takes it off the trail instead of
    // pushing the one we left, so prev/next don't pile up duplicates.
    if (target && trail[0]?.id === target.id) setTrail(trail.slice(1));
    else if (current) setTrail([current, ...trail.filter((p) => p.id !== current.id)].slice(0, TRAIL_MAX));
    setIndex(i);
    setReady(null);
  };

  /** Move the show to the post the feed was last on, so leaving the feed keeps the place. */
  const syncFeedPlace = () => {
    const place = feedPlace.current;
    if (browse !== "feed" || !place || !active || place.serial !== active.serial) return;
    const i = posts.findIndex((p) => p.id === place.id);
    if (i >= 0 && i !== currentIndex) goTo(i);
  };

  /** Why Recommended can't run yet, or null if it can. */
  const recBlocker = (): string | null => {
    if (!user || !creds) return "Sign in to get recommendations from your favorites";
    if (recCandidates.length > 0) return null;
    if (rec.syncing) return rec.step ? stepText(rec.step) : "Still reading your favorites…";
    if (rec.error) return `Couldn't read favorites: ${rec.error}`;
    return "Not enough favorites yet: a tag needs to be on at least 3 of them";
  };

  /** Close the panel; restart only if the query changed. */
  const apply = (resume: boolean, s: SearchSettings = search) => {
    // The first read of the favorites is still going: show its progress, and start when it's done.
    if (isRec(s) && user && creds && recCandidates.length === 0 && rec.syncing) {
      setActive(null);
      setWaiting(s);
      setPanelOpen(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (resume) {
        setPaused(false);
        setBrowse(null);
      }
      return true;
    }
    const blocker = isRec(s) ? recBlocker() : isFav(s) && !user ? "Sign in to play your favorites" : null;
    if (blocker) {
      showToast(blocker);
      return false;
    }
    if (buildFor(s).overLimit) {
      showToast(`Too many tags: e621 allows ${tagLimit}`);
      return false;
    }
    // The same show resumes from where the feed was scrolled to; a new one starts over.
    if (!startQueue(s) && resume) syncFeedPlace();
    setPanelOpen(false);
    // Focus left inside the (now inert) panel would swallow keyboard shortcuts.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (resume) {
      setPaused(false);
      setBrowse(null);
    }
    return true;
  };

  /** Browse the current search (grid or scrolling feed) instead of starting the show. */
  const openPreview = (view: "grid" | "feed") => {
    if (!apply(false)) return;
    browseFrom.current = "panel";
    setBrowse(view);
  };

  const onSynced = useEffectEvent(() => {
    if (!waiting || rec.syncing) return;
    const s = waiting;
    setWaiting(null);
    const blocker = recBlocker();
    if (blocker) {
      showToast(blocker);
      setPanelOpen(true);
    } else startQueue(s);
  });
  // Starting a show that was waiting on the favorites is a reaction to the sync ending.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => onSynced(), [waiting, rec.syncing]);

  // A share link plays straight away, then leaves the address bar so a reload is a plain visit.
  const sharedStarted = useRef(false);
  const onShared = useEffectEvent(() => {
    // Strict Mode mounts twice in dev; a second start would orphan the first queue.
    if (!(shared || launch || linkCreds) || sharedStarted.current) return;
    sharedStarted.current = true;
    // Also drops a sign-in fragment, so the key doesn't sit in the address bar or history.
    // Keeps the entry's state: the shell's navigation key lives there (src/nav/history.ts).
    window.history.replaceState(ownState(), "", location.pathname);
    if (launch) {
      apply(true);
      return;
    }
    if (!shared) return;
    if (apply(true) && shared.playback.videoMuted === false) showToast("Videos start muted: unmute in settings");
  });
  // Starting the show is the point of the link, so this one effect sets state on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => onShared(), []);

  // The shell hides its tab bar while the show or a browse view fills the screen.
  const immersive = !panelOpen && queue !== null;
  useEffect(() => onImmersive?.(immersive), [immersive, onImmersive]);

  const shareLink = async () => {
    if (!active) return;
    const withSignIn = shareSignIn && !!creds && !!user && !linkSession;
    const hash = withSignIn ? `#${encodeShareCreds(creds)}` : "";
    const url = `${location.origin}/?${encodeShare(effective(active.search), playback)}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(withSignIn ? "Share link copied, with your sign-in" : "Share link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const pendingKey = keyFor(search, built);
  const playLabel = !active ? "Play" : active.key !== pendingKey ? "Play new search" : "Resume";

  // ---- navigation ---------------------------------------------------------
  /** Open the grid or feed over the show. */
  const openBrowse = (view: "grid" | "feed") => {
    if (!queue) return;
    setInfoOpen(false);
    syncFeedPlace();
    if (!browsing) browseFrom.current = "show";
    setBrowse(view);
  };

  /** Close the grid or feed, back to the settings panel or the show, whichever opened it. */
  const closeBrowse = () => {
    syncFeedPlace();
    setBrowse(null);
    if (browseFrom.current === "panel") setPanelOpen(true);
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
    setBrowse(null);
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
        else if (p.files.sample.jpg) entries.push({ url: p.files.sample.jpg, video: false });
      } else entries.push({ url, video: false });
    }
    for (const p of queue.posts.slice(Math.max(0, currentIndex - PREVIOUS_KEPT), currentIndex)) {
      const url = mediaKind(p) === "video" ? p.files.sample.jpg : displayUrl(p, playback.quality);
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
    const len = ready?.durationSec ?? current.files.meta.duration ?? 0;
    const cap = playback.videoMaxSec > 0 ? playback.videoMaxSec : Infinity;
    return Math.max(base, Math.min(len, cap) * 1000);
  }, [current, ready, playback.intervalSec, playback.videoMaxSec]);

  const running = onScreen && isReady && !paused && !panelOpen && !infoOpen && !browsing;
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
  const stallWatch = onScreen && !!current && !isReady && !paused && !panelOpen && !browsing;
  useEffect(() => {
    if (!stallWatch || !current) return;
    const id = current.id;
    const t = setTimeout(() => onStall(id), STALL_MS);
    return () => clearTimeout(t);
  }, [stallWatch, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- favorites ----------------------------------------------------------
  const toggleFavorite = async (post: Post | undefined = current) => {
    if (!queue || !post || !creds || !user) return;
    const { stats } = post;
    const was = stats.is_favorited;
    // The post may be in the main results and in any artist feeds open over them.
    const patch = (p: Partial<Post>) => {
      queue.patch(post.id, p);
      for (const f of artistFeeds) f.queue.patch(post.id, p);
    };
    patch({ stats: { ...stats, is_favorited: !was, fav_count: stats.fav_count + (was ? -1 : 1) } });
    try {
      if (was) await removeFavorite(post.id, creds);
      else await addFavorite(post.id, creds);
    } catch (e) {
      patch({ stats });
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
    // From Favorites, + / − narrow the favorites as a plain search.
    const tags = `${effective(search).tags} ${token}`.trim();
    const s: SearchSettings = { ...search, source: "search", tags };
    setSearch(s);
    setInfoOpen(false);
    apply(true, s);
    showToast(`Search: ${tags}`);
  };

  // ---- feed tag actions ------------------------------------------------------
  /** A tag dropped on the feed's Search target: narrow the search (Recommended pins it). */
  const searchTag = (tag: string) => {
    if (isRec(search)) {
      if (rec.overrides.pinned.includes(tag)) return showToast(`${tag} is already pinned`);
      rec.togglePin(tag);
      showToast(`Pinned ${tag}. Press Play in settings to re-rank`);
      return;
    }
    const tags = effective(search).tags;
    if (tokenize(tags).includes(tag)) return showToast(`${tag} is already in the search`);
    const s: SearchSettings = { ...search, source: "search", tags: `${tags} ${tag}`.trim() };
    setSearch(s);
    if (apply(false, s)) showToast(`Search: ${s.tags}`);
  };

  /** A tag dropped on the feed's Blacklist target: hide it here and from now on, keeping the scroll. */
  const blacklistTag = (tag: string) => {
    if (parseBlacklist(search.blacklist).some((r) => r.line === tag)) return showToast(`${tag} is already blacklisted`);
    const blacklist = mergeBlacklists(search.blacklist, tag);
    setSearch({ ...search, blacklist });
    if (!active) return showToast(`Blacklisted ${tag}`);
    const before = active.queue.posts.length;
    const keep = current?.id;
    const s: SearchSettings = { ...active.search, blacklist };
    const rules = buildFor(s).rules;
    active.queue.setRules(rules);
    for (const f of artistFeeds) f.queue.setRules(rules);
    // Same show, new blacklist: keep it current so Play doesn't restart it.
    setActive({ ...active, search: s, key: keyFor(s, buildFor(s)) });
    const at = active.queue.posts.findIndex((p) => p.id === keep);
    if (at >= 0) setIndex(at);
    const hid = before - active.queue.posts.length;
    showToast(`Blacklisted ${tag}${hid ? `: hid ${hid} post${hid === 1 ? "" : "s"}` : ""}`);
  };

  // ---- artist feeds ----------------------------------------------------------
  /** Open a scrolling feed of one artist's posts over the feed, which keeps its place underneath. */
  const openArtist = (artist: string) => {
    if (!active || openArtists.at(-1)?.artist === artist) return;
    // The artist's posts, newest first, with the show's ratings, media and blacklist.
    const s: SearchSettings = {
      ...DEFAULT_SEARCH,
      tags: artist,
      ratings: active.search.ratings,
      media: active.search.media,
      blacklist: active.search.blacklist,
    };
    const q = new PostQueue(
      buildQuery(s, tagLimit),
      s.media,
      (tags, page, limit) => searchPosts(tags, page, limit, creds),
      { username: user?.name },
      () => setVersion((v) => v + 1),
    );
    void q.ensure(0);
    const feed: ArtistFeed = {
      id: ++artistFeedId.current,
      artist,
      queue: q,
      serial: active.serial,
      needMore: () => void q.ensure(q.posts.length - 1),
    };
    setArtistFeeds([...openArtists, feed]);
    // Carries the shell's entry state along, so Back into this entry stays on the same screen.
    window.history.pushState({ ...ownState(), artistFeed: feed.id }, "");
    artistHistory.current++;
  };

  /** Back out of the innermost artist feed, to the feed under it. */
  const closeArtist = () => {
    // Go back through history, so the entry the feed pushed goes too; popstate closes it.
    if (artistHistory.current > 0) window.history.back();
    else setArtistFeeds(openArtists.slice(0, -1));
  };

  // The browser's back (or a phone's edge swipe) closes the innermost artist feed.
  const onPopState = useEffectEvent(() => {
    if (artistHistory.current === 0) return;
    artistHistory.current--;
    setArtistFeeds(openArtists.slice(0, -1));
  });
  useEffect(() => {
    const handler = () => onPopState();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

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
  // Classic 1:1 is excluded: a sideways drag there pans the overflowing image.
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const swipeable = !browsing && !panelOpen && !(playback.style === "classic" && playback.fit === "original");
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
    // Another screen is showing: its keys aren't ours.
    if (!onScreen) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (panelOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        apply(false);
      }
      return;
    }
    if (isTyping(e.target)) return;
    if (browsing) {
      // Leave arrows/space alone so they scroll the grid or feed.
      const key = e.key.toLowerCase();
      // In an artist's feed, Esc goes back a level; the other keys belong to the main search.
      if (openArtists.length) {
        if (key !== "escape") return;
        e.preventDefault();
        closeArtist();
        return;
      }
      if (key === "escape") closeBrowse();
      // G / T switch between the grid and the feed, or close the one already open.
      else if (key === "g" || key === "t") {
        const view = key === "g" ? "grid" : "feed";
        if (browse === view) closeBrowse();
        else openBrowse(view);
      }
      else if (key === "s") setPanelOpen(true);
      else return;
      e.preventDefault();
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
        openBrowse("grid");
        break;
      case "t":
      case "T":
        openBrowse("feed");
        break;
      case "c":
      case "C":
        if (active && !isRec(active.search)) void shareLink();
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
      tags: effective(search).tags,
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
  const recProgress = queue?.progress;
  /** What the search is doing, for the slideshow and for an empty gallery or feed. */
  const searchLoader = waiting ? (
    <Loader
      step={rec.step ?? { phase: "favorites" }}
      steps={recSteps(rec.step?.phase ?? "favorites")}
      delayMs={0}
      testId="rec-sync-progress"
    />
  ) : recProgress ? (
    <Loader
      step={{
        phase: "search",
        done: recProgress.done,
        total: recProgress.max,
        bound: true,
        startedAt: recProgress.startedAt,
        at: recProgress.at,
      }}
      label="Finding posts for you"
      detail={recProgress.done > 0 ? `${recProgress.found.toLocaleString()} matches so far` : "Starting the search"}
      steps={recSteps("search", { favorites: rec.profile?.favIds.length, learned: !!rec.learned })}
      testId="search-progress"
    />
  ) : queue ? (
    <Loader step={null} label="Searching e621" detail={queue.query || "all posts"} testId="search-loading" />
  ) : null;
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
    if (!current && queue.loading) return searchLoader;
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
      {current && !browsing && (
        <Stage
          post={current}
          trail={trail}
          upcoming={posts.slice(currentIndex + 1, currentIndex + 1 + UPCOMING_SHOWN)}
          playback={playback}
          currentReady={isReady}
          durationMs={durationMs}
          running={running}
          onReady={(id, durationSec) => setReady({ id, durationSec })}
          onError={(id) => queue?.remove(id)}
        />
      )}

      {current && !isReady && !browsing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-testid="slide-loading">
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

      {status && <div className="absolute inset-0 flex items-center justify-center p-6">{status}</div>}

      {waiting && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black p-6">{searchLoader}</div>}

      {!queue && !panelOpen && !waiting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button type="button" className="rounded-md bg-accent px-5 py-2.5 font-semibold text-black" onClick={() => setPanelOpen(true)}>
            Set up a slideshow
          </button>
        </div>
      )}

      {browse === "feed" && queue && active && (
        <Feed
          // A new search starts the feed over at the top.
          key={active.serial}
          posts={posts}
          currentIndex={currentIndex}
          loading={queue.loading}
          exhausted={queue.exhausted}
          error={queue.error}
          stats={queue.stats}
          signedIn={!!user}
          playback={playback}
          canFavorite={!!user && !!creds}
          onFavorite={(p) => void toggleFavorite(p)}
          onPlayFrom={pick}
          onNeedMore={needMore}
          loader={searchLoader}
          onRetry={() => {
            queue.retry();
            needMore();
          }}
          onClose={closeBrowse}
          onGrid={() => openBrowse("grid")}
          onEditSearch={() => setPanelOpen(true)}
          savedScroll={() => {
            const place = feedPlace.current;
            return place?.serial === active.serial && place.id === current?.id ? place.top : null;
          }}
          onPlace={(id, top) => (feedPlace.current = { serial: active.serial, id, top })}
          recommended={isRec(search)}
          onTag={(tag, action) => (action === "search" ? searchTag(tag) : blacklistTag(tag))}
          onArtist={openArtist}
          suspended={openArtists.length > 0}
        />
      )}

      {openArtists.map((f, i) => (
        <Feed
          key={f.id}
          artist={f.artist}
          posts={f.queue.posts}
          currentIndex={0}
          loading={f.queue.loading}
          exhausted={f.queue.exhausted}
          error={f.queue.error}
          stats={f.queue.stats}
          signedIn={!!user}
          playback={playback}
          canFavorite={!!user && !!creds}
          onFavorite={(p) => void toggleFavorite(p)}
          onPlayFrom={() => {}}
          onNeedMore={f.needMore}
          loader={<Loader step={null} label="Searching e621" detail={f.artist} testId="artist-feed-loading" />}
          onRetry={() => {
            f.queue.retry();
            f.needMore();
          }}
          onClose={closeArtist}
          onGrid={() => {}}
          onEditSearch={() => {}}
          savedScroll={() => null}
          onPlace={() => {}}
          recommended={isRec(search)}
          onTag={(tag, action) => (action === "search" ? searchTag(tag) : blacklistTag(tag))}
          onArtist={openArtist}
          suspended={i < openArtists.length - 1}
        />
      ))}

      {browse === "grid" && queue && (
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
          loader={searchLoader}
          onRetry={() => {
            queue.retry();
            needMore();
          }}
          onClose={closeBrowse}
          onFeed={() => openBrowse("feed")}
          onEditSearch={() => setPanelOpen(true)}
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

      {/* controls */}
      {!browsing && <div
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
              aria-label={current.stats.is_favorited ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={current.stats.is_favorited}
              data-testid="favorite-button"
            >
              <Heart
                className={`size-5 ${current.stats.is_favorited ? "fill-red-500 text-red-500" : ""}`}
                aria-hidden
              />
            </button>
          )}
          {queue && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => openBrowse("grid")}
              aria-label="Gallery"
              data-testid="gallery-button"
            >
              <LayoutGrid className="size-5" aria-hidden />
            </button>
          )}
          {queue && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => openBrowse("feed")}
              aria-label="Scroll view"
              data-testid="feed-button"
            >
              <GalleryVerticalEnd className="size-5" aria-hidden />
            </button>
          )}
          {active && !isRec(active.search) && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => void shareLink()}
              aria-label="Copy share link"
              data-testid="share-button"
            >
              <Link className="size-5" aria-hidden />
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
            <span title="Score on e621">▲ {current.stats.score.total}</span>
          </div>
        )}
      </div>}

      {current && isReady && !browsing && (
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
        onPreview={() => openPreview("grid")}
        onScroll={() => openPreview("feed")}
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
        linkSession={linkSession}
        shareSignIn={shareSignIn}
        setShareSignIn={setShareSignIn}
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
