import { mediaKind, type Post } from "../e621/types";
import type { PlaybackSettings } from "../settings";

let webmSupport: boolean | null = null;
function canPlayWebm(): boolean {
  if (webmSupport === null) {
    webmSupport =
      typeof document !== "undefined" &&
      document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";
  }
  return webmSupport;
}

/** The URL to display for a post under the current quality setting. */
export function displayUrl(post: Post, quality: PlaybackSettings["quality"]): string | null {
  const kind = mediaKind(post);
  if (kind === "video") {
    const alt = post.sample.alternates;
    if (quality === "sample") {
      const s = alt?.samples?.["720p"]?.url ?? alt?.samples?.["480p"]?.url;
      if (s) return s;
    }
    if (post.file.ext === "webm" && !canPlayWebm()) {
      return alt?.variants?.mp4?.url ?? post.file.url;
    }
    return post.file.url;
  }
  // Samples of GIFs are static JPGs; always use the original for animation.
  if (kind === "image" && quality === "sample" && post.sample.has && post.sample.url) {
    return post.sample.url;
  }
  return post.file.url;
}

/**
 * Keeps decoded images / buffered videos for upcoming posts alive so they
 * render instantly. The CDN only sends CORS headers for e621.net, so this
 * must use plain elements, never fetch().
 */
export class Preloader {
  private items = new Map<string, HTMLImageElement | HTMLVideoElement>();

  /** Replace the preload set with exactly these URLs. */
  sync(entries: { url: string; video: boolean }[]) {
    const want = new Set(entries.map((e) => e.url));
    for (const [url, el] of this.items) {
      if (!want.has(url)) {
        if (el instanceof HTMLVideoElement) {
          el.removeAttribute("src");
          el.load();
        }
        this.items.delete(url);
      }
    }
    for (const { url, video } of entries) {
      if (this.items.has(url)) continue;
      if (video) {
        const v = document.createElement("video");
        v.preload = "auto";
        v.muted = true;
        v.src = url;
        this.items.set(url, v);
      } else {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        this.items.set(url, img);
      }
    }
  }

  get urls(): string[] {
    return [...this.items.keys()];
  }

  clear() {
    this.sync([]);
  }
}
