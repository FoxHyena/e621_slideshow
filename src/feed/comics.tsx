"use client";

/**
 * Comics (DESIGN.md "A post on its own", "A comic"): an e621 pool of the "series" kind, its pages in
 * the pool's order. A post that is a page says so on its card (a "3 / 12" well), in the picture
 * viewer (the comic bar, the count, sideways drags, the Pages sheet) and on the post page (a group
 * with a strip of the pages). "Open comic" opens the comic's own page (src/screens/ComicPage.tsx);
 * Results for `pool:<id>` still list it in page order.
 *
 * Not in the feed's first load: the card's well comes in with the post page's chunk
 * (src/shell/lazy.ts), and the viewer and Results bring this module with them.
 */
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/shell/Sheet";
import { getPools, searchPosts, type Credentials } from "@/lib/e621/client";
import type { Pool, Post } from "@/lib/e621/types";
import { ago, artists } from "@/lib/feed/format";
import { blacklistedBy, parseBlacklist, type BlacklistRule } from "@/lib/query/blacklist";
import { ID_BATCH, IdListQueue } from "@/lib/recommend/restore";
import type { SearchSettings } from "@/lib/settings";
import { revealed } from "@/feed/revealed";
import { onAccountLeft, rememberPosts } from "@/feed/postCache";
import { getNav } from "@/nav/history";
import { useShownFeed } from "@/screens/feedParts";
import { blacklistOf, getPrefs } from "@/state/prefs";
import { getFeeds, type Feed } from "@/state/feeds";
import { getSession } from "@/state/session";
import { createStore, useStore } from "@/state/store";

/** The pages glyph (the mock's "frames": a page with one behind it), at 2.2 stroke like the player's glass. */
function Pages(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="7" width="14" height="14" rx="3" />
      <path d="M7 3h11a3 3 0 0 1 3 3v11" />
    </svg>
  );
}

// ---- pools ---------------------------------------------------------------------

/** Pools asked of e621 this visit: a pool, or null when e621 has none by that number. */
const pools = new Map<number, Pool | null>();
/** Bumped when an answer comes in, so whatever is waiting on one shows it. */
const answered = createStore(0);
let wanted = new Set<number>();
let timer: ReturnType<typeof setTimeout> | undefined;
/** When a failed ask may go again, by pool: a failure doesn't re-render, so it can't loop. */
const failedUntil = new Map<number, number>();
/** How long a failed ask (offline, e621 busy) waits before it may go again. */
const RETRY_MS = 30_000;

/** Ask for a pool; the asks of one render go to e621 together (up to 100 a request). */
function want(id: number, creds: Credentials | null) {
  if (pools.has(id) || wanted.has(id) || Date.now() < (failedUntil.get(id) ?? 0)) return;
  wanted.add(id);
  timer ??= setTimeout(() => {
    const ids = [...wanted];
    wanted = new Set();
    timer = undefined;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      getPools(batch, creds, "bg")
        .then((got) => {
          for (const id of batch) pools.set(id, got.find((p) => p.id === id) ?? null);
          answered.set((n) => n + 1);
        })
        .catch(() => {
          for (const id of batch) failedUntil.set(id, Date.now() + RETRY_MS);
        });
    }
  }, 0);
}

/** One pool by number, asked for if need be (Results' `pool:<id>`). */
export function fetchPool(id: number, creds: Credentials | null): Promise<Pool | null> {
  const known = pools.get(id);
  if (known !== undefined) return Promise.resolve(known);
  return getPools([id], creds).then((got) => {
    const p = got.find((x) => x.id === id) ?? null;
    pools.set(id, p);
    answered.set((n) => n + 1);
    return p;
  });
}

export interface Comic {
  pool: Pool;
  /** the name as e621 shows it */
  name: string;
  /** this post's page, from 1 */
  page: number;
  total: number;
}

/** A page's post: null when e621 didn't send it (deleted, or hidden from you), undefined while not known. */
export type Page = Post | null | undefined;

const nameOf = (p: Pool) => p.name.replaceAll("_", " ");

/** The pool by number, once e621 has answered (undefined until then, null when it has none). */
export function usePool(id: number | null): Pool | null | undefined {
  const creds = useStore(getSession().store, (s) => s.creds);
  useStore(answered, (n) => n);
  useEffect(() => {
    if (id !== null) want(id, creds);
  }, [id, creds]);
  return id === null ? undefined : pools.get(id);
}

/** A comic as the reader or its page holds it: this pool, on the page with this post (page 1 if none). */
export function comicOf(pool: Pool, page: number | null): Comic {
  const at = page === null ? -1 : pool.post_ids.indexOf(page);
  return { pool, name: nameOf(pool), page: Math.max(0, at) + 1, total: pool.post_ids.length };
}

/**
 * The comic a post is a page of: its first "series" pool that lists it (a collection isn't a comic),
 * or `pool` itself when the reader names it.
 */
export function useComic(post: Post | null, pool: number | null = null): Comic | null {
  const creds = useStore(getSession().store, (s) => s.creds);
  useStore(answered, (n) => n);
  const ids = pool !== null ? [pool] : (post?.pools ?? []);
  const asked = ids.join(",");
  useEffect(() => {
    for (const id of ids) want(id, creds);
  }, [asked, creds]); // eslint-disable-line react-hooks/exhaustive-deps -- `ids` is `asked`
  for (const id of ids) {
    const p = pools.get(id);
    if (!p || (p.category !== "series" && pool === null) || !post) continue;
    const at = p.post_ids.indexOf(post.id);
    if (at >= 0) return { pool: p, name: nameOf(p), page: at + 1, total: p.post_ids.length };
  }
  return null;
}

// ---- where you stopped ------------------------------------------------------------

/**
 * The last page each comic had open in the reader or the viewer, by pool: this device's, not the
 * account's (DESIGN.md "Comics, part two", Where you stopped). Kept in localStorage here rather than
 * in src/lib/storage.ts, which rides in the first load.
 */
const PLACES_KEY = "e6ss:v1:comicPlaces";
/** Comics kept at most; the longest unread go first. */
const PLACES_MAX = 200;
function loadPlaces(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(PLACES_KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
const places = createStore<Record<string, number> | null>(null);
const allPlaces = () => places.get() ?? (places.set(loadPlaces()), places.get()!);

/** The post you stopped on in this comic, or null. */
export function usePlace(pool: number | null): number | null {
  const all = useStore(places, (p) => p);
  if (pool === null) return null;
  // read, not kept, while rendering: a store set here would update other components mid-render
  const v = (all ?? loadPlaces())[pool];
  return typeof v === "number" ? v : null;
}

/** Keep the page open now as where you stopped in this comic. */
export function setPlace(pool: number, page: number) {
  const all = allPlaces();
  if (all[pool] === page) return;
  // newest last: the oldest go first past the cap
  const rest = Object.entries(all).filter(([k]) => k !== String(pool));
  const next = Object.fromEntries([...rest.slice(Math.max(0, rest.length - PLACES_MAX + 1)), [String(pool), page]]);
  places.set(next);
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(next));
  } catch {
    // full or off: kept for this visit
  }
}

// ---- pages ----------------------------------------------------------------------

/** A comic's pages this visit, by pool and whose sign-in asked: in page order, null for one e621 didn't send. */
const pages = new Map<string, Page[]>();
/** Comics whose last ask failed, all or in part: when the next may go. */
const pagesRetry = new Map<string, number>();
/** Bumped when an account's sign-in ends: pages asked before then aren't kept. */
let pagesEra = 0;
onAccountLeft((name) => {
  pagesEra++;
  for (const k of [...pages.keys(), ...pagesRetry.keys()]) {
    if (k.startsWith(`${name}:`)) {
      pages.delete(k);
      pagesRetry.delete(k);
    }
  }
});
const pagesAnswered = createStore(0);
const asking = new Set<string>();
/** Pages asked for at most: a long comic's strip shows these (a request is 100). */
const PAGES_MAX = 500;

/** A pool's name as e621 shows it (asked for if need be), or null until it's known. */
export function usePoolName(id: number | null): string | null {
  const creds = useStore(getSession().store, (s) => s.creds);
  useStore(answered, (n) => n);
  useEffect(() => {
    if (id !== null) want(id, creds);
  }, [id, creds]);
  const pool = id === null ? undefined : pools.get(id);
  return pool ? nameOf(pool) : null;
}

/** Ask for a comic's pages again (the comic's page, ⋯ › Refresh): its pool too, for pages added since. */
export function refreshComic(pool: number) {
  pools.delete(pool);
  failedUntil.delete(pool);
  for (const k of [...pages.keys()]) if (k.split(":")[1] === String(pool)) pages.delete(k);
  answered.set((n) => n + 1);
  pagesAnswered.set((n) => n + 1);
}

/** Every page's post (for the thumbs, and the page a drag turns to), asked 100 at a time. */
export function usePages(comic: Comic | null): Page[] | null {
  const creds = useStore(getSession().store, (s) => s.creds);
  // a reload with a saved sign-in asks as that user, not first as nobody
  const ready = useStore(getSession().store, (s) => s.ready);
  const answers = useStore(pagesAnswered, (n) => n);
  const user = creds?.username;
  const key = comic ? `${user ?? ""}:${comic.pool.id}:${comic.pool.post_ids.length}` : "";
  useEffect(() => {
    if (!comic || !ready || asking.has(key)) return;
    const retry = pagesRetry.get(key);
    if (retry === undefined ? pages.has(key) : Date.now() < retry) return;
    asking.add(key);
    const ids = comic.pool.post_ids.slice(0, PAGES_MAX);
    const batches: Promise<Post[]>[] = [];
    // the first hundred are on screen (the strip, the sheet, the page a drag turns to); the rest can wait
    for (let i = 0; i < ids.length; i += ID_BATCH) batches.push(searchPosts(`id:${ids.slice(i, i + ID_BATCH).join(",")}`, 1, ID_BATCH, creds, undefined, i === 0 ? "user" : "bg"));
    const era = pagesEra;
    void Promise.allSettled(batches)
      .then((got) => {
        // the account that asked signed out meanwhile: its pages aren't kept
        if (era !== pagesEra) return;
        const byId = new Map(got.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).map((p) => [p.id, p]));
        const before = pages.get(key);
        // a batch that failed keeps what an earlier ask had (or "not known yet")
        const list = ids.map((id, i): Page => {
          if (got[Math.floor(i / ID_BATCH)].status === "rejected") return before?.[i];
          const p = byId.get(id);
          return p && !p.flags?.deleted ? p : null;
        });
        pages.set(key, list);
        // the viewer turning to a page asks for nothing more
        rememberPosts(user, ids, byId);
        if (got.some((r) => r.status === "rejected")) {
          pagesRetry.set(key, Date.now() + RETRY_MS);
          setTimeout(() => pagesAnswered.set((n) => n + 1), RETRY_MS);
        } else pagesRetry.delete(key);
      })
      .finally(() => {
        asking.delete(key);
        pagesAnswered.set((n) => n + 1);
      });
  }, [key, ready, answers]); // eslint-disable-line react-hooks/exhaustive-deps
  return comic ? (pages.get(key) ?? null) : null;
}

/** A page's thumb, or nothing to show: hidden by e621, or on your blacklist (and not shown once). */
export function thumbOf(p: Post | null | undefined, rules: BlacklistRule[], username: string | undefined): string | null {
  if (!p) return null;
  const src = p.files.preview.jpg ?? p.files.sample.jpg;
  if (!src) return null;
  if (!revealed.has(p.id) && blacklistedBy(rules, p, { username })) return null;
  return src;
}

function useThumbs(list: Page[] | null) {
  const blacklist = useStore(getPrefs().store, blacklistOf);
  const username = useStore(getSession().store, (s) => s.user?.name);
  const rules = parseBlacklist(blacklist);
  return (i: number) => thumbOf(list?.[i], rules, username);
}

// ---- on a feed card --------------------------------------------------------------

/** The card's well: the pages glyph and "3 / 12". It opens the viewer on this page. */
export function ComicWell({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const comic = useComic(post);
  if (!comic) return null;
  return (
    <button type="button" className="post-comic" aria-label={`${comic.name}, page ${comic.page} of ${comic.total}`} onClick={onOpen} data-testid="card-comic">
      <Pages />
      {comic.page} / {comic.total}
    </button>
  );
}

// ---- on the post page ------------------------------------------------------------

/** The post page's comic: a row (it opens the comic's page), then every page as a thumb. */
export function ComicGroup({ post }: { post: Post }) {
  const comic = useComic(post);
  const list = usePages(comic);
  const thumb = useThumbs(list);
  const strip = useRef<HTMLDivElement>(null);
  // the current page in view, in the strip's middle
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>("[aria-current]");
    const box = strip.current;
    if (!el || !box) return;
    box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
  }, [list, comic?.page]);
  if (!comic) return null;
  const ids = comic.pool.post_ids.slice(0, PAGES_MAX);
  return (
    <section className="list-group post-comic-group" aria-label={`${comic.name}, a comic`} data-testid="post-comic">
      <button type="button" className="list-row" onClick={() => openComic(comic.pool.id)} data-testid="post-comic-open">
        <span className="row-well" aria-hidden>
          <Pages />
        </span>
        <span className="row-text">
          <b>{comic.name}</b>
          <small>
            Page {comic.page} of {comic.total}
          </small>
        </span>
        <ChevronRight aria-hidden className="row-chev" />
      </button>
      <div ref={strip} className="comic-strip" data-testid="post-comic-strip">
        {ids.map((id, i) => {
          const src = thumb(i);
          return (
            <button
              key={id}
              type="button"
              className="comic-thumb"
              aria-label={`Page ${i + 1}`}
              aria-current={id === post.id ? "page" : undefined}
              onClick={() => id !== post.id && getNav().push({ screen: { kind: "post", id }, play: null })}
              data-testid="comic-thumb"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- e621's CDN thumbnails */}
              {src && <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The comic's own page. */
export function openComic(id: number) {
  getNav().push({ screen: { kind: "comic", id }, play: null });
}

/**
 * Close the reader or the viewer (and the sheet over it) onto the comic's page: the one under it, or
 * a new one pushed over what was under.
 */
export async function closeOntoComic(id: number, entries: number) {
  for (let i = 0; i < entries; i++) await getNav().back();
  const now = getNav().current().route;
  const s = now.screen;
  if (s.kind === "comic" && s.id === id && !now.play && !now.view && !now.read) return;
  openComic(id);
}

// ---- in the viewer ------------------------------------------------------------------

/**
 * The viewer's comic bar: the comic's name and the page; it opens the Pages sheet. In a slideshow
 * (`onRead`) it says "Read from page 3" and opens the reader there, its chevron pointing on.
 */
export function ComicBar({ comic, onRead }: { comic: Comic; onRead?: () => void }) {
  const words = onRead ? `Read from page ${comic.page}` : `Page ${comic.page} of ${comic.total}`;
  return (
    <button
      type="button"
      className="viewer-comic"
      data-go={onRead ? "" : undefined}
      aria-label={`${comic.name}. ${onRead ? words : "Show all pages"}`}
      onClick={onRead ?? (() => getNav().openSheet("comic-pages"))}
      data-testid={onRead ? "slide-comic" : "viewer-comic"}
    >
      <Pages />
      <b>{comic.name}</b>
      <small>{words}</small>
      <ChevronRight aria-hidden className="viewer-comic-chev" />
    </button>
  );
}

/** The Pages sheet: every page as a thumb, the current one ringed gold; "Open comic". */
export function PagesSheet({ comic, post, onPage }: { comic: Comic; post: Post; onPage: (id: number) => void }) {
  const list = usePages(comic);
  const thumb = useThumbs(list);
  const by = artists(post)[0]?.replaceAll("_", " ");
  const [now] = useState(() => Date.now());
  const ids = comic.pool.post_ids.slice(0, PAGES_MAX);
  const last = list?.[list.length - 1];
  // close the sheet and the viewer (or the reader), onto the comic's page
  const open = () => closeOntoComic(comic.pool.id, 2);
  return (
    <Sheet
      title={comic.name}
      testId="sheet-pages"
      footer={
        <div className="pages-foot">
          {last && <small>Last page {ago(last.created_at, now)}</small>}
          <button type="button" className="link-row" onClick={() => void open()} data-testid="pages-feed">
            Open comic
            <ChevronRight aria-hidden />
          </button>
        </div>
      }
    >
      <p className="sheet-sub">
        {by ? `A comic by ${by}` : "A comic"} · {comic.total} {comic.total === 1 ? "page" : "pages"}
      </p>
      <div className="pages-grid">
        {ids.map((id, i) => {
          const src = thumb(i);
          return (
            <button
              key={id}
              type="button"
              aria-label={`Page ${i + 1}`}
              aria-current={id === post.id ? "page" : undefined}
              onClick={() => onPage(id)}
              data-testid="pages-thumb"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- e621's CDN thumbnails */}
              <span className="pages-pic">{src && <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />}</span>
              {i + 1}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ---- as a feed -------------------------------------------------------------------------

/** `pool:<id>` alone: Results asks for the pool's pages in its order, not e621's newest first. */
export const poolIdOf = (tags: string) => {
  const m = tags.trim().match(/^pool:(\d+)$/);
  return m ? Number(m[1]) : null;
};

/** The ratings you have on, as e621 search words ("" with all three on), as a feed asks them. */
function ratingWords(r: SearchSettings["ratings"]): string {
  const on = (["s", "q", "e"] as const).filter((k) => r[k]);
  if (on.length === 1) return `rating:${on[0]}`;
  if (on.length === 2) return `-rating:${(["s", "q", "e"] as const).find((k) => !r[k])}`;
  return "";
}

/** Results' feed for a comic: the pool's pages in order, 100 at a time, through your ratings and blacklist. */
export function usePoolFeed(id: number | null, media: SearchSettings["media"], ratingsOverride: SearchSettings["ratings"] | null): Feed | null {
  const session = useStore(getSession().store, (s) => s);
  const saved = useStore(getPrefs().store, (p) => p.search.ratings);
  const ratings = ratingWords(ratingsOverride ?? saved);
  const reg = getFeeds();
  const generation = useStore(reg.generation, (g) => g);
  const feed = useMemo(() => {
    if (id === null || !session.ready) return null;
    const { creds } = session;
    const username = session.user?.name;
    const ask = () =>
      fetchPool(id, creds).then((p) => {
        if (!p) throw new Error(`No pool #${id} on e621`);
        return p.post_ids;
      });
    return reg.custom(JSON.stringify(["pool", id, media, ratings, creds?.username ?? null, username ?? null]), (onChange, rules) =>
      new IdListQueue(ask, (q, page, limit) => searchPosts(`${q} ${ratings}`.trim(), page, limit, creds), { media, rules, ctx: { username } }, onChange, null, `pool:${id}`),
    );
  }, [id, media, ratings, session, reg, generation]); // eslint-disable-line react-hooks/exhaustive-deps
  useShownFeed(feed);
  return feed;
}
