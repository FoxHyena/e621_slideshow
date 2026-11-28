"use client";

/**
 * What every feed screen shares (Following, For You, Results, Favorites, an artist): the feed body,
 * the toolbar and grid toggle, Play with its step-aside and gate, the post menu, needs sign-in. Kept
 * apart from Results, Favorites and the artist page (FeedScreens.tsx), so those stay out of the first
 * load while Following, which uses these, is in it.
 */
import { ChevronLeft, LayoutGrid, Play, Rows3 } from "lucide-react";
import { createContext, Suspense, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Post } from "@/lib/e621/types";
import { OfflineBanner, QuietButton, StateBlock } from "@/components/State";
import { type SearchSettings } from "@/lib/settings";
import type { TagAction } from "@/components/TagActions";
import { FeedView, type FeedViewProps } from "@/feed/FeedView";
import { getNav } from "@/nav/history";
import type { Route } from "@/nav/routes";
import { useScreen } from "@/shell/context";
import { getFeeds, type Feed, type FeedSpec } from "@/state/feeds";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { openSignIn } from "./actions";
import { openPaused } from "@/player/intent";
import { scrollY } from "@/nav/scroll";
import { PostMenuSheet } from "@/shell/lazy";

export const ALL_RATINGS = { s: true, q: true, e: true };

/** Tie a feed to this screen: the player over it finds it, and it's kept while on screen. */
export function useShownFeed(feed: Feed | null): void {
  const { entry, visible } = useScreen();
  const reg = getFeeds();
  if (feed) reg.bind(entry.key, feed);
  useEffect(() => (feed && visible ? reg.retain(feed) : undefined), [reg, feed, visible]);
}

/** The live feed for this screen, or null while a saved sign-in is still being checked. */
export function useFeed(spec: FeedSpec, ratingsOverride: SearchSettings["ratings"] | null): Feed | null {
  const session = useStore(getSession().store, (s) => s);
  const savedRatings = useStore(getPrefs().store, (p) => p.search.ratings);
  const reg = getFeeds();
  const generation = useStore(reg.generation, (g) => g);
  const ratings = ratingsOverride ?? savedRatings;
  const feed = useMemo(
    () => (session.ready ? reg.get(spec, { ratings, creds: session.creds, user: session.user }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `generation` re-asks after the registry dropped feeds
    [reg, spec, ratings, session.ready, session.creds, session.user, generation],
  );
  useShownFeed(feed);
  return feed;
}

/** A pushed screen's header row: back, an optional middle (Results' search), the tools capsule. */
export function Toolbar({ children, middle }: { children?: ReactNode; middle?: ReactNode }) {
  return (
    <div className="head-row">
      <button type="button" className="toolbar-circle" aria-label="Back" onClick={() => void getNav().back()}>
        <ChevronLeft aria-hidden />
      </button>
      <div className="grow">{middle}</div>
      {children && <div className="tools">{children}</div>}
    </div>
  );
}

/** The screen's grid switch, so a tile tap can turn the grid back into the feed at that post. */
export const GridSet = createContext<((grid: boolean) => void) | null>(null);

export function GridToggle({ grid, setGrid }: { grid: boolean; setGrid: (g: boolean) => void }) {
  return (
    <button
      type="button"
      className="toolbar-circle"
      aria-label={grid ? "Show as feed" : "Show as grid"}
      onClick={() => setGrid(!grid)}
      data-testid="grid-toggle"
    >
      {grid ? <Rows3 aria-hidden /> : <LayoutGrid aria-hidden />}
    </button>
  );
}

/**
 * Play steps aside while you scroll down (200 ms fade and a 24 drop) and comes back when you scroll
 * up or rest for a second. Written straight to the button, so scrolling never re-renders it.
 */
function useStepAside() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let last = scrollY();
    let rest: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const y = scrollY();
      const el = ref.current;
      // out of sight is out of the tab order too
      const away = y > last && y > 8;
      if (el) {
        el.toggleAttribute("data-away", away);
        el.inert = away || el.hasAttribute("data-gated");
      }
      last = y;
      clearTimeout(rest);
      rest = setTimeout(() => {
        ref.current?.removeAttribute("data-away");
        if (ref.current) ref.current.inert = ref.current.hasAttribute("data-gated");
      }, 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(rest);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return ref;
}

/** For You, Favorites (and Artists) signed out: Goo waves, gold Sign in, quiet Search instead. */
export function NeedsSignIn({ head, text }: { head: string; text: string }) {
  return (
    <StateBlock
      mood="wave"
      screen
      head={head}
      text={text}
      testId="needs-sign-in"
      actions={
        <>
          <button type="button" className="btn-gold" onClick={openSignIn}>
            Sign in
          </button>
          <QuietButton onClick={() => getNav().push({ screen: { kind: "search" }, play: null })}>Search instead</QuietButton>
        </>
      }
    />
  );
}

/** True while `gate` (the landing card) is on screen: Play waits until it has scrolled away. */
function useGated(gate: RefObject<HTMLElement | null> | undefined): boolean {
  const [on, setOn] = useState(!!gate);
  useEffect(() => {
    if (!gate) return;
    const el = gate.current;
    if (!el || typeof IntersectionObserver !== "function") {
      // nothing to watch: never keep Play hidden
      const t = setTimeout(() => setOn(false));
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [gate]);
  return on;
}

export function PlayFab({ feed, route, count = 0, gate }: { feed: Feed | null; route: Route; count?: number; gate?: RefObject<HTMLElement | null> }) {
  useStore(feed?.version ?? getFeeds().generation, (v) => v);
  const ref = useStepAside();
  const gated = useGated(gate);
  const first = feed?.queue.posts[0];
  // inert is written here and by step-aside, never by React: a lifted gate must not clear the inert
  // that keeps a stepped-aside (invisible) Play out of reach
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.inert = gated || el.hasAttribute("data-away");
  }, [gated, first, ref]);
  if (!first) return null;
  return (
    <button
      ref={ref}
      type="button"
      className="play-fab"
      data-gated={gated || undefined}
      aria-label={count > 0 ? `Play ${count} new posts` : "Play from here"}
      onClick={() => {
        openPaused(false);
        getNav().push({ screen: route.screen, play: String(first.id) });
      }}
      data-testid="play-fab"
    >
      <Play aria-hidden />
      {count > 0 && (
        <span className="play-fab-count" aria-hidden data-testid="play-count">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/** A post's ⋯ sheet; its code loads with the filter sheets' chunk, after the first load (src/feed/PostMenu.tsx). */
export function PostMenu(props: { feed: Feed | null; id: number; post?: Post; page?: boolean }) {
  return (
    <Suspense fallback={null}>
      <PostMenuSheet {...props} />
    </Suspense>
  );
}

export function FeedBody({
  feed,
  grid,
  route,
  empty,
  onTag,
  anchorKey,
  recommended,
  ...following
}: {
  feed: Feed | null;
  grid: boolean;
  route: Route;
  empty: FeedViewProps["empty"];
  onTag: (tag: string, action: TagAction) => void;
  /** where the reading place is kept; tab roots name the tab, since their entry changes per visit */
  anchorKey?: string;
  recommended?: boolean;
} & Pick<FeedViewProps, "rowsFor" | "fresh" | "caughtNote" | "onExpand" | "onView" | "follow">) {
  const { entry } = useScreen();
  const setGrid = useContext(GridSet);
  if (!feed) return <div className="feed-list" data-testid="feed-waiting" />;
  return (
    <>
      <OfflineBanner />
      <FeedView
      key={feed.key}
      feed={feed}
      grid={grid}
      anchorKey={anchorKey ?? `${entry.key}:${feed.key}`}
      recommended={recommended}
      {...following}
      entryKey={entry.key}
      empty={empty}
      onOpen={(p: Post) => {
        // A picture opens on its own (DESIGN.md "A post on its own"); the viewer hands a video tile to the player.
        getNav().push({ screen: route.screen, play: null, view: String(p.id) });
      }}
      onMenu={(p: Post, tile?: boolean) => getNav().openSheet(`${tile ? "tile" : "post"}:${p.id}`)}
      onList={setGrid ? () => setGrid(false) : undefined}
      onTag={onTag}
    />
    </>
  );
}

/** The post a ⋯ sheet is for: a card's (`post:<id>`) or a grid tile's (`tile:<id>`). */
export function postSheet(sheet: string | null): number | null {
  const m = sheet?.match(/^(?:post|tile):(\d+)$/);
  return m ? Number(m[1]) : null;
}

