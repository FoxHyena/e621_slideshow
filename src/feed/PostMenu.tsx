"use client";

/**
 * A post's ⋯ sheet (UX §5, DESIGN.md "Sheets"): a card's (Play from this post, Share post, Open on
 * e621, Blacklist this artist) or a held grid tile's (Favorite, Open artist, Play from here, Open on
 * e621). Moved out of feedParts.tsx so it loads after the first load, in the filter sheets' chunk.
 */
import { ExternalLink, Heart, Image as ImageIcon, Play, Share, User, UserX } from "lucide-react";
import Avatar from "@/components/Avatar";
import { postPageUrl } from "@/lib/e621/client";
import { artists } from "@/lib/feed/format";
import { getNav } from "@/nav/history";
import { openPaused } from "@/player/intent";
import { blacklistLine, openArtist, sharePost } from "@/screens/actions";
import { useScreen } from "@/shell/context";
import { Sheet } from "@/shell/Sheet";
import { favedOf, getFavs } from "@/state/favs";
import type { Post } from "@/lib/e621/types";
import type { Feed } from "@/state/feeds";
import { getGoo } from "@/state/goo";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";

/** `page`: the post page's own ⋯ (no Open post, no Play: the page has none), given its `post`. */
export function PostMenu({ feed, id, post: given, page }: { feed: Feed | null; id: number; post?: Post; page?: boolean }) {
  const post = given ?? feed?.queue.posts.find((p) => p.id === id);
  const { entry, sheet } = useScreen();
  const faved = useStore(getFavs().store, (s) => (post ? favedOf(s, post) : false));
  if (!post) return null;
  // a held or right-clicked grid tile: Favorite, Open artist, Play from here, Open on e621
  const tile = sheet?.startsWith("tile:") ?? false;
  const artist = artists(post)[0];
  const close = () => getNav().back();
  const name = artist?.replaceAll("_", " ");
  return (
    <Sheet
      title={`Post ${post.id}${name ? ` by ${name}` : ""}`}
      testId="sheet-post"
      pop
      head={
        <div className="sheet-ctx">
          <Avatar seed={artist ?? `post:${post.id}`} className="post-avatar" />
          <span className="row-text">
            <b>{name ?? "unknown artist"}</b>
            <small>#{post.id}</small>
          </span>
        </div>
      }
    >
      {tile ? (
        <div className="well-group">
          <OpenPost post={post} close={close} />
          <button
            type="button"
            className="well-row"
            data-on={faved || undefined}
            onClick={async () => {
              await close();
              if (!faved && getSession().store.get().creds) getGoo().addFav(post.id);
              getFavs().toggle(post);
            }}
            data-testid="tile-fav"
          >
            <Heart aria-hidden />
            <span>{faved ? "Unfavorite" : "Favorite"}</span>
          </button>
          {artist && (
            <button
              type="button"
              className="well-row"
              onClick={async () => {
                await close();
                openArtist(artist);
              }}
            >
              <User aria-hidden />
              <span>Open artist</span>
            </button>
          )}
          <button
            type="button"
            className="well-row"
            onClick={async () => {
              await close();
              openPaused(false);
              getNav().push({ screen: entry.route.screen, play: String(post.id) });
            }}
          >
            <Play aria-hidden />
            <span>Play from here</span>
          </button>
          <a className="well-row" href={postPageUrl(post.id)} target="_blank" rel="noopener">
            <ExternalLink aria-hidden />
            <span>Open on e621</span>
            <small>e621.net</small>
          </a>
        </div>
      ) : (
      <div className="well-group">
        {!page && <OpenPost post={post} close={close} />}
        {!page && <button
          type="button"
          className="well-row"
          onClick={async () => {
            await close();
            openPaused(false);
            getNav().push({ screen: entry.route.screen, play: String(post.id) });
          }}
        >
          <Play aria-hidden />
          <span>Play from this post</span>
        </button>}
        <button type="button" className="well-row" onClick={() => void sharePost(post)}>
          <Share aria-hidden />
          <span>Share post</span>
        </button>
        <a className="well-row" href={postPageUrl(post.id)} target="_blank" rel="noopener">
          <ExternalLink aria-hidden />
          <span>Open on e621</span>
          <small>e621.net</small>
        </a>
        {artist && (
          <button
            type="button"
            className="well-row"
            data-danger
            onClick={async () => {
              await close();
              blacklistLine(artist);
            }}
          >
            <UserX aria-hidden />
            <span>Blacklist this artist</span>
          </button>
        )}
      </div>
      )}
    </Sheet>
  );
}

/** "Open post": the post's own page (DESIGN.md "A post on its own"), the first row of a post's ⋯. */
function OpenPost({ post, close }: { post: Post; close: () => Promise<unknown> }) {
  return (
    <button
      type="button"
      className="well-row"
      onClick={async () => {
        await close();
        getNav().push({ screen: { kind: "post", id: post.id }, play: null });
      }}
      data-testid="open-post"
    >
      <ImageIcon aria-hidden />
      <span>Open post</span>
    </button>
  );
}
