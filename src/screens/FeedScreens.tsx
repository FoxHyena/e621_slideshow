"use client";

/**
 * Results (`/search?tags=…`) and Favorites (`/favorites`): a header, the chips row, the feed or grid,
 * and the round Play button (UX §5). Their filters live in the URL, so a reload, Back and a copied
 * link agree; a filter change replaces this history entry and starts the feed over.
 */
import { ChevronLeft, ExternalLink, Heart, LayoutGrid, Link2, MoreHorizontal, Play, Rows3, Search, Star, UserX } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { postPageUrl } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { DEFAULT_FILTERS, decodeFilters, decodeResults, encodeFilters, encodeResults, isDefaultFilters, type Filters, type ResultsParams } from "@/lib/feed/filters";
import { artists } from "@/lib/feed/format";
import { DEFAULT_SEARCH, type SearchSettings } from "@/lib/settings";
import type { TagAction } from "@/components/TagActions";
import { FeedView } from "@/feed/FeedView";
import { ChipsRow, FilterSheet, type ChipId } from "@/feed/Chips";
import { getNav } from "@/nav/history";
import type { Route } from "@/nav/routes";
import { useScreen } from "@/shell/context";
import { Sheet } from "@/shell/Sheet";
import { getFavs } from "@/state/favs";
import { getFeeds, type Feed, type FeedSpec } from "@/state/feeds";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { blacklistLine, copyText, openResults, sharePost } from "./actions";
import { SearchForm } from "./SearchScreen";
import { shareUrlFor } from "@/player/share";
import { openPaused } from "@/player/intent";
import { isLocked, setLockedY } from "@/nav/scroll";

const ALL_RATINGS = { s: true, q: true, e: true };

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

function Toolbar({ children }: { children?: ReactNode }) {
  return (
    <div className="screen-toolbar">
      <button type="button" className="toolbar-circle" aria-label="Back" onClick={() => void getNav().back()}>
        <ChevronLeft aria-hidden />
      </button>
      <div className="flex-1" />
      {children}
    </div>
  );
}

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

export function PlayFab({ feed, route }: { feed: Feed | null; route: Route }) {
  useStore(feed?.version ?? getFeeds().generation, (v) => v);
  const first = feed?.queue.posts[0];
  if (!first) return null;
  return (
    <button
      type="button"
      className="play-fab"
      aria-label="Play"
      onClick={() => {
        openPaused(false);
        getNav().push({ screen: route.screen, play: String(first.id) });
      }}
      data-testid="play-fab"
    >
      <Play aria-hidden />
    </button>
  );
}

/**
 * Close the open sheet (if any), then put this screen's new URL in place of the current one. The
 * new feed starts from the top (UX §5: a filter change reloads the feed from the top).
 */
async function replaceScreen(route: Route, sheetOpen: boolean) {
  const nav = getNav();
  if (sheetOpen) {
    setLockedY(0);
    await nav.back();
  }
  nav.replace(route);
  if (isLocked()) setLockedY(0);
  else window.scrollTo(0, 0);
}

export function PostMenu({ feed, id }: { feed: Feed | null; id: number }) {
  const post = feed?.queue.posts.find((p) => p.id === id);
  const { entry } = useScreen();
  if (!post) return null;
  const artist = artists(post)[0];
  const close = () => getNav().back();
  return (
    <Sheet title={`Post #${post.id}`} testId="sheet-post">
      <button
        type="button"
        className="sheet-option"
        onClick={async () => {
          await close();
          openPaused(false);
          getNav().push({ screen: entry.route.screen, play: String(post.id) });
        }}
      >
        <span>Play from this post</span>
        <Play aria-hidden />
      </button>
      <button type="button" className="sheet-option" onClick={() => void sharePost(post)}>
        <span>Share post</span>
        <Link2 aria-hidden />
      </button>
      <a className="sheet-option" href={postPageUrl(post.id)} target="_blank" rel="noopener">
        <span>Open on e621</span>
        <ExternalLink aria-hidden />
      </a>
      {artist && (
        <button
          type="button"
          className="sheet-option sheet-danger"
          onClick={async () => {
            await close();
            blacklistLine(artist);
          }}
        >
          <span>Blacklist {artist.replaceAll("_", " ")}</span>
          <UserX aria-hidden />
        </button>
      )}
    </Sheet>
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
}: {
  feed: Feed | null;
  grid: boolean;
  route: Route;
  empty: ReactNode;
  onTag: (tag: string, action: TagAction) => void;
  /** where the reading place is kept; tab roots name the tab, since their entry changes per visit */
  anchorKey?: string;
  recommended?: boolean;
}) {
  const { entry } = useScreen();
  if (!feed) return <div className="feed-list" data-testid="feed-waiting" />;
  return (
    <FeedView
      key={feed.key}
      feed={feed}
      grid={grid}
      anchorKey={anchorKey ?? `${entry.key}:${feed.key}`}
      recommended={recommended}
      entryKey={entry.key}
      empty={empty}
      onOpen={(p: Post) => {
        // A tap on a picture or a tile opens the viewer paused; ▶ there starts the show.
        openPaused(true);
        getNav().push({ screen: route.screen, play: String(p.id) });
      }}
      onMenu={(p: Post) => getNav().openSheet(`post:${p.id}`)}
      onTag={onTag}
    />
  );
}

export function postSheet(sheet: string | null): number | null {
  const m = sheet?.match(/^post:(\d+)$/);
  return m ? Number(m[1]) : null;
}

// ---- Results ------------------------------------------------------------------

const RESULTS_CHIPS: ChipId[] = ["media", "hideFaved", "sort", "date", "score"];

export function ResultsScreen({ params }: { params: string }) {
  const { entry, sheet } = useScreen();
  const r = useMemo(() => decodeResults(params), [params]);
  const spec = useMemo<FeedSpec>(() => ({ kind: "search", tags: r.tags, filters: r.filters }), [r]);
  // A link's ratings apply for this visit; a launch shows every rating, like the e621 page it came from.
  const override = r.link?.kind === "share" ? r.link.ratings : r.link?.kind === "launch" ? ALL_RATINGS : null;
  const feed = useFeed(spec, override);
  const [grid, setGrid] = useState(false);
  const saved = useStore(getPrefs().store, (p) => p.saved);
  const savedOne = saved.find((s) => s.tags === r.tags);
  const route = entry.route;

  const go = (next: ResultsParams) => void replaceScreen({ screen: { kind: "results", params: encodeResults(next) }, play: null }, sheet !== null);
  /** A new search here is yours: a link's settings (its ratings, the From a link chip) end with it. */
  const search = (tags: string) => {
    getPrefs().addHistory(tags);
    go({ ...r, tags, link: null });
  };
  const onTag = (tag: string, action: TagAction) => {
    if (action === "blacklist") blacklistLine(tag);
    else if (!r.tags.split(" ").includes(tag)) search(`${r.tags} ${tag}`);
  };

  const toggleSave = () => {
    const prefs = getPrefs();
    if (savedOne) {
      prefs.setSaved(saved.filter((s) => s !== savedOne));
      return;
    }
    const s = prefs.store.get().search;
    prefs.setSaved([
      {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: r.tags || "All posts",
        tags: r.tags,
        ratings: s.ratings,
        date: r.filters.date,
        order: r.filters.order,
      },
      ...saved,
    ]);
  };

  const empty = (
    <>
      <p className="feed-empty-title">No posts match.</p>
      {!isDefaultFilters(r.filters) ? (
        <>
          <p className="feed-note">Filters are on.</p>
          <button type="button" className="btn-tonal" onClick={() => go({ ...r, filters: { ...r.filters, ...resetOf(r.filters) } })}>
            Reset filters
          </button>
        </>
      ) : (
        <button type="button" className="btn-tonal" onClick={() => getNav().openSheet("edit")}>
          <Search aria-hidden /> Change the search
        </button>
      )}
    </>
  );

  return (
    <div className="screen-frame" data-grid={grid || undefined}>
      <Toolbar>
        <button
          type="button"
          className="toolbar-circle"
          aria-label={savedOne ? "Remove saved search" : "Save search"}
          aria-pressed={!!savedOne}
          onClick={toggleSave}
          data-testid="save-search"
        >
          <Star aria-hidden className={savedOne ? "fill-current text-gold" : undefined} />
        </button>
        <GridToggle grid={grid} setGrid={setGrid} />
        <button type="button" className="toolbar-circle" aria-label="More" aria-haspopup="dialog" onClick={() => getNav().openSheet("menu")}>
          <MoreHorizontal aria-hidden />
        </button>
      </Toolbar>
      <h1 tabIndex={-1} className="results-title">
        <button type="button" className="query-pill" onClick={() => getNav().openSheet("edit")} aria-label={`Search: ${r.tags || "all posts"}. Edit`} data-testid="query-pill">
          <Search aria-hidden />
          <span>{r.tags || "All posts"}</span>
        </button>
      </h1>
      <ChipsRow filters={r.filters} chips={RESULTS_CHIPS} onChange={(f) => go({ ...r, filters: f })} link={r.link ? "From a link" : null} />
      <FeedBody feed={feed} grid={grid} route={route} empty={empty} onTag={onTag} />
      <PlayFab feed={feed} route={route} />
      <FilterSheet sheet={sheet} filters={r.filters} apply={(f) => go({ ...r, filters: f })} />
      {sheet === "edit" && (
        <Sheet title="Search" full testId="sheet-edit">
          <SearchForm initial={r.tags} onSubmit={search} />
        </Sheet>
      )}
      {sheet === "menu" && <ResultsMenu />}
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </div>
  );
}

const resetOf = (f: Filters): Partial<Filters> => ({
  media: DEFAULT_SEARCH.media,
  order: "newest",
  date: { ...f.date, enabled: false },
  minScore: null,
  hideFaved: false,
});

function ResultsMenu() {
  const { entry } = useScreen();
  const url = shareUrlFor(entry);
  const copy = () => {
    // Write while the tap still counts as a user gesture (Safari), then close.
    if (url) void copyText(url.href, url.withSignIn ? "Share link copied, with your sign-in" : "Share link copied");
    void getNav().back();
  };
  return (
    <Sheet title="Results" testId="sheet-results-menu">
      <button type="button" className="sheet-option" onClick={copy} data-testid="copy-share-link">
        <span>{url?.withSignIn ? "Copy share link (with your sign-in)" : "Copy share link"}</span>
        <Link2 aria-hidden />
      </button>
    </Sheet>
  );
}

// ---- Favorites ----------------------------------------------------------------

const FAVORITES_CHIPS: ChipId[] = ["media", "sort", "score"];

export function FavoritesScreen({ params }: { params: string }) {
  const { entry, sheet } = useScreen();
  const filters = useMemo(() => decodeFilters(new URLSearchParams(params)), [params]);
  const spec = useMemo<FeedSpec>(() => ({ kind: "favorites", tags: "", filters }), [filters]);
  const { creds, user, ready } = useStore(getSession().store, (s) => s);
  const signedIn = !!creds && !!user;
  const feed = useFeed(spec, null);
  // Coming back after favoriting or unfavoriting anywhere: read the list again. While you're here a
  // removed favorite stays (dimmed heart) so nothing vanishes under you.
  const { visible } = useScreen();
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!visible || !feed) return;
    const changed = getFavs().store.get().changed;
    if (seen.current !== null && seen.current !== changed) getFeeds().drop(feed.key);
    seen.current = changed;
  }, [visible, feed]);
  const [grid, setGrid] = useState(false);
  const route = entry.route;
  const go = (f: Filters) => {
    const q = encodeFilters(f);
    void replaceScreen({ screen: { kind: "favorites", params: q }, play: null }, sheet !== null);
  };

  return (
    <div className="screen-frame" data-grid={grid || undefined}>
      <Toolbar>{signedIn && <GridToggle grid={grid} setGrid={setGrid} />}</Toolbar>
      <h1 tabIndex={-1} className="screen-title">
        Your favorites
      </h1>
      {!ready ? (
        <div className="feed-list" data-testid="feed-waiting" />
      ) : !signedIn ? (
        <div className="feed-empty" data-testid="needs-sign-in">
          <Heart aria-hidden className="feed-empty-mark" />
          <p className="feed-empty-title">Sign in to see your favorites</p>
          <p className="feed-note">Favorites are kept on your e621 account. Sign in with your username and API key.</p>
          <div className="feed-empty-actions">
            <button type="button" className="btn-gold" onClick={() => void getNav().goTab("following")}>
              Sign in
            </button>
            <button type="button" className="btn-tonal" onClick={() => getNav().replace({ screen: { kind: "search" }, play: null })}>
              Search instead
            </button>
          </div>
        </div>
      ) : (
        <>
          <ChipsRow filters={filters} chips={FAVORITES_CHIPS} onChange={go} />
          <FeedBody
            feed={feed}
            grid={grid}
            route={route}
            empty={
              <>
                <p className="feed-empty-title">{isDefaultFilters(filters) ? "No favorites yet." : "No favorites match."}</p>
                {!isDefaultFilters(filters) && (
                  <button type="button" className="btn-tonal" onClick={() => go({ ...filters, ...resetOf(filters) })}>
                    Reset filters
                  </button>
                )}
              </>
            }
            onTag={(tag, action) => (action === "blacklist" ? blacklistLine(tag) : openResults(tag))}
          />
          <PlayFab feed={feed} route={route} />
          <FilterSheet sheet={sheet} filters={filters} apply={go} />
          {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
        </>
      )}
    </div>
  );
}

/**
 * `/artist/<name>`, interim until the artist page (slice 6): the artist's posts, newest first, with
 * your ratings and blacklist. No chips yet: the artist route has no filter params until then.
 */
export function ArtistScreen({ name }: { name: string }) {
  const { entry, sheet } = useScreen();
  const spec = useMemo<FeedSpec>(() => ({ kind: "search", tags: name, filters: DEFAULT_FILTERS }), [name]);
  const feed = useFeed(spec, null);
  const [grid, setGrid] = useState(false);
  const route = entry.route;
  return (
    <div className="screen-frame" data-grid={grid || undefined}>
      <Toolbar>
        <GridToggle grid={grid} setGrid={setGrid} />
      </Toolbar>
      <h1 tabIndex={-1} className="screen-title">
        {name.replaceAll("_", " ")}
      </h1>
      <FeedBody
        feed={feed}
        grid={grid}
        route={route}
        empty={<p className="feed-empty-title">No posts by {name.replaceAll("_", " ")}.</p>}
        onTag={(tag, action) => (action === "blacklist" ? blacklistLine(tag) : openResults(tag))}
      />
      <PlayFab feed={feed} route={route} />
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </div>
  );
}
