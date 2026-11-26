"use client";

/**
 * The post panel (DESIGN.md "Post panel"): artist line, the picture at its own aspect, the stats
 * line and one sideways row of tags. Its height comes from `layout.ts`, so the feed can window
 * cards before their pictures load.
 */
import { ArrowUp, Heart, MoreHorizontal, Play, Volume2, VolumeX } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/e621/types";
import { mediaKind, TAG_CATEGORY_COLORS } from "@/lib/e621/types";
import { ago, artists, cardTags, compact } from "@/lib/feed/format";
import { getNav } from "@/nav/history";
import { CARD } from "@/lib/feed/layout";
import { displayUrl } from "@/lib/slideshow/media";
import { favCountOf, favedOf, getFavs } from "@/state/favs";
import { useStore } from "@/state/store";
import Avatar from "@/components/Avatar";
import type { TagHold } from "@/components/TagActions";

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
  onOpen: (post: Post, index: number) => void;
  onMenu: (post: Post) => void;
}

function FavPill({ post }: { post: Post }) {
  const favs = getFavs();
  const faved = useStore(favs.store, (s) => favedOf(s, post));
  const count = useStore(favs.store, (s) => favCountOf(s, post));
  const [pop, setPop] = useState(0);
  return (
    <button
      type="button"
      className="fav-pill"
      aria-pressed={faved}
      aria-label={`Favorite, ${compact(count)}`}
      data-testid="card-fav"
      onClick={() => {
        if (!faved) setPop((p) => p + 1);
        favs.toggle(post);
      }}
    >
      <Heart key={pop} aria-hidden className={pop ? "fav-pop" : undefined} />
      <span>{compact(count)}</span>
    </button>
  );
}

function CardMedia({ post, index, height, live, still, onOpen }: { post: Post; index: number; height: number; live: boolean; still: boolean; onOpen: PostCardProps["onOpen"] }) {
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
      if (!favedOf(favs.store.get(), post)) favs.toggle(post);
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

function PostCardImpl({ post, index, mediaHeight, live, still, now, hold, fresh = false, onOpen, onMenu }: PostCardProps) {
  const by = artists(post);
  const name = by[0]?.replaceAll("_", " ");
  const tags = cardTags(post);
  const shown = tags.slice(0, TAGS_SHOWN);
  const more = tags.length - shown.length;
  const height = CARD.header + mediaHeight + CARD.inset + CARD.stats + CARD.inset + CARD.tags + CARD.inset;
  return (
    <article
      className="post"
      style={{ height }}
      aria-label={`${fresh ? "New post" : "Post"} ${post.id}${name ? ` by ${name}` : ""}`}
      data-testid="post-card"
      data-post-id={post.id}
      data-index={index}
    >
      <header className="post-head">
        {by[0] ? (
          <button
            type="button"
            className="post-by"
            onClick={() => getNav().push({ screen: { kind: "artist", name: by[0] }, play: null })}
            data-testid="card-artist"
          >
            <Avatar seed={by[0]} className="post-avatar" />
            <span className="post-name">
              {name}
              {by.length > 1 && <span className="post-more-artists"> +{by.length - 1}</span>}
            </span>
          </button>
        ) : (
          <span className="post-by" data-testid="card-artist">
            <Avatar seed={`post:${post.id}`} className="post-avatar" />
            <span className="post-name">unknown artist</span>
          </span>
        )}
        <time className="post-time" dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>
          {fresh && (
            <span className="post-new" data-testid="card-new">
              New
            </span>
          )}
          {fresh && " · "}
          {ago(post.created_at, now)}
        </time>
        <button type="button" className="post-menu" aria-label="More" aria-haspopup="dialog" onClick={() => onMenu(post)} data-testid="card-menu">
          <MoreHorizontal aria-hidden />
        </button>
      </header>
      <CardMedia post={post} index={index} height={mediaHeight} live={live} still={still} onOpen={onOpen} />
      <div className="post-stats">
        <FavPill post={post} />
        <span className="post-score" aria-label={`Score ${post.stats.score.total}`}>
          <ArrowUp aria-hidden />
          {compact(post.stats.score.total)}
        </span>
        <span className="post-id">#{post.id}</span>
      </div>
      <div className="post-tags" data-testid="card-tags">
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
        {more > 0 && <span className="post-tag post-tag-more">+{more}</span>}
      </div>
    </article>
  );
}

export const PostCard = memo(PostCardImpl);
