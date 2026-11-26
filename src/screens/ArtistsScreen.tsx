"use client";

/**
 * The Artists tab (UX.md "Artists", DESIGN.md "Artists"): who you follow, when each last posted
 * and who has something new; and Suggested, the artists you favorite a lot and don't follow yet,
 * each as an artist card with three of their newest posts.
 */
import { ChevronDown, ChevronRight, ExternalLink, EyeOff, Heart, CircleMinus, MoreHorizontal, Search, Share } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ACTION_MS } from "@/shell/toastLook";
import Avatar from "@/components/Avatar";
import { Menu, MenuRow } from "@/components/Menu";
import { StateBlock } from "@/components/State";
import { TryAgain } from "@/components/StatePanels";
import { Field, Seg } from "@/components/v6";
import { FollowPill } from "@/feed/FollowPill";
import { artistPageUrl } from "@/lib/e621/client";
import type { Post } from "@/lib/e621/types";
import { ago, compact } from "@/lib/feed/format";
import { LIST_TOP } from "@/lib/recommend/artists";
import { getNav } from "@/nav/history";
import { useScreen } from "@/shell/context";
import { Sheet } from "@/shell/Sheet";
import { getArtistList } from "@/state/artistList";
import { getArtists } from "@/state/artists";
import { FOLLOW_LIMIT, getFollows } from "@/state/follows";
import { getFollowing } from "@/state/following";
import { getRec } from "@/state/rec";
import { getSession } from "@/state/session";
import { shallow, useStore } from "@/state/store";
import { openArtist, shareArtist } from "./actions";
import { NeedsSignIn } from "./feedParts";
import { Pick, Reading } from "./FirstRun";

const PullToRefresh = lazy(() => import("@/feed/PullToRefresh").then((m) => ({ default: m.PullToRefresh })));

type Tab = "following" | "suggested";
type Sort = "recent" | "az" | "faved";
const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "az", label: "A–Z" },
  { value: "faved", label: "Most faved" },
];

const label = (n: string) => n.replaceAll("_", " ");
const search = () => getNav().push({ screen: { kind: "search" }, play: null }, { from: "artists" });

export function ArtistsScreen() {
  const { sheet } = useScreen();
  const session = useStore(getSession().store, (s) => ({ ready: s.ready, signedIn: !!s.creds && !!s.user && !s.link }), shallow);
  const follows = useStore(getFollows().store, (s) => ({ user: s.user, status: s.status, n: s.followed.size }), shallow);
  const [tab, setTab] = useState<Tab>("following");
  const [sort, setSort] = useState<Sort>("recent");

  // again when the account arrives (a sign-in confirmed after mount)
  useEffect(() => {
    if (follows.user && follows.status === "idle") void getFollows().ensure();
  }, [follows.user, follows.status]);

  return (
    <div className="screen-frame" data-testid="artists-screen">
      <div className="title-row">
        <h1 tabIndex={-1} className="screen-title">
          Artists
        </h1>
        <div className="tools">
          <button type="button" className="toolbar-circle tool-search" aria-label="Search" onClick={search}>
            <Search aria-hidden />
          </button>
        </div>
      </div>
      {!session.ready ? (
        <div className="feed-list" data-testid="feed-waiting" />
      ) : !session.signedIn ? (
        <NeedsSignIn head="Your artists live here" text="Sign in to follow artists and see who posted." />
      ) : (
        <>
          <Seg
            big
            label="Which artists"
            className="artists-seg"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: "following",
                label: (
                  <>
                    Following{follows.status === "ready" && <> <small className="seg-count">{follows.n}</small></>}
                  </>
                ),
              },
              { value: "suggested", label: "Suggested" },
            ]}
            testId="artists-seg"
          />
          {tab === "following" ? <FollowingList sort={sort} /> : <Suggested />}
        </>
      )}
      {sheet === "artist-sort" && <SortSheet sort={sort} setSort={setSort} />}
      {sheet?.startsWith("artist:") && <ArtistSheet name={sheet.slice(7)} followed />}
      {sheet?.startsWith("sugg:") && <ArtistSheet name={sheet.slice(5)} followed={false} />}
      {sheet === "follow-favs" && <FollowFavsSheet />}
    </div>
  );
}

// ---- Following ----------------------------------------------------------------

interface Row {
  name: string;
  at: number | null;
  fresh: boolean;
  favs: number;
}

/** "posted 2h ago · you faved 48" */
function rowLine(r: Row, now: number): string {
  const when = r.at ? `posted ${ago(new Date(r.at).toISOString(), now)} ago` : "posted a while ago";
  return r.favs > 0 ? `${when} · you faved ${r.favs}` : when;
}

export function sortRows(rows: Row[], sort: Sort): Row[] {
  const az = (a: Row, b: Row) => a.name.localeCompare(b.name);
  const out = [...rows];
  if (sort === "az") return out.sort(az);
  if (sort === "faved") return out.sort((a, b) => b.favs - a.favs || az(a, b));
  // Recent: dated ones newest first, then the rest A–Z
  return out.sort((a, b) => (a.at === null ? (b.at === null ? az(a, b) : 1) : b.at === null ? -1 : b.at - a.at || az(a, b)));
}

function FollowingList({ sort }: { sort: Sort }) {
  const { visible, sheet, play } = useScreen();
  const follows = getFollows();
  const f = useStore(follows.store, (s) => ({ status: s.status, followed: s.followed }), shallow);
  const list = getArtistList();
  const l = useStore(list.store, (s) => s);
  const following = getFollowing();
  const fl = useStore(following.store, (s) => ({ user: s.user, status: s.status, threshold: s.threshold }), shallow);
  const threshold = fl.threshold;
  const profile = useStore(getRec().store, (s) => s.profile);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (visible) void list.ensure();
  }, [visible, list]);
  // New uses Following's threshold, read once a session (opening Artists first reads it too)
  useEffect(() => {
    if (fl.user && fl.status === "idle") void following.load();
  }, [fl.user, fl.status, following]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase().replaceAll(" ", "_");
    const out: Row[] = [];
    for (const name of f.followed) {
      if (q && !name.includes(q)) continue;
      const n = l.newest.get(name);
      out.push({
        name,
        at: n?.at || null,
        fresh: !!n && threshold !== null && n.id > threshold && !l.opened.has(name),
        favs: profile?.tags[name]?.n ?? 0,
      });
    }
    return sortRows(out, sort);
  }, [f.followed, l.newest, l.opened, threshold, profile, filter, sort]);

  const pull = () => Promise.all([follows.ensure("user", true), list.ensure(true)]);

  if (f.status === "error")
    return (
      <div className="state-panel" role="alert" data-testid="artists-error">
        <StateBlock mood="oops" size={96} head="Couldn't read who you follow" text="e621 didn't answer." actions={<TryAgain onClick={() => void follows.ensure("user", true)} testId="state-retry" />} />
      </div>
    );
  if (f.status !== "ready") return <div className="feed-list" data-testid="feed-waiting" />;
  if (f.followed.size === 0)
    return (
      <StateBlock
        mood="snooze"
        head="You don't follow anyone yet"
        text="Suggested has artists you favorite a lot."
        testId="artists-none"
      />
    );

  // "posted 2h ago" as of the read (stable across renders; the read is at most 10 min old)
  const now = l.readAt;
  return (
    <>
      <Suspense fallback={null}>
        <PullToRefresh enabled={visible && !sheet && !play} onRefresh={pull} />
      </Suspense>
      <div className="artists-tools">
        <Field
          icon={<Search aria-hidden />}
          value={filter}
          onChange={setFilter}
          placeholder="Filter your artists"
          aria-label="Filter your artists"
          enterKeyHint="search"
          data-testid="artists-filter"
        />
        <button type="button" className="chip" data-on={sort !== "recent" || undefined} aria-haspopup="dialog" onClick={() => getNav().openSheet("artist-sort")} data-testid="artists-sort">
          <span>{SORTS.find((s) => s.value === sort)!.label}</span>
          <ChevronDown aria-hidden />
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="list-foot" data-testid="artists-no-match">
          No artist you follow matches &ldquo;{filter.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="list-group" data-testid="artists-list">
          {rows.map((r) => (
            <li key={r.name} className="list-row artist-row" data-testid="artist-row" data-artist={r.name}>
              <button
                type="button"
                className="artist-row-open"
                onClick={() => {
                  list.opened(r.name);
                  openArtist(r.name);
                }}
              >
                <Avatar seed={r.name} className="row-mark" fresh={r.fresh} />
                <span className="row-text">
                  <b>{label(r.name)}</b>
                  <small>{rowLine(r, now)}</small>
                </span>
              </button>
              <button type="button" className="row-more" aria-label={`More for ${label(r.name)}`} aria-haspopup="dialog" onClick={() => getNav().openSheet(`artist:${r.name}`)} data-testid="artist-more">
                <MoreHorizontal aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="list-foot" data-testid="artists-count">
        {filter.trim() ? `${rows.length} of ${f.followed.size}` : `${f.followed.size} of ${FOLLOW_LIMIT} follows`}
      </p>
    </>
  );
}

function SortSheet({ sort, setSort }: { sort: Sort; setSort: (s: Sort) => void }) {
  return (
    <Sheet title="Sort" testId="sheet-artist-sort">
      <Menu label="Sort">
        {SORTS.map((s) => (
          <MenuRow
            key={s.value}
            on={s.value === sort}
            onPick={() => {
              setSort(s.value);
              void getNav().back();
            }}
            testId={`sort-${s.value}`}
          >
            {s.label}
          </MenuRow>
        ))}
      </Menu>
    </Sheet>
  );
}

/**
 * ⋯ on an artist (DESIGN.md "the row menus"): a followed one offers Share artist, Open on e621 and
 * Unfollow (not Danger: it has Undo); a suggestion offers Not interested and Open on e621.
 */
function ArtistSheet({ name, followed }: { name: string; followed: boolean }) {
  const close = () => getNav().back();
  const onE621 = (
    <a className="well-row" href={artistPageUrl(name)} target="_blank" rel="noopener noreferrer" onClick={() => void close()} data-testid="artist-e621">
      <ExternalLink aria-hidden />
      <span>Open on e621</span>
      <small>e621.net</small>
    </a>
  );
  return (
    <Sheet
      title={label(name)}
      testId="sheet-artist"
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
        {followed ? (
          <>
            <button type="button" className="well-row" onClick={() => void shareArtist(name)} data-testid="artist-share">
              <Share aria-hidden />
              <span>Share artist</span>
            </button>
            {onE621}
            <button
              type="button"
              className="well-row"
              onClick={async () => {
                await close();
                getFollows().setFollowed(name, false);
              }}
              data-testid="artist-unfollow"
            >
              <CircleMinus aria-hidden />
              <span>Unfollow</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="well-row"
              onClick={async () => {
                await close();
                getArtists().hide(name);
                toast("Hidden from suggestions", { id: `hide:${name}`, icon: <Avatar seed={name} />, duration: ACTION_MS, action: { label: "Undo", onClick: () => getArtists().unhide(name) } });
              }}
              data-testid="artist-hide"
            >
              <EyeOff aria-hidden />
              <span>Not interested</span>
            </button>
            {onE621}
          </>
        )}
      </div>
    </Sheet>
  );
}

// ---- Suggested ----------------------------------------------------------------

function Suggested() {
  const artists = getArtists();
  const a = useStore(artists.store, (s) => s);
  const followed = useStore(getFollows().store, (s) => s.followed);
  /** followed from a card here: the card stays, showing ✓ Following, until you leave */
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    artists.ensure();
  }, [artists, a.user]);

  if (a.status === "error")
    return (
      <div className="state-panel" role="alert" data-testid="suggested-error">
        <StateBlock mood="oops" size={96} head="Couldn't read your favorites" text="e621 didn't answer. Nothing was changed." actions={<TryAgain onClick={() => artists.ensure(true)} testId="state-retry" />} />
      </div>
    );
  if (a.status !== "ready") return <Reading a={a} />;
  const shown = a.all.filter((c) => !followed.has(c.name) || kept.has(c.name));
  if (shown.length === 0)
    return (
      <StateBlock
        mood="look"
        head={a.all.length === 0 ? "Not enough favorites yet" : "No one new to suggest"}
        text={
          a.all.length === 0
            ? "Suggestions come from the artists you favorite. Favorite a few more posts, or look for artists yourself."
            : "You follow every artist you favorite a lot. Favorite more and check back."
        }
        actions={
          <button type="button" className="btn-tonal" onClick={search}>
            <Search aria-hidden className="state-icon" />
            Search
          </button>
        }
        testId="suggested-none"
      />
    );

  return (
    <>
      {a.list.length >= 3 && (
        <div className="list-group artists-banner">
          <button type="button" className="list-row" aria-haspopup="dialog" onClick={() => getNav().openSheet("follow-favs")} data-testid="follow-favs">
            <span className="row-well" data-tone="pink" aria-hidden>
              <Heart />
            </span>
            <span className="row-text">
              <b>Follow from your favorites</b>
              <small>{Math.min(a.list.length, LIST_TOP)} artists you favorite a lot</small>
            </span>
            <ChevronRight aria-hidden className="row-chev" />
          </button>
        </div>
      )}
      <div className="sugg-list" data-testid="suggested-list">
        {shown.map((c) => (
          <SuggestionCard key={c.name} c={c} tiles={a.tiles.get(c.name) ?? []} onFollowed={() => setKept((k) => new Set([...k, c.name]))} />
        ))}
      </div>
    </>
  );
}

function SuggestionCard({
  c,
  tiles,
  onFollowed,
}: {
  c: { name: string; favs: number; posts: number };
  tiles: Post[];
  onFollowed: () => void;
}) {
  const open = () => openArtist(c.name);
  // DESIGN.md's artist card line; when they last posted is on their page
  const of = c.posts > 0 ? ` of ${compact(c.posts)}` : "";
  return (
    <article className="sugg-card" data-testid="sugg-card" data-artist={c.name} aria-label={label(c.name)}>
      <button type="button" className="sugg-tiles" onClick={open} aria-label={`Open ${label(c.name)}`} tabIndex={-1}>
        {[0, 1, 2].map((i) => {
          const p = tiles[i];
          const src = p ? (p.files.preview.jpg ?? p.files.sample.jpg) : null;
          return (
            <span key={i} className="sugg-tile">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails */}
              {src && <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />}
            </span>
          );
        })}
      </button>
      <div className="sugg-head">
        <button type="button" className="sugg-who" onClick={open}>
          <Avatar seed={c.name} className="post-avatar" />
          <span className="row-text">
            <b>{label(c.name)}</b>
            <small>
              You faved {c.favs}
              {of}
            </small>
          </span>
        </button>
        <FollowPill name={c.name} onFollowed={onFollowed} />
        <button type="button" className="row-more" aria-label={`More for ${label(c.name)}`} aria-haspopup="dialog" onClick={() => getNav().openSheet(`sugg:${c.name}`)} data-testid="sugg-more">
          <MoreHorizontal aria-hidden />
        </button>
      </div>
    </article>
  );
}

/** Follow from favorites as a sheet (DESIGN.md "Not drawn yet": the first run's list, in the app's sheet). */
function FollowFavsSheet() {
  const s = useStore(getArtists().store, (x) => ({ status: x.status, list: x.list }), shallow);
  // the list as it was when the sheet opened: following from it mustn't reshuffle it
  const [snap] = useState(() => s.list.slice(0, LIST_TOP));
  // opened from history before the list is read (a reload): nothing to pick, so close it
  const empty = s.status !== "ready" || snap.length === 0;
  useEffect(() => {
    if (empty) void getNav().back();
  }, [empty]);
  return empty ? null : <Pick list={snap} inSheet />;
}
