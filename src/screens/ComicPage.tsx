"use client";

/**
 * `/comic/<pool number>` (DESIGN.md "A post on its own", Comics, part two): a comic's own page, a
 * pushed screen that works signed out. Back and the tools (Share, ⋯); the name and one line ("A comic
 * · 12 pages · last page 3h ago"); the artist the first page credits, with Follow; the description;
 * every page three to a row (five on a computer), the one you stopped on ringed gold; "Open on
 * e621". Play opens the reader where you stopped. Rides in the artist page's chunk (src/shell/lazy.ts).
 */
import { BookOpen, ChevronRight, ExternalLink, Ban, Lock, MoreHorizontal, Play, RefreshCw, Share } from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { InlineLoader } from "@/components/Loader";
import { StateBlock } from "@/components/State";
import { comicOf, fetchPool, refreshComic, thumbOf, usePages, usePlace, type Page } from "@/feed/comics";
import { FollowPill } from "@/feed/FollowPill";
import { revealed } from "@/feed/revealed";
import { getTags } from "@/lib/e621/client";
import type { Pool, Post } from "@/lib/e621/types";
import { ago, artists, compact } from "@/lib/feed/format";
import { blacklistedBy, parseBlacklist, type BlacklistRule } from "@/lib/query/blacklist";
import { displayUrl } from "@/lib/slideshow/media";
import { getNav } from "@/nav/history";
import type { Route } from "@/nav/routes";
import { InfoDesc } from "@/player/sheets";
import { useScreen } from "@/shell/context";
import { Sheet } from "@/shell/Sheet";
import { blacklistOf, getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { copyText, openArtist } from "./actions";
import { Toolbar } from "./feedParts";

/** e621's pool page. */
const poolUrl = (id: number) => `https://e621.net/pools/${id}`;

type Found = { status: "loading" } | { status: "ready"; pool: Pool } | { status: "missing" } | { status: "error"; message: string };

/** The pool, asked of e621 (signed out: pools are public); Try again asks once more. */
function useComicPool(id: number): [Found, () => void] {
  const creds = useStore(getSession().store, (s) => s.creds);
  const [found, setFound] = useState<{ id: number; f: Found } | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    let live = true;
    fetchPool(id, creds)
      .then((p) => live && setFound({ id, f: p ? { status: "ready", pool: p } : { status: "missing" } }))
      .catch((e: unknown) => live && setFound({ id, f: { status: "error", message: e instanceof Error ? e.message : "e621 didn't answer." } }));
    return () => {
      live = false;
    };
  }, [id, creds, tries]);
  return [
    found?.id === id ? found.f : { status: "loading" },
    () => {
      setFound(null);
      setTries((t) => t + 1);
    },
  ];
}

/** Artists' post counts asked this visit, so Back and forward don't ask again. */
const counts = new Map<string, number | null>();

/** How many posts e621 has under the artist's tag, or null until known (or when it won't say). */
function usePostCount(name: string | null): number | null {
  const creds = useStore(getSession().store, (s) => s.creds);
  const [, setGot] = useState(0);
  useEffect(() => {
    if (!name || counts.has(name)) return;
    let live = true;
    getTags([name], creds, "bg")
      .then((t) => counts.set(name, t.find((x) => x.name === name)?.post_count ?? null))
      .catch(() => {})
      .finally(() => live && setGot((n) => n + 1));
    return () => {
      live = false;
    };
  }, [name, creds]);
  return name ? (counts.get(name) ?? null) : null;
}

/** A page the reader and the viewer can land on: sent by e621, a picture or video, not on your blacklist. */
export function readable(p: Page, rules: BlacklistRule[], username: string | undefined): boolean {
  if (!p) return p === undefined;
  return displayUrl(p, "sample") !== null && (revealed.has(p.id) || blacklistedBy(rules, p, { username }) === null);
}

/** Open the reader on this page of the comic, over the screen it was asked from (the comic's page). */
export function readAt(route: Route, pool: number, page: number) {
  getNav().push({ screen: route.screen, play: null, read: { pool, page } });
}

export function ComicScreen({ id }: { id: number }) {
  const { entry, sheet } = useScreen();
  const [found, retry] = useComicPool(id);
  const pool = found.status === "ready" ? found.pool : null;
  const place = usePlace(id);
  const comic = pool ? comicOf(pool, place) : null;
  const list = usePages(comic);
  const blacklist = useStore(getPrefs().store, blacklistOf);
  const username = useStore(getSession().store, (s) => s.user?.name);
  const rules = parseBlacklist(blacklist);
  const ids = pool?.post_ids ?? [];
  const [now] = useState(() => Date.now());

  // where Play starts: where you stopped, else the first page there is to read
  const placeAt = place === null ? -1 : ids.indexOf(place);
  const firstAt = list ? ids.findIndex((_, i) => readable(list[i], rules, username)) : -1;
  const startAt = placeAt >= 0 && list && readable(list[placeAt], rules, username) ? placeAt : firstAt;
  const sent = list?.filter((p): p is Post => !!p) ?? [];
  const firstPage = sent[0];
  const lastPage = sent[sent.length - 1];
  const by = firstPage ? (artists(firstPage)[0] ?? null) : null;
  const posts = usePostCount(by);
  const series = pool?.category !== "collection";
  const n = ids.length;
  const unit = series ? (n === 1 ? "page" : "pages") : n === 1 ? "post" : "posts";
  const name = pool?.name.replaceAll("_", " ") ?? "";
  const read = (at: number) => at >= 0 && readAt(entry.route, id, ids[at]);

  const share = async () => {
    const url = `${location.origin}/comic/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copyText(url, "Link copied");
  };

  return (
    <div className="screen-frame post-page comic-page" data-testid="comic-page" data-pool-id={id}>
      <Toolbar>
        {pool && (
          <button type="button" className="toolbar-circle" aria-label="Share comic" onClick={() => void share()} data-testid="comic-share">
            <Share aria-hidden />
          </button>
        )}
        {pool && (
          <button
            data-pop-end
            type="button"
            className="toolbar-circle"
            aria-label="More"
            aria-haspopup="dialog"
            onClick={() => getNav().openSheet(`comic:${id}`)}
            data-testid="comic-more"
          >
            <MoreHorizontal aria-hidden />
          </button>
        )}
      </Toolbar>
      {found.status === "loading" && (
        <div className="post-page-wait">
          <InlineLoader label={`Finding comic #${id}`} />
        </div>
      )}
      {found.status === "missing" && <StateBlock mood="look" screen head={`No comic #${id} on e621`} text="It was deleted, or the link is wrong." testId="comic-missing" />}
      {found.status === "error" && (
        <StateBlock
          mood="oops"
          screen
          head="Couldn't load the comic"
          text={found.message}
          testId="comic-error"
          actions={
            <button type="button" className="btn-tonal" onClick={retry}>
              Try again
            </button>
          }
        />
      )}
      {pool && (
        <>
          <div className="comic-head">
            <h1 tabIndex={-1} className="screen-title" data-testid="comic-name">
              {name}
            </h1>
            <p className="comic-sub" data-testid="comic-sub">
              {series ? "A comic" : "A collection"} · {n} {unit}
              {lastPage && ` · last page ${ago(lastPage.created_at, now)}`}
            </p>
          </div>
          {by && (
            <div className="list-group comic-artist">
              <div className="list-row">
                <button type="button" className="row-main" onClick={() => openArtist(by)} data-testid="comic-artist">
                  <Avatar seed={by} className="post-avatar" />
                  <span className="row-text">
                    <b>{by.replaceAll("_", " ")}</b>
                    {posts !== null && <small>{compact(posts)} posts</small>}
                  </span>
                </button>
                <FollowPill key={by} name={by} />
              </div>
            </div>
          )}
          {pool.description?.trim() && (
            <section className="post-info-panel comic-desc" aria-label="Description">
              <h3 className="info-label">Description</h3>
              <InfoDesc text={pool.description.trim()} onPost={(pid) => getNav().push({ screen: { kind: "post", id: pid }, play: null })} testId="comic-desc" />
            </section>
          )}
          <div className="list-label">
            <span>{series ? "Pages" : "Posts"}</span>
            {placeAt >= 0 && <span data-testid="comic-place">You are on page {placeAt + 1}</span>}
          </div>
          <div className="comic-pages" data-testid="comic-pages">
            {ids.map((pid, i) => (
              <Tile key={pid} n={i + 1} page={list?.[i]} known={list !== null} here={i === placeAt} rules={rules} username={username} onOpen={() => getNav().push({ screen: entry.route.screen, play: null, view: String(pid) })} />
            ))}
          </div>
          <div className="list-group comic-links">
            <a className="list-row" href={poolUrl(id)} target="_blank" rel="noopener" data-testid="comic-e621">
              <span className="row-well" aria-hidden>
                <ExternalLink />
              </span>
              <span className="row-text">
                <b>Open on e621</b>
                <small>Pool #{id}</small>
              </span>
              <ChevronRight aria-hidden className="row-chev" />
            </a>
          </div>
          {startAt >= 0 && (
            <button type="button" className="play-fab" aria-label={`Read from page ${startAt + 1}`} onClick={() => read(startAt)} data-testid="comic-play">
              <Play aria-hidden />
            </button>
          )}
        </>
      )}
      {pool && sheet === `comic:${id}` && (
        <Sheet title={name} testId="sheet-comic" pop>
          <div className="well-group">
            <button
              type="button"
              className="well-row"
              onClick={async () => {
                await getNav().back();
                refreshComic(id);
                retry();
              }}
              data-testid="comic-refresh"
            >
              <RefreshCw aria-hidden />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="well-row"
              disabled={firstAt < 0}
              onClick={async () => {
                await getNav().back();
                read(firstAt);
              }}
              data-testid="comic-read-first"
            >
              <BookOpen aria-hidden />
              <span>Read from page 1</span>
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/**
 * One page: the whole page, not cropped, its number under it. A page e621 doesn't send keeps its place
 * as a locked well; one on your blacklist shows the gate's mark and opens the post page's gate.
 */
function Tile({ n, page, known, here, rules, username, onOpen }: { n: number; page: Page; known: boolean; here: boolean; rules: BlacklistRule[]; username: string | undefined; onOpen: () => void }) {
  const missing = known && page === null;
  const src = thumbOf(page, rules, username);
  const hidden = !!page && !src;
  const f = page?.files.preview;
  const ratio = f && f.width > 0 && f.height > 0 ? `${f.width} / ${f.height}` : undefined;
  return (
    <button
      type="button"
      className="comic-tile"
      aria-label={missing ? `Page ${n}, not shown by e621` : hidden ? `Page ${n}, on your blacklist` : `Page ${n}`}
      aria-current={here ? "page" : undefined}
      disabled={missing || !page}
      onClick={onOpen}
      data-testid="comic-tile"
      data-missing={missing || undefined}
    >
      <span className="comic-pic" data-empty={!src || undefined} style={src && ratio ? { aspectRatio: ratio } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element -- e621's CDN thumbnails */}
        {src ? <img src={src} alt="" loading="lazy" decoding="async" draggable={false} /> : missing ? <Lock aria-hidden /> : hidden ? <Ban aria-hidden /> : null}
      </span>
      {n}
    </button>
  );
}
