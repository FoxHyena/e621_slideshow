"use client";

/**
 * `/post/<number>` (DESIGN.md "A post on its own", the post page): a pushed screen that works signed
 * out. The pushed header with Back and the tools (Share, ⋯); the post panel as in a feed, without
 * its tag row; one panel with the description and every tag by kind (the Post info sheet's labels),
 * then the file line; a group with Source and Open on e621; "More from <artist>" with six tiles.
 * The tab bar stays; there is no Play. On a wide computer the post keeps the 600 column and the rest
 * stands in a 344 column 24 to its right. Rides in the artist page's chunk (src/shell/lazy.ts).
 */
import { askPost, hasKnownPost, knownPost } from "@/feed/postCache";
import { revealed } from "@/feed/revealed";
import { DText } from "@/lib/e621/dtext";
import { ArrowUp, Ban, ChevronRight, ExternalLink, Heart, Link2, Lock, MoreHorizontal, Search, Share } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";
import { InlineLoader } from "@/components/Loader";
import { StateBlock } from "@/components/State";
import { tagTargets, useTagHold, type TagAction } from "@/components/TagActions";
import TagActionsOverlay from "@/components/TagTargets";
import { PostCard } from "@/feed/PostCard";
import { postPageUrl, searchPosts } from "@/lib/e621/client";
import { TAG_CATEGORY_COLORS, type Post } from "@/lib/e621/types";
import { ago, artists, compact } from "@/lib/feed/format";
import { mediaHeight, tallCap } from "@/lib/feed/layout";
import { blacklistedBy, parseBlacklist } from "@/lib/query/blacklist";
import { getNav } from "@/nav/history";
import { fileSize, KINDS } from "@/player/sheets";
import { useScreen } from "@/shell/context";
import { RAIL_QUERY } from "@/shell/rail";
import { blacklistOf, getPrefs } from "@/state/prefs";
import { getRec } from "@/state/rec";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { blacklistLine, openArtist, openResults, openSignIn, sharePost } from "./actions";
import { PostMenu, Toolbar } from "./feedParts";
import { ComicGroup } from "@/feed/comics";

const MORE_SHOWN = 6;
const label = (t: string) => t.replaceAll("_", " ");

type Found = { status: "loading" } | { status: "ready"; post: Post } | { status: "missing" } | { status: "error"; message: string };

/** One answer per post a visit (src/feed/postCache.ts): Back and forward don't ask again. */
function usePost(id: number): [Found, () => void] {
  const creds = useStore(getSession().store, (s) => s.creds);
  const ready = useStore(getSession().store, (s) => s.ready);
  const user = creds?.username;
  const key = `${user ?? ""}:${id}`;
  const [found, setFound] = useState<{ key: string; f: Found } | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (!ready) return;
    if (hasKnownPost(user, id)) return;
    let live = true;
    askPost(user, id, () => searchPosts(`id:${id}`, 1, 1, creds))
      .then((p) => {
        if (live) setFound({ key, f: p ? { status: "ready", post: p } : { status: "missing" } });
      })
      .catch((e: unknown) => live && setFound({ key, f: { status: "error", message: e instanceof Error ? e.message : "e621 didn't answer." } }));
    return () => {
      live = false;
    };
  }, [key, user, id, creds, ready, tries]);
  if (hasKnownPost(user, id)) {
    const p = knownPost(user, id);
    return [p ? { status: "ready", post: p } : { status: "missing" }, () => {}];
  }
  return [
    found?.key === key ? found.f : { status: "loading" },
    // Try again shows the loader while it asks (a review, 2026-11-27: it looked like nothing happened)
    () => {
      setFound(null);
      setTries((t) => t + 1);
    },
  ];
}

/** A source's site, for the Source row ("bsky.app"); only web links count. */
function sourceOf(post: Post): { url: string; site: string } | null {
  for (const s of post.sources ?? []) {
    try {
      const u = new URL(s);
      if (u.protocol === "https:" || u.protocol === "http:") return { url: u.href, site: u.hostname.replace(/^www\./, "") };
    } catch {
      // not a link (e621 allows plain text sources)
    }
  }
  return null;
}

/** The column the panel stands in, and the picture's cap on a computer. */
function useColumn(ref: React.RefObject<HTMLElement | null>): { width: number; cap: number } {
  const [col, setCol] = useState({ width: 0, cap: Infinity });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCol({ width: el.clientWidth, cap: tallCap(matchMedia(RAIL_QUERY).matches, innerHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return col;
}

export function PostScreen({ id }: { id: number }) {
  const { sheet } = useScreen();
  const [found, retry] = usePost(id);
  const post = found.status === "ready" ? found.post : null;
  const menu = sheet === `post:${id}`;

  return (
    <div className="screen-frame post-page" data-testid="post-page" data-post-id={id}>
      <Toolbar>
        {post && (
          <button type="button" className="toolbar-circle" aria-label="Share post" onClick={() => void sharePost(post)} data-testid="post-share">
            <Share aria-hidden />
          </button>
        )}
        {post && (
          <button data-pop-end type="button" className="toolbar-circle" aria-label="More" aria-haspopup="dialog" onClick={() => getNav().openSheet(`post:${id}`)} data-testid="post-more">
            <MoreHorizontal aria-hidden />
          </button>
        )}
      </Toolbar>
      {found.status === "loading" && (
        <div className="post-page-wait">
          <InlineLoader label={`Finding post #${id}`} />
        </div>
      )}
      {found.status === "missing" && (
        <StateBlock
          mood="look"
          screen
          head={`No post #${id} on e621`}
          text="It was deleted, or the link is wrong."
          testId="post-missing"
          actions={
            <button type="button" className="btn-tonal" onClick={() => getNav().push({ screen: { kind: "search" }, play: null })}>
              <Search aria-hidden className="state-icon" />
              Search
            </button>
          }
        />
      )}
      {found.status === "error" && (
        <StateBlock
          mood="oops"
          screen
          head="Couldn't load the post"
          text={found.message}
          testId="post-error"
          actions={
            <button type="button" className="btn-tonal" onClick={retry}>
              Try again
            </button>
          }
        />
      )}
      {post && <PostBody post={post} />}
      {menu && post && <PostMenu feed={null} id={id} post={post} page />}
    </div>
  );
}

function PostBody({ post }: { post: Post }) {
  const signedIn = useStore(getSession().store, (s) => !!s.creds);
  const username = useStore(getSession().store, (s) => s.user?.name);
  const blacklist = useStore(getPrefs().store, blacklistOf);
  const matched = useMemo(() => blacklistedBy(parseBlacklist(blacklist), post, { username }), [blacklist, post, username]);
  const [shown, setShown] = useState(() => revealed.has(post.id));
  const hiddenByE621 = !post.files.original.url;
  const col = useRef<HTMLDivElement>(null);
  const { width, cap } = useColumn(col);
  const [now] = useState(() => Date.now());
  const reduced = useMemo(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const act = (tag: string, action: TagAction) => {
    if (action === "blacklist") return blacklistLine(tag);
    if (action === "pin") {
      getRec().togglePin(tag);
      return void toast(`Pinned ${label(tag)}`);
    }
    if (action === "open") openArtist(tag);
    else openResults(tag);
  };
  const hold = useTagHold(act);

  const gate =
    hiddenByE621 ? (
      <Gate post={post} now={now} icon={<Lock aria-hidden />} head="Sign in to see this post" text={signedIn ? "e621 didn't send this post's picture." : "e621 hides it from signed-out visitors."}>
        {!signedIn && (
          <button type="button" className="btn-tonal" onClick={openSignIn} data-testid="post-gate-sign-in">
            Sign in
          </button>
        )}
      </Gate>
    ) : matched && !shown ? (
      <Gate post={post} now={now} icon={<Ban aria-hidden />} head="On your blacklist" text={`It matches “${matched.line}” in your blacklist.`}>
        <button type="button" className="btn-tonal" onClick={() => {
            revealed.add(post.id);
            setShown(true);
          }} data-testid="post-show-it">
          Show it
        </button>
      </Gate>
    ) : null;

  return (
    <div className="post-page-cols">
      <div ref={col} className="post-page-main">
        {gate ??
          (width > 0 && (
            <PostCard
              post={post}
              index={0}
              mediaHeight={mediaHeight(post, width, cap)}
              live
              still={reduced}
              now={now}
              hold={hold}
              tagless
              onOpen={(p) => getNav().push({ screen: { kind: "post", id: p.id }, play: null, view: String(p.id) })}
              onMenu={() => getNav().openSheet(`post:${post.id}`)}
            />
          ))}
      </div>
      <div className="post-page-side">
        <ComicGroup post={post} />
        <TagsPanel post={post} hold={hold} />
        <Links post={post} />
        <MoreFrom post={post} />
      </div>
      <TagActionsOverlay hold={hold} recommended={false} onAction={act} targets={tagTargets(false, true)} />
    </div>
  );
}

/** The feed's gate in the picture's place: why it can't be shown, and a way past when there is one. */
function Gate({ post, now, icon, head, text, children }: { post: Post; now: number; icon: React.ReactNode; head: string; text: string; children?: React.ReactNode }) {
  const by = artists(post)[0];
  return (
    <article className="post post-gated" aria-label={`Post ${post.id}${by ? ` by ${label(by)}` : ""}`} data-testid="post-gate">
      <header className="post-head">
        <div className="post-who">
          <Avatar seed={by ?? `post:${post.id}`} className="post-avatar" />
          <div className="post-idn">
            <span className="post-name">
              <span>{by ? label(by) : "unknown artist"}</span>
            </span>
            <span className="post-when">
              {ago(post.created_at, now)} · <span className="post-id">#{post.id}</span>
            </span>
          </div>
        </div>
      </header>
      <div className="post-gate">
        {icon}
        <b>{head}</b>
        <small>{text}</small>
        {children}
      </div>
    </article>
  );
}

/** "Description" and every tag by kind, under the Post info sheet's labels; then the file line. */
function TagsPanel({ post, hold }: { post: Post; hold: ReturnType<typeof useTagHold> }) {
  const text = post.description?.trim() ?? "";
  const f = post.files;
  return (
    <section className="post-info-panel" aria-label="About this post" data-testid="post-info">
      {text && (
        <>
          <h3 className="info-label">Description</h3>
          {/* e621's DText with its formatting (src/lib/e621/dtext.tsx) */}
          <div className="post-desc" data-testid="post-desc">
            <DText text={text} onPost={(id) => getNav().push({ screen: { kind: "post", id }, play: null })} />
          </div>
        </>
      )}
      {KINDS.map(([c, name]) => {
        const tags = c === "artist" ? artists(post) : (post.tags[c] ?? []);
        if (!tags.length) return null;
        return (
          <section key={c} className="info-kind" aria-label={name}>
            <h3 className="info-label">
              {name}
              <span>{tags.length}</span>
            </h3>
            <div className="info-tags">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="post-tag"
                  style={{ color: `var(--color-tag-${c}, ${TAG_CATEGORY_COLORS[c]})` }}
                  data-picked={hold.held?.tag === t || undefined}
                  onPointerDown={(e) => hold.onPointerDown(e, t, c)}
                  onClick={(e) => hold.onClick(e, t, c)}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-haspopup="dialog"
                  data-testid="post-tag"
                  data-tag={t}
                >
                  {label(t)}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {f.original.width > 0 && (
        <p className="post-file">
          {f.original.width} × {f.original.height} · {f.meta.ext.toUpperCase()} · {fileSize(f.meta.size)}
        </p>
      )}
    </section>
  );
}

/** Source (its site) and Open on e621. */
function Links({ post }: { post: Post }) {
  const src = sourceOf(post);
  return (
    <div className="list-group post-links">
      {src && (
        <a className="list-row" href={src.url} target="_blank" rel="noopener noreferrer nofollow" data-testid="post-source">
          <span className="row-well" aria-hidden>
            <Link2 />
          </span>
          <span className="row-text">
            <b>Source</b>
            <small>{src.site}</small>
          </span>
          <ExternalLink aria-hidden className="row-chev row-ext" />
        </a>
      )}
      <a className="list-row" href={postPageUrl(post.id)} target="_blank" rel="noopener" data-testid="post-e621">
        <span className="row-well" aria-hidden>
          <ExternalLink />
        </span>
        <span className="row-text">
          <b>Open on e621</b>
          <small>Post #{post.id}</small>
        </span>
        <ChevronRight aria-hidden className="row-chev" />
      </a>
    </div>
  );
}

/** "More from <artist>": six of their other posts as tiles; See all opens their page. */
/** The ratings you have on, as e621 search words ("" with all three on), as a feed asks them. */
function ratingWords(r: { s: boolean; q: boolean; e: boolean }): string {
  const on = (["s", "q", "e"] as const).filter((k) => r[k]);
  if (on.length === 1) return `rating:${on[0]}`;
  if (on.length === 2) return `-rating:${(["s", "q", "e"] as const).find((k) => !r[k])}`;
  return "";
}

/** Asked of e621 for More from: room for the blacklist to take some and still fill six. */
const MORE_ASKED = 24;

function MoreFrom({ post }: { post: Post }) {
  const by = artists(post)[0];
  const creds = useStore(getSession().store, (s) => s.creds);
  const username = useStore(getSession().store, (s) => s.user?.name);
  // Like every feed: only the ratings you have on, and nothing on your blacklist (a review, 2026-11-27)
  const rating = useStore(getPrefs().store, (s) => ratingWords(s.search.ratings));
  const blacklist = useStore(getPrefs().store, blacklistOf);
  const [more, setMore] = useState<{ id: number; posts: Post[] } | null>(null);
  useEffect(() => {
    if (!by) return;
    let live = true;
    const rules = parseBlacklist(blacklist);
    searchPosts(`${by} -id:${post.id} ${rating}`.trim(), 1, MORE_ASKED, creds)
      .then(
        (ps) =>
          live &&
          setMore({
            id: post.id,
            posts: ps.filter((p) => p.id !== post.id && (p.files.preview.jpg || p.files.sample.jpg) && !blacklistedBy(rules, p, { username })).slice(0, MORE_SHOWN),
          }),
      )
      .catch(() => live && setMore({ id: post.id, posts: [] }));
    return () => {
      live = false;
    };
  }, [by, post.id, creds, rating, blacklist, username]);
  if (!by) return null;
  const posts = more?.id === post.id ? more.posts : null;
  if (posts && posts.length === 0) return null;
  return (
    <section className="post-more" aria-label={`More from ${label(by)}`} data-testid="post-more-from">
      <div className="post-more-head">
        <h2>More from {label(by)}</h2>
        <button type="button" className="link-row" onClick={() => openArtist(by)} data-testid="post-see-all">
          See all
          <ChevronRight aria-hidden />
        </button>
      </div>
      <div className="post-more-grid">
        {(posts ?? Array.from({ length: MORE_SHOWN }, () => null)).map((p, i) =>
          p ? (
            <button
              key={p.id}
              type="button"
              className="post-more-tile"
              aria-label={`Post ${p.id}, score ${p.stats.score.total}`}
              onClick={() => getNav().push({ screen: { kind: "post", id: p.id }, play: null })}
              data-testid="post-more-tile"
              data-post-id={p.id}
            >
              <span className="tile-art">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails */}
                <img src={(p.files.preview.jpg ?? p.files.sample.jpg)!} alt="" loading="lazy" decoding="async" draggable={false} />
              </span>
              <span className="tile-nums" aria-hidden>
                <span className="tile-up">
                  <ArrowUp />
                  {compact(p.stats.score.total)}
                </span>
                <span className="tile-favs">
                  <Heart />
                  {compact(p.stats.fav_count)}
                </span>
              </span>
            </button>
          ) : (
            <span key={i} className="post-more-tile sk-tile" aria-hidden />
          ),
        )}
      </div>
    </section>
  );
}
