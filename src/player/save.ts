/**
 * The picture viewer's Save (DESIGN.md "A post on its own"): on a phone the share sheet with the
 * picture file in it (Save Image is there); on a computer a download. e621's file host lets only
 * e621.net read its files, so the file comes through our own `/media/…` pass-through (next.config.ts),
 * with no credentials: e621's files are public. If that fails, the full picture opens in a new tab.
 */
import type { Post } from "@/lib/e621/types";

const FILE = /^https:\/\/static1\.e621\.net\/data\/([0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{32}\.(?:png|jpe?g|gif|webp))$/;

/** The same-origin path for a post's full file, or null when e621 gave no file (or not an image). */
export function mediaPath(post: Post): string | null {
  const m = post.files.original.url?.match(FILE);
  return m ? `/media/${m[1]}` : null;
}

/** The file's name when saved: the artist and the post number, so it's findable later. */
function fileName(post: Post, artist: string | null): string {
  const ext = post.files.meta.ext || "png";
  return `${artist ? `${artist}_` : ""}e621_${post.id}.${ext}`;
}

/** A phone or tablet: its share sheet is where Save Image lives. A computer downloads instead. */
const touch = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

export type SaveResult = "shared" | "downloaded" | "cancelled" | "again" | "opened";

/** A fetched file, kept for a second tap: a share sheet needs a fresh tap if the fetch took long. */
let held: { id: number; file: File } | null = null;

export async function savePost(post: Post, artist: string | null): Promise<SaveResult> {
  const path = mediaPath(post);
  const openFull = (): SaveResult => {
    if (post.files.original.url) window.open(post.files.original.url, "_blank", "noopener");
    return "opened";
  };
  if (!path) return openFull();
  let file = held?.id === post.id ? held.file : null;
  if (!file) {
    try {
      const res = await fetch(path, { credentials: "omit" });
      if (!res.ok) return openFull();
      const blob = await res.blob();
      file = new File([blob], fileName(post, artist), { type: blob.type || "image/png" });
    } catch {
      return openFull();
    }
  }
  if (touch() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      held = null;
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // the tap's permission ran out while the file came: keep it, and ask for one more tap
      held = { id: post.id, file };
      return "again";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  held = null;
  return "downloaded";
}
