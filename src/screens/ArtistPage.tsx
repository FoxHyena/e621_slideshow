"use client";

/**
 * `/artist/<name>` (UX.md "Artist page", DESIGN.md "Artist page" and "the artist page's edges"):
 * the hero (mark, name, handle), three stats in wells, one wide Follow, the chips, then the posts
 * as a feed or a grid. Once the hero has scrolled away a compact bar holds Back, the mark, the
 * name and a Follow pill. A name e621 doesn't know is an empty state; a tag that isn't an artist
 * keeps the hero with a tag in the mark's place and "Follow tag". Its own chunk.
 */
import { ChevronLeft, Clock, ExternalLink, Heart, Image as ImageIcon, Link2, MoreHorizontal, Search, Share, Tag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { noMatchSentence, StateBlock } from "@/components/State";
import { ChipsRow, FilterSheet, type ChipId } from "@/feed/Chips";
import { FollowButton, FollowPill } from "@/feed/FollowPill";
import { turnMark } from "@/feed/motion";
import { artistPageUrl, getTags, searchPosts, type Credentials } from "@/lib/e621/client";
import { TAG_CATEGORIES, type TagInfo } from "@/lib/e621/types";
import { decodeFilters, encodeFilters, filtersOn, isDefaultFilters, type Filters } from "@/lib/feed/filters";
import { ago, compact } from "@/lib/feed/format";
import type { QueueStats } from "@/lib/slideshow/queue";
import { DEFAULT_SEARCH } from "@/lib/settings";
import { getNav, openSheetName } from "@/nav/history";
import { isLocked, setLockedY } from "@/nav/scroll";
import type { Route } from "@/nav/routes";
import { useScreen } from "@/shell/context";
import { motionFx } from "@/shell/lazy";
import { Sheet } from "@/shell/Sheet";
import { getArtistList } from "@/state/artistList";
import type { FeedSpec } from "@/state/feeds";
import { getRec } from "@/state/rec";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { copyText, onFeedTag, shareArtist } from "./actions";
export { PostScreen } from "./PostPage";
import { FeedBody, GridSet, GridToggle, PlayFab, PostMenu, postSheet, Toolbar, useFeed } from "./feedParts";

const CHIPS: ChipId[] = ["media", "hideFaved", "sort", "date", "score"];
const label = (n: string) => n.replaceAll("_", " ");
/** the ⋯ sheet */
const MENU = "artist-menu";

// ---- what e621 knows about the name ----------------------------------------------

type Info = { status: "loading" } | { status: "ready"; tag: TagInfo } | { status: "missing" } | { status: "error" };

/** e621's form of a typed name: lower case, underscores for spaces ("Some One" is `some_one`). */
export const tagNameOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "_");

/** One lookup per name a visit (a tag's count and category are public, so it isn't per account). */
const asked = new Map<string, Promise<TagInfo | null>>();
/** answers already in, so a remount (a chip change) starts from them instead of a blank hero */
const known = new Map<string, TagInfo | null>();
function lookUp(key: string, creds: Credentials | null): Promise<TagInfo | null> {
  let p = asked.get(key);
  if (!p) {
    p = getTags([key], creds, "page", true).then((r) => {
      const tag = r.find((t) => t.name === key) ?? null;
      known.set(key, tag);
      return tag;
    });
    // a failure is asked again next time
    p.catch(() => asked.delete(key));
    asked.set(key, p);
  }
  return p;
}
const infoOf = (tag: TagInfo | null): Info => (tag ? { status: "ready", tag } : { status: "missing" });

function useTagInfo(name: string): Info {
  const creds = useStore(getSession().store, (s) => s.creds);
  const [got, setGot] = useState<{ name: string; info: Info }>(() => ({ name, info: known.has(name) ? infoOf(known.get(name)!) : { status: "loading" } }));
  useEffect(() => {
    let live = true;
    lookUp(name, creds).then(
      (tag) => live && setGot({ name, info: infoOf(tag) }),
      () => live && setGot({ name, info: { status: "error" } }),
    );
    return () => {
      live = false;
    };
  }, [name, creds]);
  if (got.name === name) return got.info;
  return known.has(name) ? infoOf(known.get(name)!) : { status: "loading" };
}

/**
 * When the artist last posted: their newest post, whatever the chips say (one post, newest first,
 * kept for the visit). Your ratings and blacklist don't apply: it's when they posted, not what you see.
 */
const newestAsked = new Map<string, Promise<string | null>>();
const newestKnown = new Map<string, string | null>();
function useNewest(name: string): string | null {
  const creds = useStore(getSession().store, (s) => s.creds);
  const [got, setGot] = useState<{ name: string; at: string | null }>(() => ({ name, at: newestKnown.get(name) ?? null }));
  useEffect(() => {
    let live = true;
    let p = newestAsked.get(name);
    if (!p) {
      p = searchPosts(`${name} order:id_desc`, 1, 1, creds, undefined, "bg").then((r) => {
        const at = r[0]?.created_at ?? null;
        newestKnown.set(name, at);
        return at;
      });
      p.catch(() => newestAsked.delete(name));
      newestAsked.set(name, p);
    }
    p.then(
      (at) => live && setGot({ name, at }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [name, creds]);
  return got.name === name ? got.at : (newestKnown.get(name) ?? null);
}

// ---- the screen -------------------------------------------------------------------

async function replaceScreen(route: Route, sheetOpen: boolean) {
  const nav = getNav();
  if (sheetOpen && openSheetName()) {
    setLockedY(0);
    await nav.back();
  }
  nav.replace(route);
  if (isLocked()) setLockedY(0);
  else window.scrollTo(0, 0);
}

export function ArtistScreen({ name: typed, params }: { name: string; params: string }) {
  const { entry, sheet, visible } = useScreen();
  // `/artist/Some%20One` is e621's some_one: one tag, its lookup, its follow, your count of it
  const name = tagNameOf(typed);
  const filters = useMemo(() => decodeFilters(new URLSearchParams(params)), [params]);
  const spec = useMemo<FeedSpec>(() => ({ kind: "search", tags: name, filters }), [name, filters]);
  const feed = useFeed(spec, null);
  const info = useTagInfo(name);
  const [grid, setGrid] = useState(false);
  const route = entry.route;
  // opening an artist's page clears their New dot on Artists for the session
  useEffect(() => getArtistList().opened(name), [name]);

  const go = (f: Filters) => {
    const q = encodeFilters(f);
    void replaceScreen({ screen: { kind: "artist", name, ...(q ? { params: q } : {}) }, play: null }, sheet !== null);
  };

  if (info.status === "missing")
    return (
      <div className="screen-frame">
        <Toolbar />
        <StateBlock
          mood="look"
          screen
          head={`No artist called “${label(name)}”`}
          text="e621 has no tag with this name. Check the spelling, or search for it."
          actions={
            <button type="button" className="btn-tonal" onClick={() => getNav().push({ screen: { kind: "search" }, play: null })}>
              <Search aria-hidden className="state-icon" />
              Search
            </button>
          }
          testId="artist-missing"
        />
      </div>
    );

  const isArtist = info.status !== "ready" || info.tag.category === 1;
  const on = filtersOn(filters);
  const empty = (stats: QueueStats) =>
    isDefaultFilters(filters) && stats.blacklisted + stats.hidden === 0 ? (
      <StateBlock mood="look" screen head={`No posts by ${label(name)}`} text="e621 has no posts under this name yet." testId="artist-empty" />
    ) : (
      <StateBlock
        mood="look"
        screen
        head="No posts match"
        text={noMatchSentence(on, stats)}
        testId="artist-empty"
        actions={
          on > 0 && (
            <button type="button" className="btn-tonal" onClick={() => go({ ...filters, ...resetOf(filters) })}>
              Reset filters
            </button>
          )
        }
      />
    );

  return (
    <GridSet value={setGrid}>
    <div className="screen-frame" data-grid={grid || undefined}>
      <Toolbar>
        <button type="button" className="toolbar-circle" aria-label="Share" onClick={() => void shareArtist(name)} data-testid="artist-share">
          <Share aria-hidden />
        </button>
        <GridToggle grid={grid} setGrid={setGrid} />
        <button type="button" className="toolbar-circle" aria-label="More" aria-haspopup="dialog" onClick={() => getNav().openSheet(MENU)} data-testid="artist-menu">
          <MoreHorizontal aria-hidden />
        </button>
      </Toolbar>
      <Hero name={name} info={info} isArtist={isArtist} visible={visible} />
      <ChipsRow filters={filters} chips={CHIPS} onChange={go} />
      <FeedBody feed={feed} grid={grid} route={route} empty={empty} onTag={onFeedTag} />
      <PlayFab feed={feed} route={route} />
      <FilterSheet sheet={sheet} filters={filters} apply={go} />
      {sheet === MENU && <ArtistMenu name={name} />}
      {postSheet(sheet) !== null && <PostMenu feed={feed} id={postSheet(sheet)!} />}
    </div>
    </GridSet>
  );
}

const resetOf = (f: Filters): Partial<Filters> => ({
  media: DEFAULT_SEARCH.media,
  order: "newest",
  date: { ...f.date, enabled: false },
  minScore: null,
  hideFaved: false,
});

// ---- the hero ---------------------------------------------------------------------

function Hero({ name, info, isArtist, visible }: { name: string; info: Info; isArtist: boolean; visible: boolean }) {
  const mark = useRef<HTMLSpanElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const tag = info.status === "ready" ? info.tag : null;
  const cat = tag && !isArtist ? (TAG_CATEGORIES[tag.category] ?? "general") : null;

  // the compact bar: once the hero's foot has gone under the top of the screen
  useEffect(() => {
    const el = end.current;
    if (!el || !visible || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      setAway(!e.isIntersecting && e.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const burst = () => {
    const m = mark.current?.querySelector<HTMLElement>(".mark");
    void motionFx().then((fx) => fx.followBurst(m, name, true));
    turnMark(m);
  };

  return (
    <>
      <CompactBar name={name} show={away && visible} isArtist={isArtist} />
      <div className="artist-hero" data-testid="artist-hero">
        <span ref={mark} className="hero-mark-box">
          {isArtist ? (
            <Avatar seed={name} className="hero-mark" />
          ) : (
            <span className="hero-tag" data-testid="artist-tag-mark">
              <Tag aria-hidden />
            </span>
          )}
        </span>
        <h1 tabIndex={-1} className="screen-title hero-title" data-long={label(name).length > 24 || undefined} style={cat ? { color: `var(--color-tag-${cat})` } : undefined}>
          {label(name)}
        </h1>
        <span className="hero-handle" data-testid="artist-handle">
          {tag?.name ?? name}
          {cat && ` · ${cat}`}
        </span>
        <Stats name={name} tag={tag} loading={info.status === "loading"} visible={visible} />
        <FollowButton name={name} tag={!isArtist} onFollowed={isArtist ? burst : undefined} />
        <div ref={end} />
      </div>
    </>
  );
}

function Stats({ name, tag, loading, visible }: { name: string; tag: TagInfo | null; loading: boolean; visible: boolean }) {
  const signedIn = useStore(getSession().store, (s) => !!s.creds && !!s.user && !s.link);
  const favs = useStore(getRec().store, (s) => s.profile?.tags[name]?.n ?? 0);
  const newest = useNewest(name);
  // "2h" counts from when the screen was last shown (it stays mounted while hidden)
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, [visible]);
  const wells: { key: string; icon: typeof Heart; value: string; label: string }[] = [];
  if (tag) wells.push({ key: "posts", icon: ImageIcon, value: compact(tag.post_count), label: tag.post_count === 1 ? "post" : "posts" });
  if (signedIn && favs > 0) wells.push({ key: "faved", icon: Heart, value: favs.toLocaleString("en-US"), label: "you faved" });
  if (newest) wells.push({ key: "last", icon: Clock, value: ago(newest, now), label: "last post" });
  // held (unread by screen readers) while e621's count comes, so the wells don't reflow when it lands
  const wait = !tag && loading;
  if (wells.length === 0 && !wait) return <div className="hero-stats hero-stats-wait" aria-hidden />;
  return (
    <dl className="hero-stats" data-testid="artist-stats">
      {wait && (
        <div className="hero-stat" aria-hidden>
          <span className="hero-stat-in">
            <b>
              <ImageIcon />
              {"\u2007"}
            </b>
            <small>posts</small>
          </span>
        </div>
      )}
      {wells.map((w) => (
        <div key={w.key} className="hero-stat" data-stat={w.key}>
          <dt className="sr-only">{w.label}</dt>
          <dd className="hero-stat-in">
            <b>
              <w.icon aria-hidden />
              {w.value}
            </b>
            <small aria-hidden>{w.label}</small>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Once the hero has gone, the top bar capsule: bare Back, the 24 mark, the name, and a Follow pill. */
function CompactBar({ name, show, isArtist }: { name: string; show: boolean; isArtist: boolean }) {
  return (
    <div className="compact-bar" data-show={show || undefined} inert={!show} data-testid="artist-compact">
      <div className="compact-in topcap">
        <button type="button" className="toolbar-circle compact-back" aria-label="Back" onClick={() => void getNav().back()}>
          <ChevronLeft aria-hidden />
        </button>
        {isArtist ? (
          <Avatar seed={name} className="compact-mark" />
        ) : (
          <span className="compact-mark hero-tag">
            <Tag aria-hidden />
          </span>
        )}
        <b>{label(name)}</b>
        <FollowPill name={name} always />
      </div>
    </div>
  );
}

// ---- ⋯ ------------------------------------------------------------------------------

function ArtistMenu({ name }: { name: string }) {
  const close = () => getNav().back();
  return (
    <Sheet
      title={label(name)}
      testId="sheet-artist-menu"
      pop
      head={
        <div className="sheet-ctx">
          <Avatar seed={name} className="post-avatar" />
          <span className="row-text">
            <b>{label(name)}</b>
            <small>{name}</small>
          </span>
        </div>
      }
    >
      <div className="well-group">
        <button
          type="button"
          className="well-row"
          onClick={() => {
            // write while the tap still counts as a user gesture (Safari), then close
            void copyText(`${location.origin}/artist/${encodeURIComponent(name)}`, "Link copied");
            void close();
          }}
          data-testid="artist-copy-link"
        >
          <Link2 aria-hidden />
          <span>Copy link</span>
        </button>
        <a className="well-row" href={artistPageUrl(name)} target="_blank" rel="noopener noreferrer" onClick={() => void close()} data-testid="artist-e621">
          <ExternalLink aria-hidden />
          <span>Open on e621</span>
          <small>e621.net</small>
        </a>
      </div>
    </Sheet>
  );
}
