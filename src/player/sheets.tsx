"use client";

/**
 * The player's sheets (UX §5 "Player"): quick settings (⚙) and the post's info (ⓘ).
 */
import { ExternalLink } from "lucide-react";
import { TagActionsOverlay, useTagHold } from "@/components/TagActions";
import { postPageUrl } from "@/lib/e621/client";
import { TAG_CATEGORY_COLORS, type Post, type TagCategoryName } from "@/lib/e621/types";
import { decodeResults } from "@/lib/feed/filters";
import { STYLE_LABELS, type PlaybackSettings, type SlideStyle } from "@/lib/settings";
import { getNav, type Entry } from "@/nav/history";
import { Sheet } from "@/shell/Sheet";
import { getPrefs } from "@/state/prefs";
import { useStore } from "@/state/store";
import { blacklistLine, openResults } from "@/screens/actions";

const STYLES = Object.keys(STYLE_LABELS) as SlideStyle[];
const SECONDS = [3, 6, 10, 15, 30];
const FITS: { id: PlaybackSettings["fit"]; label: string }[] = [
  { id: "contain", label: "Fit" },
  { id: "cover", label: "Fill" },
  { id: "original", label: "1:1" },
];

function Segments<T extends string | number>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  testId: string;
}) {
  return (
    <div className="sheet-group">
      <p className="sheet-label">{label}</p>
      <div className="segments" role="radiogroup" aria-label={label} data-testid={testId}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className="segment" onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Style, speed, fit, mute and quality. Saved as your defaults; on a share link's visit the link's
 * playback is what's showing, so a change here becomes yours from then on.
 */
export function QuickSettingsSheet({ base }: { base: Entry }) {
  const p = useStore(getPrefs().store, (s) => s.playback);
  const fromLink = base.route.screen.kind === "results" && decodeResults(base.route.screen.params).link?.kind === "share";
  const set = (patch: Partial<PlaybackSettings>) => getPrefs().setPlayback({ ...p, ...patch });
  return (
    <Sheet title="Slideshow" testId="sheet-quick-settings">
      {fromLink && <p className="feed-note sheet-intro">This link brought its own slideshow settings. A change here saves yours.</p>}
      <Segments
        label="Style"
        value={p.style}
        options={STYLES.map((s) => ({ id: s, label: STYLE_LABELS[s] }))}
        onChange={(style) => set({ style })}
        testId="quick-style"
      />
      <Segments
        label="Seconds per slide"
        value={p.intervalSec}
        options={[...new Set([...SECONDS, p.intervalSec])].sort((a, b) => a - b).map((n) => ({ id: n, label: `${n}s` }))}
        onChange={(intervalSec) => set({ intervalSec })}
        testId="quick-seconds"
      />
      {p.style === "classic" && <Segments label="Fit" value={p.fit} options={FITS} onChange={(fit) => set({ fit })} testId="quick-fit" />}
      <Segments
        label="Quality"
        value={p.quality}
        options={[
          { id: "sample", label: "Faster" },
          { id: "original", label: "Original" },
        ]}
        onChange={(quality) => set({ quality })}
        testId="quick-quality"
      />
      <label className="sheet-option">
        <span>Mute videos</span>
        <input type="checkbox" className="switch" checked={p.videoMuted} onChange={(e) => set({ videoMuted: e.target.checked })} />
      </label>
    </Sheet>
  );
}

const CATEGORIES: [TagCategoryName, string][] = [
  ["artist", "Artists"],
  ["copyright", "Copyrights"],
  ["character", "Characters"],
  ["species", "Species"],
  ["general", "General"],
  ["lore", "Lore"],
  ["meta", "Meta"],
];

/** Tags by category; tap one for Search this tag or Blacklist. */
export function PlayerInfoSheet({ post }: { post: Post; base: Entry }) {
  const act = async (tag: string, action: "search" | "blacklist") => {
    if (action === "blacklist") {
      blacklistLine(tag);
      return;
    }
    // Close the sheet and the player, then search.
    await getNav().back();
    await getNav().back();
    openResults(tag);
  };
  const hold = useTagHold((t, a) => void act(t, a));
  return (
    <Sheet title={`Post #${post.id}`} testId="sheet-info">
      {CATEGORIES.map(([c, label]) => {
        const tags = post.tags[c] ?? [];
        if (!tags.length) return null;
        return (
          <div key={c} className="sheet-group">
            <p className="sheet-label">{label}</p>
            <div className="chips chips-wrap">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="post-tag"
                  style={{ color: `var(--color-tag-${c}, ${TAG_CATEGORY_COLORS[c]})` }}
                  onPointerDown={(e) => hold.onPointerDown(e, t, c)}
                  onClick={(e) => hold.onClick(e, t, c)}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-haspopup="dialog"
                  data-testid="info-tag"
                  data-tag={t}
                >
                  {t.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <a className="sheet-option sheet-wide" href={postPageUrl(post.id)} target="_blank" rel="noopener">
        <span>Open on e621</span>
        <ExternalLink aria-hidden />
      </a>
      <TagActionsOverlay hold={hold} recommended={false} onAction={(t, a) => void act(t, a)} />
    </Sheet>
  );
}
