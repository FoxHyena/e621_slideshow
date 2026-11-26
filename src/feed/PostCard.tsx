"use client";

/**
 * The post panel (DESIGN.md v6 "Post panel"): who made it (mark, name, "New · 2h ago · #id"),
 * the picture at its own aspect, one sideways row of tags, then score and the favourite pill at
 * the right end. Its height comes from `layout.ts`, so the feed can window cards before their
 * pictures load.
 */
import { ArrowUp, Heart, MoreHorizontal, Play, Volume2, VolumeX } from "lucide-react";
import { memo, useEffect, useRef, useState, type RefObject } from "react";
import type { Post } from "@/lib/e621/types";
import { mediaKind, TAG_CATEGORY_COLORS } from "@/lib/e621/types";
import { ago, artists, cardTags, compact } from "@/lib/feed/format";
import { getNav } from "@/nav/history";
import { CARD_CHROME } from "@/lib/feed/layout";
import { displayUrl } from "@/lib/slideshow/media";
import { favCountOf, favedOf, getFavs } from "@/state/favs";
import { getGoo } from "@/state/goo";
import { getSession } from "@/state/session";
import { liveGoo } from "@/shell/gooLive";
import { useStore } from "@/state/store";
import Avatar from "@/components/Avatar";
import type { TagHold } from "@/components/TagActions";
import { FollowPill } from "./FollowPill";
import { turnMark } from "./motion";
import { motionFx } from "@/shell/lazy";

/** A second tap this soon is a double tap. */
const DOUBLE_TAP_MS = 200;
/** Tags shown before the "+N" tag. */
const TAGS_SHOWN = 12;

export interface PostCardProps {
  post: Post;
  index: number;
  mediaHeight: number;
  /** the card nearest the middle: its video plays */
  live: boolean;
  /** reduced motion: videos wait for a tap */
  still: boolean;
  now: number;
  hold: TagHold;
  /** Following: above e621's seen marker */
  fresh?: boolean;
  /** For You, Results, Favorites: a Follow pill for an artist you don't follow */
  follow?: boolean;
  onOpen: (post: Post, index: number) => void;
  onMenu: (post: Post) => void;
}

/**
 * Favouriting, as you see it (DESIGN.md "Fav pill and the heart's goo"): goo drips off the pill,
 * the artist's mark spins, and the drop that lets go falls onto the tab bar's goo. Signed out
 * there's no favourite to celebrate (the toggle asks you to sign in).
 */
function celebrate(id: number, btn: HTMLElement | null, mark: Element | null) {
  if (!getSession().store.get().creds) return;
  void motionFx().then((m) => m.drip(btn));
  turnMark(mark);
  const r = btn?.getBoundingClientRect();
  // the drop leaves from under the middle drip, which hangs about 23 below the pill
  if (r && r.width > 0) liveGoo()?.dropFrom(r.left + r.width * 0.55, r.bottom + 23);
  // a post favourited again this session drips, but adds no more goo
  getGoo().addFav(id);
}

function FavPill({ post, btnRef, onFaved }: { post: Post; btnRef: RefObject<HTMLButtonElement | null>; onFaved: () => void }) {
  const favs = getFavs();
  const faved = useStore(favs.store, (s) => favedOf(s, post));
  const count = useStore(favs.store, (s) => favCountOf(s, post));
  const [pop, setPop] = useState(0);
  return (
    <button
      ref={btnRef}
      type="button"
      className="fav-pill"
      aria-pressed={faved}
      aria-label={`Favorite, ${compact(count)}`}
      data-testid="card-fav"
      onClick={() => {
        if (!faved) {
          setPop((p) => p + 1);
          onFaved();
        }
        favs.toggle(post);
      }}
    >
      <Heart key={pop} aria-hidden className={pop ? "fav-pop" : undefined} />
      <span>{compact(count)}</span>
    </button>
  );
}

function CardMedia({ post, index, height, live, still, onOpen, onFaved }: { post: Post; index: number; height: number; live: boolean; still: boolean; onOpen: PostCardProps["onOpen"]; onFaved: () => void }) {
  const kind = mediaKind(post);
  const src = displayUrl(post, "sample");
  const poster = post.files.sample.jpg ?? post.files.preview.jpg ?? undefined;
  const [muted, setMuted] = useState(true);
  /** a tap's choice; until then videos play in view (unless motion is reduced) */
  const [want, setWant] = useState<boolean | null>(null);
  const [burst, setBurst] = useState(0);
  const [failed, setFailed] = useState(false);
  const lastTap = useRef(0);
  const single = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A card windowed out mid double-tap window mustn't open the player afterwards.
  useEffect(() => () => clearTimeout(single.current), []);
  const favs = getFavs();
  const playing = kind === "video" && live && (want ?? !still);

  const onTap = () => {
    const t = performance.now();
    if (t - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(single.current);
      lastTap.current = 0;
      setBurst((b) => b + 1);
      // A double tap favorites; it never un-favorites.
      if (!favedOf(favs.store.get(), post)) {
        onFaved();
        favs.toggle(post);
      }
      return;
    }
    lastTap.current = t;
    single.current = setTimeout(() => {
      if (kind === "video") setWant(!playing);
      else onOpen(post, index);
    }, DOUBLE_TAP_MS);
  };

  return (
    <div className="post-media" style={{ height }} onClick={onTap} data-testid="card-media">
      {/* eslint-disable @next/next/no-img-element -- remote CDN media, no Next image optimization wanted */}
      {failed || !src ? (
        <span className="post-media-gone">Can&rsquo;t show this one</span>
      ) : kind === "video" && playing ? (
        <video
          src={src}
          poster={poster}
          muted={muted}
          playsInline
          loop
          autoPlay
          preload="metadata"
          onError={() => setFailed(true)}
          data-testid="card-video"
        />
      ) : (
        <img
          src={kind === "video" ? poster : src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          data-testid="card-image"
        />
      )}
      {/* eslint-enable @next/next/no-img-element */}
      {kind === "video" && !playing && (
        <span className="post-play" aria-hidden>
          <Play />
        </span>
      )}
      {kind === "video" && (
        <button
          type="button"
          className="post-mute"
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={!muted}
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
        >
          {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
        </button>
      )}
      {burst > 0 && <Heart key={burst} className="heart-burst post-burst" aria-hidden />}
    </div>
  );
}

/** Fade a tag row's edge only by as much as is hidden past it, so the last tag is whole at the end. */
function fadeTags(e: React.UIEvent<HTMLDivElement>) {
  const r = e.currentTarget;
  const rest = r.scrollWidth - r.clientWidth - r.scrollLeft;
  r.style.setProperty("--fl", `${Math.min(16, Math.max(0, r.scrollLeft))}px`);
  r.style.setProperty("--fr", `${Math.min(28, Math.max(0, rest))}px`);
}

function PostCardImpl({ post, index, mediaHeight, live, still, now, hold, fresh = false, follow = false, onOpen, onMenu }: PostCardProps) {
  const by = artists(post);
  const name = by[0]?.replaceAll("_", " ");
  const seed = by[0] ?? `post:${post.id}`;
  const tags = cardTags(post);
  // "+N" opens the rest in the same row (it scrolls sideways), so the card keeps its height
  const [allTags, setAllTags] = useState(false);
  const tagRow = useRef<HTMLDivElement>(null);
  const shown = allTags ? tags : tags.slice(0, TAGS_SHOWN);
  const more = tags.length - shown.length;
  const who = useRef<HTMLDivElement>(null);
  const fav = useRef<HTMLButtonElement>(null);
  const mark = () => who.current?.querySelector(".mark") ?? null;
  const faved = () => celebrate(post.id, fav.current, mark());
  return (
    <article
      className="post"
      style={{ height: CARD_CHROME + mediaHeight }}
      aria-label={`${fresh ? "New post" : "Post"} ${post.id}${name ? ` by ${name}` : ""}`}
      data-testid="post-card"
      data-post-id={post.id}
      data-index={index}
    >
      <header className="post-head">
        <div ref={who} className="post-who">
          <Avatar seed={seed} fresh={fresh} className="post-avatar" />
          <div className="post-idn">
            <span className={`post-name${name ? "" : " post-name-none"}`}>
              <span>{name ?? "unknown artist"}</span>
              {by.length > 1 && <span className="post-also">+{by.length - 1}</span>}
            </span>
            <span className="post-when">
              {fresh && (
                <b className="post-new" data-testid="card-new">
                  New
                </b>
              )}
              {fresh && " · "}
              <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>
                {ago(post.created_at, now)}
              </time>
              {" · "}
              <span className="post-id">#{post.id}</span>
            </span>
          </div>
          {by[0] && (
            <button
              type="button"
              className="post-by"
              aria-label={`More from ${name}${by.length > 1 ? ` and ${by.length - 1} more` : ""}`}
              onClick={() => getNav().push({ screen: { kind: "artist", name: by[0] }, play: null })}
              data-testid="card-artist"
            />
          )}
        </div>
        {follow && by[0] && (
          <FollowPill
            key={by[0]}
            name={by[0]}
            onFollowed={() => {
              const m = mark();
              void motionFx().then((fx) => fx.followBurst(m as HTMLElement | null, by[0]));
              turnMark(m);
            }}
          />
        )}
        <button type="button" className="post-menu" aria-label="More" aria-haspopup="dialog" onClick={() => onMenu(post)} data-testid="card-menu">
          <MoreHorizontal aria-hidden />
        </button>
      </header>
      <CardMedia post={post} index={index} height={mediaHeight} live={live} still={still} onOpen={onOpen} onFaved={faved} />
      <div ref={tagRow} className="post-tags" data-testid="card-tags" onScroll={fadeTags}>
        {shown.map(([c, t]) => (
          <button
            key={`${c}:${t}`}
            type="button"
            className="post-tag"
            style={{ color: `var(--color-tag-${c}, ${TAG_CATEGORY_COLORS[c]})` }}
            data-picked={hold.held?.tag === t || undefined}
            onPointerDown={(e) => hold.onPointerDown(e, t, c)}
            onClick={(e) => hold.onClick(e, t, c)}
            onContextMenu={(e) => e.preventDefault()}
            aria-haspopup="dialog"
            data-testid="card-tag"
            data-tag={t}
          >
            {t.replaceAll("_", " ")}
          </button>
        ))}
        {more > 0 && (
          <button
            type="button"
            className="post-tag post-tag-more"
            aria-label={`${more} more tags`}
            onClick={() => {
              setAllTags(true);
              // the first new tag takes the button's place, and the focus
              requestAnimationFrame(() => tagRow.current?.querySelectorAll<HTMLElement>(".post-tag")[TAGS_SHOWN]?.focus({ preventScroll: true }));
            }}
            data-testid="card-tags-more"
          >
            +{more}
          </button>
        )}
      </div>
      <footer className="post-foot">
        <span className="post-score" aria-label={`Score ${post.stats.score.total}`}>
          <ArrowUp aria-hidden />
          {compact(post.stats.score.total)}
        </span>
        <FavPill post={post} btnRef={fav} onFaved={faved} />
      </footer>
    </article>
  );
}

export const PostCard = memo(PostCardImpl);
