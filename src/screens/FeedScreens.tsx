"use client";

/**
 * Results (`/search?tags=…`) and Favorites (`/favorites`): a header, the chips row, the feed or grid,
 * and the round Play button (UX §5). Their filters live in the URL, so a reload, Back and a copied
 * link agree; a filter change replaces this history entry and starts the feed over.
 */
import { Link2, MoreHorizontal, Search, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  dateLabel,
  decodeFilters,
  decodeResults,
  encodeFilters,
  encodeResults,
  filtersOn,
  isDefaultFilters,
  mediaLabel,
  scoreLabel,
  sortLabel,
  type Filters,
  type ResultsParams,
} from "@/lib/feed/filters";
import type { QueueStats } from "@/lib/slideshow/queue";
import { noMatchSentence, StateBlock } from "@/components/State";
import { DEFAULT_SEARCH } from "@/lib/settings";
import type { TagAction } from "@/components/TagActions";
import { ChipsRow, FilterSheet, type ChipId } from "@/feed/Chips";
import { getNav } from "@/nav/history";
import { useScreen } from "@/shell/context";
import { Sheet, SheetAction } from "@/shell/Sheet";
import { getFavs } from "@/state/favs";
import { getFeeds, type FeedSpec } from "@/state/feeds";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { TagText, tagText } from "@/components/TagText";
import { useStore } from "@/state/store";
import { blacklistLine, copyText, defaultFilters, onFeedTag, openArtist } from "./actions";
import { NotSignedIn } from "@/components/NotSignedIn";
import { SearchForm } from "./SearchForm";
import { shareUrlFor } from "@/player/share";
import type { Route } from "@/nav/routes";
import { isLocked, setLockedY } from "@/nav/scroll";
import { ALL_RATINGS, FeedBody, GridToggle, NeedsSignIn, PlayFab, PostMenu, postSheet, Toolbar, useFeed } from "./feedParts";

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
  // a link visit on a browser with no account: its blacklist isn't applied, so say so
  const nobody = useStore(getSession().store, (s) => s.ready && s.user === null && s.creds === null);

  const go = (next: ResultsParams) => void replaceScreen({ screen: { kind: "results", params: encodeResults(next) }, play: null }, sheet !== null);
  /** A new search here is yours: a link's settings (its ratings, the From a link chip) end with it. */
  const search = (tags: string) => {
    getPrefs().addHistory(tags);
    go({ ...r, tags, link: null });
  };
  const onTag = (tag: string, action: TagAction) => {
    if (action === "blacklist") blacklistLine(tag);
    else if (action === "open") openArtist(tag);
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

  const on = filtersOn(r.filters);
  const empty = (stats: QueueStats) => (
    <StateBlock
      mood="look"
      screen
      head="No posts match"
      text={noMatchSentence(on, stats)}
      testId="results-empty"
      actions={
        on > 0 ? (
          <button type="button" className="btn-tonal" onClick={() => go({ ...r, filters: { ...r.filters, ...resetOf(r.filters) } })}>
            Reset filters
          </button>
        ) : (
          <button type="button" className="btn-tonal" onClick={() => getNav().openSheet("edit")}>
            Edit search
          </button>
        )
      }
    />
  );

  return (
    <div className="screen-frame" data-grid={grid || undefined}>
      <Toolbar
        middle={
          <h1 tabIndex={-1} className="results-title">
            <button
              type="button"
              className="field6"
              onClick={() => getNav().openSheet("edit")}
              aria-label={`Search: ${tagText(r.tags)}. Edit`}
              data-testid="query-pill"
            >
              <Search aria-hidden />
              <span>
                <TagText tags={r.tags} />
              </span>
            </button>
          </h1>
        }
      >
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
      <ChipsRow
        filters={r.filters}
        chips={RESULTS_CHIPS}
        onChange={(f) => go({ ...r, filters: f })}
        onLink={r.link ? () => getNav().openSheet(LINK_SHEET) : null}
      />
      {r.link && nobody && <NotSignedIn />}
      <FeedBody feed={feed} grid={grid} route={route} empty={empty} onTag={onTag} follow />
      <PlayFab feed={feed} route={route} />
      <FilterSheet sheet={sheet} filters={r.filters} apply={(f) => go({ ...r, filters: f })} />
      {sheet === "edit" && (
        <Sheet title="Search" full testId="sheet-edit">
          <SearchForm initial={r.tags} onSubmit={search} />
        </Sheet>
      )}
      {sheet === "menu" && <ResultsMenu />}
      {sheet === LINK_SHEET && r.link && <FromALink r={r} onMine={() => go({ ...r, link: null, filters: defaultFilters() })} />}
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </div>
  );
}

const LINK_SHEET = "from-link";
const FITS = { contain: "Fit", cover: "Fill", original: "1:1" } as const;

/** What the link set, for this visit only, and the way back to your own settings (DESIGN.md). */
function FromALink({ r, onMine }: { r: ResultsParams; onMine: () => void }) {
  const link = r.link!;
  const f = r.filters;
  const ratings =
    link.kind === "share"
      ? (["s", "q", "e"] as const)
          .filter((k) => link.ratings[k])
          .map((k) => ({ s: "Safe", q: "Questionable", e: "Explicit" })[k])
          .join(", ") || "None"
      : "All";
  const rows: [string, string][] = [
    ["Ratings", ratings === "Safe, Questionable, Explicit" ? "All" : ratings],
    ["Media", mediaLabel(f.media) ?? "All"],
    ["Sort", sortLabel(f.order) ?? "Newest"],
    ["Date", dateLabel(f.date) ?? "Any time"],
    ["Score", scoreLabel(f.minScore) ?? "Any"],
  ];
  if (link.kind === "share") {
    const p = link.playback;
    const style = p.style === "classic" ? `${FITS[p.fit]}, ` : "";
    rows.push(["Slideshow", `${style}${p.intervalSec} s a slide${p.loop ? ", loops" : ""}`]);
  }
  return (
    <Sheet title="From a link" testId="sheet-link">
      <p className="link-lede">This link came with its own settings.</p>
      <div className="sheet-rows">
        {rows.map(([name, value]) => (
          <div key={name} className="list-row link-row">
            <span className="row-text">
              <b>{name}</b>
              <small>{value}</small>
            </span>
          </div>
        ))}
      </div>
      <p className="link-note">For this visit only. Nothing of yours is changed.</p>
      <button type="button" className="btn-tonal link-mine" onClick={onMine} data-testid="use-my-settings">
        Use my settings
      </button>
    </Sheet>
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
      <div className="sheet-rows" data-wells>
        <SheetAction icon={Link2} label={url?.withSignIn ? "Copy share link (with your sign-in)" : "Copy share link"} onClick={copy} data-testid="copy-share-link" />
      </div>
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
        <NeedsSignIn head="Your favorites live on e621" text="Sign in to see them here." />
      ) : (
        <>
          <ChipsRow filters={filters} chips={FAVORITES_CHIPS} onChange={go} />
          <FeedBody
            feed={feed}
            grid={grid}
            route={route}
            follow
            empty={(stats) =>
              isDefaultFilters(filters) && stats.blacklisted + stats.hidden === 0 ? (
                <StateBlock mood="snooze" screen head="No favorites yet" text="Tap the heart on a post and it shows up here." testId="favorites-empty" />
              ) : (
                <StateBlock
                  mood="look"
                  screen
                  head="No favorites match"
                  text={noMatchSentence(filtersOn(filters), stats)}
                  testId="favorites-empty"
                  actions={
                    !isDefaultFilters(filters) && (
                      <button type="button" className="btn-tonal" onClick={() => go({ ...filters, ...resetOf(filters) })}>
                        Reset filters
                      </button>
                    )
                  }
                />
              )
            }
            onTag={onFeedTag}
          />
          <PlayFab feed={feed} route={route} />
          <FilterSheet sheet={sheet} filters={filters} apply={go} />
          {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
        </>
      )}
    </div>
  );
}
