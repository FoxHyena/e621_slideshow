"use client";

/**
 * For You (`/for-you`, UX §5): your favorites profile ranks the window's posts, then the list shows.
 * The ranked ids are kept for 30 minutes (with Remember on), so a reload or a return shows the same
 * order. Nothing re-ranks on its own: a changed profile (Tune, a sync) offers **Update ranking**, and
 * ⋯ › Refresh ranks again in the background, keeping the old list until you swap it in.
 */
import { ArrowUp, MoreHorizontal, RotateCw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader, recSteps } from "@/components/Loader";
import { searchPosts } from "@/lib/e621/client";
import { DEFAULT_FILTERS, type Filters } from "@/lib/feed/filters";
import { DEFAULT_TAG_LIMIT } from "@/lib/query/build";
import { IdListQueue } from "@/lib/recommend/restore";
import { recQueries, RecommendedQueue, searchTiers } from "@/lib/recommend/stream";
import { isName, NO_OVERRIDES } from "@/lib/recommend/weights";
import { DEFAULT_SEARCH, type SearchSettings } from "@/lib/settings";
import type { SlideQueue } from "@/lib/slideshow/queue";
import { storage, type RankedList } from "@/lib/storage";
import { ChipsRow, FilterSheet, type ChipId } from "@/feed/Chips";
import { PullToRefresh } from "@/feed/PullToRefresh";
import { getNav, openSheetName } from "@/nav/history";
import { isLocked, setLockedY } from "@/nav/scroll";
import { useScreen } from "@/shell/context";
import { TitleRow } from "@/shell/TitleRow";
import { Sheet, SheetAction } from "@/shell/Sheet";
import { getFeeds, type Feed, type FeedSpec } from "@/state/feeds";
import { getPrefs } from "@/state/prefs";
import { getRec, learnedOf, signatureOf, weightsOf, type RecState } from "@/state/rec";
import { getSession } from "@/state/session";
import { shallow, useStore } from "@/state/store";
import type { TagAction } from "@/components/TagActions";
import type { Route } from "@/nav/routes";
import { toast } from "sonner";
import { onFeedTag } from "./actions";
import { FeedBody, GridSet, GridToggle, NeedsSignIn, PlayFab, PostMenu, postSheet, useFeed, useShownFeed } from "./feedParts";
import { ErrorPanel, quietEmpty, StateBlock } from "@/components/State";
import { MIN_SUPPORT } from "@/lib/recommend/weights";

/** How long a saved ranking is shown again instead of ranking afresh (UX §3). */
export const RANKED_TTL = 30 * 60_000;
/** The most ids kept: past this, a reload would rarely get that far down. */
const RANKED_MAX = 3000;
const CHIPS: ChipId[] = ["media", "date", "score"];
/** What an unset Date chip means here (build.ts `recommendedWindow`). */
const DATE_ANY = "Last 7 days";
const DEBOUNCE_MS = 600;

/** The ranking on show (or being made): for these filters, from these profile inputs. */
interface Choice {
  filterKey: string;
  inputs: string;
  nonce: number;
  /** a saved ranking played back by id */
  restore: RankedList | null;
}

/** Every ranking gets its own feed key, so a new one never picks up an old one from the registry. */
let nonces = 0;
const nextNonce = () => ++nonces;

/** When each ranking finished, for "Ranked 3 min ago". */
/** Pull to refresh ranks again only after this long (UX §5). */
const FRESH_MS = 10 * 60_000;
const rankedAt = new WeakMap<SlideQueue, number>();
export const rankedAtOf = (q: SlideQueue): number | null =>
  q instanceof IdListQueue ? q.savedAt : (rankedAt.get(q) ?? null);

const POPULAR: FeedSpec = { kind: "search", tags: "order:rank", filters: DEFAULT_FILTERS };

function minutesAgo(at: number, now: number): string {
  const m = Math.max(0, Math.floor((now - at) / 60_000));
  if (m < 1) return "Ranked just now";
  if (m < 60) return `Ranked ${m} min ago`;
  const h = Math.floor(m / 60);
  return `Ranked ${h} hour${h === 1 ? "" : "s"} ago`;
}

/** Re-render every minute while shown, for the "Ranked N min ago" line. */
function useMinute(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- catch up on becoming visible
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

export function ForYouScreen() {
  const { entry, visible, sheet, play } = useScreen();
  const session = useStore(getSession().store, (s) => s);
  const rec = getRec();
  // Everything but the sync's progress, which ticks many times a second (only the loader reads it).
  const r = useStore(rec.store, (s) => ({ ...s, step: null }), shallow);
  const prefs = getPrefs();
  const applied = useStore(prefs.store, (p) => p.forYou);
  const ratings = useStore(prefs.store, (p) => p.search.ratings);
  const breadth = useStore(prefs.store, (p) => p.search.breadth);
  const reg = getFeeds();
  const generation = useStore(reg.generation, (g) => g);
  const [grid, setGrid] = useState(false);
  const now = useMinute(visible);

  // Chips show a change at once; the feed follows 600 ms after the last one (UX §5).
  const [draft, setDraft] = useState<Filters>(applied);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shown = useRef(visible);
  useEffect(() => {
    shown.current = visible;
  }, [visible]);
  const pending = useRef<Filters | null>(null);
  // Hiding (another tab, Tune) runs this cleanup: apply a change still waiting out its pause.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) prefs.setForYou(pending.current);
      pending.current = null;
    },
    [prefs],
  );
  const change = (f: Filters) => {
    setDraft(f);
    pending.current = f;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      prefs.setForYou(f);
      // The new list starts at the top; only For You's own page, and under a sheet, where it'll land.
      if (!shown.current) return;
      if (isLocked()) setLockedY(0);
      else window.scrollTo(0, 0);
    }, DEBOUNCE_MS);
  };

  const signedIn = !!session.creds && !!session.user && !session.link;
  const name = signedIn ? session.user!.name : null;
  const ready = session.ready && r.loaded && r.name === name;

  const weights = useMemo(() => weightsOf(r), [r.profile, r.cache, r.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (r.profile ? searchTiers(weights, r.overrides, breadth, (t) => isName(r.profile?.tags[t]?.cat)) : []), [weights, r.profile, r.overrides, breadth]);
  const filterKey = JSON.stringify([name, applied.media, applied.date, applied.minScore, ratings]);
  const inputs = JSON.stringify([signatureOf(r), breadth]);
  const canRank = ready && !!name && plan.length > 0;
  const inputsRef = useRef(inputs);
  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  const [choice, setChoice] = useState<Choice | null>(null);
  const [refresh, setRefresh] = useState<Choice | null>(null);
  // Signed out: a later sign-in starts over (restored or ranked afresh, with that sign-in's key).
  if (!signedIn && (choice || refresh)) {
    setChoice(null);
    setRefresh(null);
  }
  // The first ranking waits for a first-ever sync to finish learning, so it isn't stale at once.
  const firstWait = choice === null && r.syncing && !r.fit;
  // A new account or new filters: show the saved ranking for them if it's fresh, else rank now.
  if (canRank && !firstWait && choice?.filterKey !== filterKey) {
    const saved = storage.loadRanked(name);
    // eslint-disable-next-line react-hooks/purity -- read once, when the choice is made
    const fresh = saved && saved.key === filterKey && Date.now() - saved.at < RANKED_TTL ? saved : null;
    setChoice({ filterKey, inputs: fresh ? fresh.inputs : inputs, nonce: nextNonce(), restore: fresh });
    setRefresh(null);
  }

  const make = (c: Choice | null): Feed | null => {
    if (!c || !canRank || c.filterKey !== filterKey || !session.creds) return null;
    const creds = session.creds;
    // A restored list is what's on screen; a ranking run reads ahead of it (ENGINEERING §3 lanes).
    const fetch = (q: string, page: number, limit: number) => searchPosts(q, page, limit, creds);
    const rankFetch = (q: string, page: number, limit: number) => searchPosts(q, page, limit, creds, undefined, "page");
    const ctx = { username: name ?? undefined };
    if (c.restore) {
      const saved = c.restore;
      return reg.custom(
        JSON.stringify(["for-you:saved", c.filterKey, saved.at]),
        (onChange, rules) => new IdListQueue(saved.ids, fetch, { media: applied.media, rules, ctx }, onChange, saved.at),
        { keep: true },
      );
    }
    return reg.custom(
      JSON.stringify(["for-you", c.filterKey, c.inputs, c.nonce]),
      (onChange, rules) => {
        const s: SearchSettings = { ...DEFAULT_SEARCH, ratings, media: applied.media, date: applied.date, minScore: applied.minScore, breadth };
        const tagLimit = session.user?.tag_query_limit ?? DEFAULT_TAG_LIMIT;
        const holder: { q?: RecommendedQueue } = {};
        const q = new RecommendedQueue(
          recQueries(s, plan, tagLimit),
          rankFetch,
          weights,
          { media: applied.media, rules, ctx },
          new Set(r.overrides.muted),
          () => {
            const x = holder.q;
            if (x?.exhausted && !rankedAt.has(x)) rankedAt.set(x, Date.now());
            onChange();
          },
          learnedOf(r),
          r.overrides.noArtists ? new Set(r.overrides.pinned) : null,
        );
        holder.q = q;
        return q;
      },
      { keep: true },
    );
  };
  // The registry hands back the same feed for the same key, so these are safe to re-run.
  const feed = useMemo(() => make(choice), [choice, canRank, filterKey, generation]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = useMemo(() => make(refresh), [refresh, canRank, filterKey, generation]); // eslint-disable-line react-hooks/exhaustive-deps
  useShownFeed(feed);
  useEffect(() => (next ? reg.retain(next) : undefined), [reg, next]);
  useStore(feed?.version ?? reg.generation, (v) => v);
  useStore(next?.version ?? reg.generation, (v) => v);

  // Keep a finished ranking for a reload or a return (only where the sign-in itself is kept).
  const q = feed?.queue;
  const done = q instanceof RecommendedQueue && q.exhausted && !q.error;
  useEffect(() => {
    if (!done || !choice || !name || !getSession().store.get().remember) return;
    const at = rankedAtOf(q);
    if (at === null) return;
    storage.saveRanked(name, { key: choice.filterKey, inputs: choice.inputs, ids: q.posts.slice(0, RANKED_MAX).map((p) => p.id), at });
  }, [done, q, choice, name]);
  // For You's feeds are never evicted (a ranking is costly to redo): drop the ones left behind (new
  // filters, a swap, a dropped refresh), stopping any still fetching, so the same key would make a
  // new ranking instead of handing back a stopped one.
  const live = useRef<Set<Feed>>(new Set());
  useEffect(() => {
    const keep = new Set([feed, next].filter((f): f is Feed => f !== null));
    for (const f of live.current) {
      if (keep.has(f)) continue;
      if (!f.queue.exhausted) f.queue.dispose?.();
      if (reg.peek(f.key) === f) reg.drop(f.key);
    }
    live.current = keep;
  }, [reg, feed, next]);

  // A saved list e621 won't replay (its first batch failed): forget it and rank afresh.
  const restoreFailed = q instanceof IdListQueue && !!q.error && q.posts.length === 0;
  useEffect(() => {
    if (!restoreFailed || !choice?.restore || !name) return;
    storage.saveRanked(name, null);
    setChoice({ ...choice, inputs: inputsRef.current, nonce: nextNonce(), restore: null });
  }, [restoreFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextReady = !!next && next.queue.exhausted && !next.queue.error;
  const nextFailed = !!refresh && !!next?.queue.error;
  const stale = !!choice && choice.inputs !== inputs && canRank;
  const ranking = q instanceof RecommendedQueue && !q.exhausted && !q.error;
  const at = q ? rankedAtOf(q) : null;

  const update = () => {
    if (refresh && nextReady) setChoice(refresh);
    else if (choice) setChoice({ ...choice, inputs, nonce: nextNonce(), restore: null });
    setRefresh(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const busy = ranking || (!!refresh && !nextReady && !nextFailed);
  const doRefresh = async () => {
    await getNav().back();
    if (choice) setRefresh({ ...choice, inputs: inputsRef.current, nonce: nextNonce(), restore: null });
  };

  // Pull to refresh (UX §5): ranks again only once the ranking is 10 minutes old; the old list
  // stays until the Update ranking pill swaps the new one in. ⋯ › Refresh always ranks again.
  const pull = () => {
    if (!choice || busy) return;
    if (at !== null && Date.now() - at < FRESH_MS) {
      const m = Math.max(1, Math.round((Date.now() - at) / 60_000));
      toast(`Already fresh, ranked ${m} min ago`);
      return;
    }
    setRefresh({ ...choice, inputs: inputsRef.current, nonce: nextNonce(), restore: null });
  };
  const subtitle = !signedIn
    ? null
    : nextFailed
      ? `Couldn't rank again: ${next!.queue.error}`
      : refresh && !nextReady
        ? "Ranking again…"
        : ranking
        ? "Ranking…"
        : at !== null
          ? minutesAgo(at, now)
          : null;
  const route = entry.route;
  // Holding a tag here offers Pin (UX §5 "Hold a tag").
  const onTag = (tag: string, action: TagAction) => {
    if (action !== "pin") return onFeedTag(tag, action);
    if (rec.store.get().overrides.pinned.includes(tag)) return void toast(`${tag.replaceAll("_", " ")} is already pinned`);
    rec.togglePin(tag);
    toast(`Pinned ${tag.replaceAll("_", " ")}. Update ranking to use it.`);
  };

  return (
    <GridSet value={setGrid}>
    <div className="screen-frame" data-grid={grid || undefined}>
      {signedIn && <PullToRefresh enabled={visible && !sheet && !play} onRefresh={pull} />}
      <TitleRow title="For You">
        <div className="tools">
          {signedIn && (
            <button
              type="button"
              className="toolbar-circle"
              aria-label="Tune For You"
              onClick={() => getNav().push({ screen: { kind: "tune" }, play: null }, { from: "for-you" })}
              data-testid="open-tune"
            >
              <SlidersHorizontal aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="toolbar-circle tool-search"
            aria-label="Search"
            onClick={() => getNav().push({ screen: { kind: "search" }, play: null }, { from: "for-you" })}
          >
            <Search aria-hidden />
          </button>
          <GridToggle grid={grid} setGrid={setGrid} />
          {signedIn && (
            <button type="button" className="toolbar-circle" aria-label="More" aria-haspopup="dialog" onClick={() => getNav().openSheet("menu")} data-testid="for-you-more">
              <MoreHorizontal aria-hidden />
            </button>
          )}
        </div>
      </TitleRow>
      {subtitle && (
        <p className="screen-sub" aria-live="polite" data-testid="for-you-status">
          {subtitle}
        </p>
      )}
      {!session.ready ? (
        <div className="feed-list" data-testid="feed-waiting" />
      ) : !signedIn ? (
        <SignedOut grid={grid} />
      ) : (
        <>
          <ChipsRow filters={draft} chips={CHIPS} onChange={change} dateAny={DATE_ANY} />
          {(stale || nextReady) && !ranking && (
            <div className="top-pill-row">
              <button type="button" className="top-pill" onClick={update} data-testid="update-ranking">
                <ArrowUp aria-hidden /> Update ranking
              </button>
            </div>
          )}
          <Body r={r} ready={ready} feed={feed} planEmpty={plan.length === 0} grid={grid} route={route} onTag={onTag} />
          {!ranking && <PlayFab feed={feed} route={route} />}
          <FilterSheet
            sheet={sheet}
            filters={draft}
            apply={(f) => {
              change(f);
              if (openSheetName()) void getNav().back();
            }}
            dateAny={DATE_ANY}
          />
          {sheet === "menu" && (
            <Sheet title="For You" testId="sheet-for-you-menu" pop>
              <div className="sheet-rows" data-wells>
                <SheetAction icon={RotateCw} label="Refresh" onClick={() => void doRefresh()} disabled={!choice || busy} data-testid="for-you-refresh" />
              </div>
            </Sheet>
          )}
          {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
        </>
      )}
    </div>
    </GridSet>
  );
}

function Body({
  r,
  ready,
  feed,
  planEmpty,
  grid,
  route,
  onTag,
}: {
  r: RecState;
  ready: boolean;
  feed: Feed | null;
  planEmpty: boolean;
  grid: boolean;
  route: Route;
  onTag: (tag: string, action: TagAction) => void;
}) {
  if (!ready) return <div className="feed-list" data-testid="feed-waiting" />;
  // Reading the favorites (the first time, or a first sync that's still learning).
  if (!feed && r.syncing) {
    return (
      <div className="feed-loader">
        <SyncLoader />
      </div>
    );
  }
  if (!feed && planEmpty) {
    if (r.error && !r.profile) {
      return (
        <ErrorPanel error={r.error} onRetry={() => getRec().rebuild()} testId="for-you-error" />
      );
    }
    const allMuted = r.profile && r.overrides.muted.length > 0 && weightsOf({ ...r, overrides: NO_OVERRIDES }).size > 0;
    if (allMuted) {
      return (
        <StateBlock
          mood="look"
          screen
          head="Every tag is muted"
          text="Unmute a few in Tune to get posts here."
          testId="for-you-all-muted"
          actions={
            <button type="button" className="btn-tonal" onClick={() => getNav().push({ screen: { kind: "tune" }, play: null }, { from: "for-you" })}>
              <SlidersHorizontal aria-hidden className="state-icon" /> Tune
            </button>
          }
        />
      );
    }
    return (
      <StateBlock
        mood="look"
        screen
        head="For You needs a little more"
        text={`A tag needs ${MIN_SUPPORT} favorites. Favorite a few more posts and it starts picking.`}
        testId="for-you-too-few"
        actions={
          <button type="button" className="btn-tonal" onClick={() => getNav().push({ screen: { kind: "search" }, play: null })}>
            <Search aria-hidden className="state-icon" /> Search
          </button>
        }
      />
    );
  }
  if (!feed) return <div className="feed-list" data-testid="feed-waiting" />;
  const q = feed.queue;
  if (q instanceof RecommendedQueue && !q.exhausted && !q.error) {
    const p = q.progress;
    return (
      <div className="feed-loader">
        <Loader
          step={{ phase: "search", done: p.done, total: p.max, bound: true, startedAt: p.startedAt, at: p.at }}
          label="Finding posts for you"
          detail={p.done > 0 ? `${p.found.toLocaleString()} matches so far` : "Starting the search"}
          steps={recSteps("search", { favorites: r.profile?.favIds.length, learned: !!learnedOf(r) })}
          delayMs={0}
          testId="search-progress"
        />
      </div>
    );
  }
  return (
    <FeedBody
      feed={feed}
      grid={grid}
      route={route}
      anchorKey={`for-you:${feed.key}`}
      empty={quietEmpty("Nothing new for you", "Nothing in this date window yet. A wider Date finds more.", { screen: true, testId: "for-you-empty" })}
      onTag={onTag}
      recommended
      follow
    />
  );
}

/** Signed out (or on someone's share link): what For You is, and what's popular meanwhile. */
function SignedOut({ grid }: { grid: boolean }) {
  const { entry, sheet } = useScreen();
  const feed = useFeed(POPULAR, null);
  const block = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={block} data-testid="for-you-signed-out">
        <NeedsSignIn head="For You learns from your favorites" text="Sign in and it picks posts from the tags and artists you favorite most." />
      </div>
      <h2 className="section-title">Popular today</h2>
      <FeedBody
        feed={feed}
        grid={grid}
        route={entry.route}
        anchorKey={feed ? `for-you:${feed.key}` : undefined}
        empty={quietEmpty("Nothing popular right now", "Popular fills up through the day. Check back soon.", { testId: "popular-empty" })}
        onTag={onFeedTag}
        follow
      />
      <PlayFab feed={feed} route={entry.route} gate={block} />
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </>
  );
}

/** The favorites read's progress: the only part of For You that follows each sync tick. */
function SyncLoader() {
  const step = useStore(getRec().store, (s) => s.step);
  return <Loader step={step ?? { phase: "favorites" }} steps={recSteps(step?.phase ?? "favorites")} delayMs={0} testId="rec-sync-progress" />;
}
