"use client";

import { ExternalLink, Minus, Plus, X } from "lucide-react";
import { postPageUrl } from "@/lib/e621/client";
import { TAG_CATEGORY_COLORS, type Post, type TagCategoryName } from "@/lib/e621/types";

const ORDER: TagCategoryName[] = ["artist", "copyright", "character", "species", "general", "meta", "lore", "contributor", "invalid"];
const RATING = { s: "Safe", q: "Questionable", e: "Explicit" } as const;

interface Props {
  post: Post;
  onClose: () => void;
  onAddTag: (tag: string) => void;
  onExcludeTag: (tag: string) => void;
  /** Recommended only: the tags that ranked this post */
  reasons?: string[];
  /** In Recommended, + / − pin and mute profile tags instead of editing a search */
  recommended?: boolean;
}

export default function InfoOverlay({ post, onClose, onAddTag, onExcludeTag, reasons, recommended }: Props) {
  const add = recommended
    ? { label: (t: string) => `Pin ${t}`, title: "Pin in recommendations" }
    : { label: (t: string) => `Add ${t} to search`, title: "Add to search" };
  const exclude = recommended
    ? { label: (t: string) => `Mute ${t}`, title: "Mute: hide posts with this tag from recommendations" }
    : { label: (t: string) => `Exclude ${t} from search`, title: "Exclude from search" };
  return (
    <aside
      className="absolute bottom-20 left-4 top-4 z-20 flex w-80 max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line bg-panel-old/95 text-sm shadow-2xl backdrop-blur"
      data-testid="info-overlay"
      data-no-swipe
      aria-label="Post info"
    >
      <header className="flex items-start justify-between gap-2 border-b border-line p-3">
        <div className="min-w-0">
          <a
            href={postPageUrl(post.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            Post #{post.id} <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <p className="mt-1 text-xs text-neutral-400">
            {RATING[post.rating]} · ▲{post.stats.score.total} · ♥{post.stats.fav_count} · {post.files.original.width}×{post.files.original.height}{" "}
            {post.files.meta.ext.toUpperCase()}
            {post.files.meta.duration ? ` · ${Math.round(post.files.meta.duration)}s` : ""}
          </p>
          <p className="text-xs text-neutral-500">{new Date(post.created_at).toLocaleDateString()}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close info"
          className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      {reasons && reasons.length > 0 && (
        <p className="border-b border-line px-3 py-2 text-xs text-neutral-300" data-testid="rec-reasons">
          <span className="text-neutral-500">Recommended because: </span>
          {reasons.map((t) => t.replace(/_/g, " ")).join(", ")}
        </p>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {ORDER.map((cat) => {
          const tags = post.tags[cat];
          if (!tags?.length) return null;
          return (
            <div key={cat}>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{cat}</h3>
              <ul className="space-y-0.5">
                {tags.map((tag) => (
                  <li key={tag} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAddTag(tag)}
                      aria-label={add.label(tag)}
                      title={add.title}
                      className="rounded p-0.5 text-neutral-500 opacity-60 hover:bg-white/10 hover:text-green-400 group-hover:opacity-100"
                    >
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcludeTag(tag)}
                      aria-label={exclude.label(tag)}
                      title={exclude.title}
                      className="rounded p-0.5 text-neutral-500 opacity-60 hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Minus className="size-3.5" aria-hidden />
                    </button>
                    <a
                      href={`https://e621.net/posts?tags=${encodeURIComponent(tag)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs hover:underline"
                      style={{ color: TAG_CATEGORY_COLORS[cat] }}
                    >
                      {tag.replace(/_/g, " ")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
