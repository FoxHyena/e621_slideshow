"use client";

/**
 * Following (`/following`, the home tab, UX §5): new posts from the tags you follow on e621,
 * newest first. Posts above e621's "seen" marker (as read at the start of the session) are New;
 * a "You're caught up" divider sits at the marker, and runs of one artist's new posts fold to
 * three and "+N more". Once you've scrolled a screen past the divider and rested (or played past
 * it), with no filter on and nothing newer on e621, the marker moves (owner Q8), and a toast says so.
 */
import { ArrowUp, CheckCheck, MoreHorizontal, RotateCw, Search, UserPlus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FILTERS, isDefaultFilters, type Filters } from "@/lib/feed/filters";
import type { Post } from "@/lib/e621/types";
import { dividerIndex, feedRows, isNew, newCountLabel } from "@/lib/following/feed";
import { scrolledPast, SEEN_IDLE_MS, shouldMarkSeen } from "@/lib/following/marker";
import { ChipsRow, FilterSheet, type ChipId } from "@/feed/Chips";
import { getNav } from "@/nav/history";
import { isLocked, setLockedY } from "@/nav/scroll";
import { useScreen } from "@/shell/context";
import { Sheet } from "@/shell/Sheet";
import { getFeeds, feedQuery, type Feed, type FeedSpec } from "@/state/feeds";
import { getFollowing, RETRY_FAILED_MS, type FollowingState } from "@/state/following";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { shallow, useStore } from "@/state/store";
import type { TagAction } from "@/components/TagActions";
import Avatar from "@/components/Avatar";
import { blacklistLine, openResults, openSignIn } from "./actions";
import { FeedBody, GridToggle, PlayFab, PostMenu, postSheet, useFeed } from "./FeedScreens";

const CHIPS: ChipId[] = ["media", "hideFaved"];
/** e621's metatag for the tags you follow (one tag toward the search limit). */
export const SUBSCRIPTIONS = "search:subscriptions";
const POPULAR: FeedSpec = { kind: "search", tags: "order:rank", filters: DEFAULT_FILTERS };

const NO_POSTS: Post[] = [];
/** Runs opened with "+N more" (by first post id): they stay open for the session, reloads too. */
const RUNS_KEY = "e6ss:v1:followingRuns";
const expandedRuns = new Set<number>();
let runsRead = false;
function readRuns(): Set<number> {
  if (!runsRead) {
    runsRead = true;
    try {
      const ids = JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? "[]");
      if (Array.isArray(ids)) for (const id of ids) if (Number.isInteger(id)) expandedRuns.add(id);
    } catch {
      // unreadable: start folded
    }
  }
  return expandedRuns;
}
function expandRun(id: number): Set<number> {
  readRuns().add(id);
  try {
    sessionStorage.setItem(RUNS_KEY, JSON.stringify([...expandedRuns].slice(-200)));
  } catch {
    // full or off: kept for this page only
  }
  return new Set(expandedRuns);
}

const onTag = (tag: string, action: TagAction) => (action === "blacklist" ? blacklistLine(tag) : openResults(tag));

function toTop(visible: boolean) {
  if (!visible) return;
  if (isLocked()) setLockedY(0);
  else window.scrollTo(0, 0);
}

export function FollowingScreen() {
  const { sheet } = useScreen();
  const session = useStore(getSession().store, (s) => s);
  const signedIn = !!session.creds && !!session.user && !session.link;
  const following = getFollowing();
  const fs = useStore(following.store, (s) => s, shallow);
  const [grid, setGrid] = useState(false);

  useEffect(() => {
    if (signedIn && fs.user && fs.status === "idle") void following.load();
  }, [signedIn, fs.user, fs.status, following]);

  const follows = fs.anchor !== null && (fs.anchor.tag_count ?? 1) > 0;
  const feedReady = signedIn && fs.status === "ready" && follows;

  return (
    <div className="screen-frame" data-grid={grid || undefined}>
      <div className="screen-toolbar">
        <div className="flex-1" />
        <button
          type="button"
          className="toolbar-circle"
          aria-label="Search"
          onClick={() => getNav().push({ screen: { kind: "search" }, play: null }, { from: "following" })}
        >
          <Search aria-hidden />
        </button>
        <GridToggle grid={grid} setGrid={setGrid} />
        {feedReady && (
          <button type="button" className="toolbar-circle" aria-label="More" aria-haspopup="dialog" onClick={() => getNav().openSheet("menu")} data-testid="following-more">
            <MoreHorizontal aria-hidden />
          </button>
        )}
      </div>
      <h1 tabIndex={-1} className="screen-title">
        Following
      </h1>
      {!session.ready || (signedIn && (fs.status === "idle" || fs.status === "loading")) ? (
        <div className="feed-list" data-testid="feed-waiting" />
      ) : !signedIn ? (
        <Landing grid={grid} />
      ) : fs.status === "error" ? (
        <div className="feed-error" role="alert" data-testid="following-error">
          <p className="feed-empty-title">Couldn&rsquo;t read what you follow</p>
          <p className="feed-note">{fs.error}</p>
          <button type="button" className="btn-tonal" onClick={() => void following.load()}>
            <RotateCw aria-hidden /> Retry
          </button>
        </div>
      ) : !follows ? (
        <FollowsNoOne grid={grid} />
      ) : (
        <FollowingFeed fs={fs} grid={grid} sheet={sheet} />
      )}
    </div>
  );
}

function FollowingFeed({ fs, grid, sheet }: { fs: FollowingState; grid: boolean; sheet: string | null }) {
  const { entry, visible, play } = useScreen();
  const following = getFollowing();
  const filters = useStore(getPrefs().store, (p) => p.following);
  const spec = useMemo<FeedSpec>(() => ({ kind: "search", tags: SUBSCRIPTIONS, filters }), [filters]);
  const feed = useFeed(spec, null);
  useStore(feed?.version ?? getFeeds().generation, (v) => v);
  const threshold = fs.threshold;
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set(readRuns()));
  const route = entry.route;

  const q = feed?.queue ?? null;
  const posts = q?.posts ?? NO_POSTS;
  const newCount = useMemo(() => posts.filter((p) => isNew(p, threshold)).length, [posts, posts.length, threshold]); // eslint-disable-line react-hooks/exhaustive-deps -- the queue grows in place
  const last = posts[posts.length - 1];
  // A failed page doesn't end the list: more new posts may still be past it.
  const more = !!q && !q.exhausted && (!last || isNew(last, threshold));
  const label = newCountLabel(newCount, more);
  const filtered = !isDefaultFilters(filters);

  const rowsFor = useCallback(
    (list: Post[], exhausted: boolean) => feedRows(list, threshold, dividerIndex(list, threshold, exhausted), expanded),
    [threshold, expanded],
  );
  const fresh = useCallback((p: Post) => isNew(p, threshold), [threshold]);

  // ---- marking seen ----
  const attempt = useRef<(force: boolean) => void>(() => {});
  const markIfDue = (force: boolean) => {
    if (!feed || !q) return;
    const s = following.store.get();
    // Newer posts are known to be waiting (the pill is up): no point asking again until a refresh.
    if (s.newer && !force) return;
    // A mark just failed (offline, rate limit): wait a minute before trying again on our own.
    if (!force && s.failedAt !== null && Date.now() - s.failedAt < RETRY_FAILED_MS) return;
    const rawMax = q.rawMax ?? 0;
    const step = shouldMarkSeen({ threshold: s.threshold, rawMax, seenPast: true, filtered, force, newer: null, done: s.marked !== null || s.marking });
    if (step !== "check") return;
    const session = getSession().store.get();
    const env = { ratings: getPrefs().store.get().search.ratings, creds: session.creds, user: session.user };
    // The feed's own search, filters and all: anything it would never show can't hold the mark.
    const query = (above: number) => feedQuery({ kind: "search", tags: `${SUBSCRIPTIONS} id:>${above}`, filters }, env);
    void following.markSeen(rawMax, query, force);
  };
  useLayoutEffect(() => {
    attempt.current = markIfDue;
  });

  // Rule 1, scrolling: a screen past the divider, then at rest for 1.5 s.
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onView = useCallback(
    (v: { top: number; height: number; dividerTop: number | null; total: number }) => {
      clearTimeout(idle.current);
      if (!visible || !scrolledPast(v.dividerTop, v, v.total)) return;
      idle.current = setTimeout(() => attempt.current(false), SEEN_IDLE_MS);
    },
    [visible],
  );
  useEffect(() => () => clearTimeout(idle.current), []);
  useEffect(() => {
    if (!visible) clearTimeout(idle.current);
  }, [visible]);

  // Rule 1, playing: the player went past the last new post (to an old one). Opening an old post
  // straight away (a tap below the divider, a link, a reload) isn't playing past anything.
  const playedNew = useRef(false);
  useEffect(() => {
    const id = Number(play);
    if (!play || !Number.isInteger(id) || threshold === null) {
      playedNew.current = false;
      return;
    }
    if (id > threshold) {
      playedNew.current = true;
      return;
    }
    if (playedNew.current && posts.some((p) => p.id === id)) attempt.current(false);
  }, [play, threshold, posts]);

  const change = (f: Filters) => {
    getPrefs().setFollowing(f);
    toTop(visible);
  };
  const refresh = () => {
    if (!feed) return;
    following.clearNewer();
    getFeeds().drop(feed.key);
    toTop(visible);
  };

  const caughtNote = fs.marked === "e621" ? "Marked as seen on e621" : fs.marked === "local" ? "Marked as seen on this device" : undefined;
  const followCount = fs.anchor?.tag_count ?? null;

  return (
    <>
      <p className="screen-sub" aria-live="polite" data-testid="following-status">
        {label && newCount > 0 ? (
          <>
            <b>{label}</b> since your last visit
          </>
        ) : (
          label
        )}
      </p>
      <ChipsRow filters={filters} chips={CHIPS} onChange={change} />
      {fs.newer && (
        <div className="top-pill-row">
          <button type="button" className="top-pill" onClick={refresh} data-testid="new-posts-pill">
            <ArrowUp aria-hidden /> New posts
          </button>
        </div>
      )}
      <FeedBody
        feed={feed}
        grid={grid}
        route={route}
        anchorKey={feed ? `following:${feed.key}` : undefined}
        empty={
          filtered ? (
            <>
              <p className="feed-empty-title">No posts match.</p>
              <p className="feed-note">Filters are on.</p>
              <button type="button" className="btn-tonal" onClick={() => change({ ...DEFAULT_FILTERS })}>
                Reset filters
              </button>
            </>
          ) : (
            <>
              <p className="feed-empty-title">No posts yet</p>
              <p className="feed-note">
                {followCount ? `Nothing yet from the ${followCount} ${followCount === 1 ? "tag" : "tags"} you follow.` : "Nothing yet from what you follow."}
              </p>
            </>
          )
        }
        onTag={onTag}
        rowsFor={rowsFor}
        fresh={fresh}
        caughtNote={caughtNote}
        onExpand={(run) => setExpanded(expandRun(run))}
        onView={onView}
      />
      <PlayFab feed={feed} route={route} count={newCount} />
      <FilterSheet
        sheet={sheet}
        filters={filters}
        apply={(f) => {
          change(f);
          void getNav().back();
        }}
      />
      {sheet === "menu" && (
        <Sheet title="Following" testId="sheet-following-menu">
          <button
            type="button"
            className="sheet-option"
            onClick={async () => {
              await getNav().back();
              refresh();
            }}
            data-testid="following-refresh"
          >
            <span>Refresh</span>
            <RotateCw aria-hidden />
          </button>
          <button
            type="button"
            className="sheet-option"
            disabled={newCount === 0 || fs.marked !== null || fs.marking}
            onClick={async () => {
              await getNav().back();
              getNav().openSheet("mark-all");
            }}
            data-testid="following-mark-all"
          >
            <span>Mark all as seen</span>
            <CheckCheck aria-hidden />
          </button>
        </Sheet>
      )}
      {sheet === "mark-all" && (
        <Sheet
          title="Mark all as seen"
          testId="sheet-mark-all"
          footer={
            <div className="sheet-actions">
              <button type="button" className="btn-tonal" onClick={() => void getNav().back()}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-gold"
                onClick={async () => {
                  await getNav().back();
                  attempt.current(true);
                }}
                data-testid="mark-all-confirm"
              >
                Mark as seen
              </button>
            </div>
          }
        >
          <p className="sheet-note">
            Mark {more ? `${newCount}+` : newCount} new {newCount === 1 && !more ? "post" : "posts"} as seen on e621? This can&rsquo;t be undone.
          </p>
        </Sheet>
      )}
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </>
  );
}

/** Signed out (or on someone's share link): what Following is, and what's popular meanwhile. */
function Landing({ grid }: { grid: boolean }) {
  return (
    <>
      <div className="feed-empty following-landing" data-testid="following-signed-out">
        <Avatar seed="e621-slideshow" className="following-mascot" />
        <p className="feed-empty-title">Follow the artists you love and see their new posts first.</p>
        <button type="button" className="btn-gold" onClick={openSignIn} data-testid="following-sign-in">
          Sign in with e621
        </button>
      </div>
      <Popular grid={grid} />
    </>
  );
}

/** Signed in, following nothing yet (slice 5 brings Follow from favorites here). */
function FollowsNoOne({ grid }: { grid: boolean }) {
  return (
    <>
      <div className="feed-empty" data-testid="following-none">
        <UserPlus aria-hidden className="feed-empty-mark" />
        <p className="feed-empty-title">You don&rsquo;t follow anyone yet</p>
        <p className="feed-note">Follow artists on e621, and their new posts show up here first.</p>
      </div>
      <Popular grid={grid} />
    </>
  );
}

function Popular({ grid }: { grid: boolean }) {
  const { entry, sheet } = useScreen();
  const feed: Feed | null = useFeed(POPULAR, null);
  return (
    <>
      <h2 className="section-title">Popular today</h2>
      <FeedBody
        feed={feed}
        grid={grid}
        route={entry.route}
        anchorKey={feed ? `following:${feed.key}` : undefined}
        empty={<p className="feed-empty-title">Nothing popular right now.</p>}
        onTag={onTag}
      />
      <PlayFab feed={feed} route={entry.route} />
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </>
  );
}
