"use client";

/**
 * The player's sheets (DESIGN.md "Player sheets"): Quick settings (the sliders button) and Post info
 * (ⓘ). Both are the app's Panel sheet, not glass; opening one pauses the slideshow.
 */
import { ArrowUp, ChevronRight, ExternalLink, Heart, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";
import { Menu, MenuRow } from "@/components/Menu";
import { tagTargets, useTagHold, type TagAction } from "@/components/TagActions";
import TagActionsOverlay from "@/components/TagTargets";
import { Seg, Stepper } from "@/components/v6";
import { postPageUrl } from "@/lib/e621/client";
import { TAG_CATEGORY_COLORS, type Post, type Rating, type TagCategoryName } from "@/lib/e621/types";
import { decodeResults } from "@/lib/feed/filters";
import { ago, artists, compact } from "@/lib/feed/format";
import type { PlaybackSettings } from "@/lib/settings";
import { getNav, type Entry } from "@/nav/history";
import { blacklistLine, openArtist, openResults } from "@/screens/actions";
import { Sheet, SheetClose } from "@/shell/Sheet";
import { getPrefs } from "@/state/prefs";
import { getRec, weightsOf } from "@/state/rec";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";
import { StyleRow } from "./styles";
import { setVisitPlayback, visitTarget, type VisitTarget } from "./visit";

const FITS: { value: PlaybackSettings["fit"]; label: string }[] = [
  { value: "contain", label: "Fit" },
  { value: "cover", label: "Fill" },
  { value: "original", label: "1:1" },
];
const QUALITY: { value: PlaybackSettings["quality"]; label: string }[] = [
  { value: "sample", label: "Sample" },
  { value: "original", label: "Original" },
];
const TARGETS: { value: VisitTarget; label: string }[] = [
  { value: "visit", label: "This visit only" },
  { value: "default", label: "Save as default" },
];

/** A share link's visit: its own playback is showing. */
const linkVisit = (base: Entry) => base.route.screen.kind === "results" && decodeResults(base.route.screen.params).link?.kind === "share";

/** Change playback: your defaults, or on a link, this visit (and your defaults too when asked). */
function usePlaybackSetter(base: Entry) {
  const target = useStore(visitTarget, (t) => t[base.key] ?? "visit");
  const fromLink = linkVisit(base);
  const set = (patch: Partial<PlaybackSettings>) => {
    if (fromLink) setVisitPlayback(base.key, patch);
    if (!fromLink || target === "default") getPrefs().setPlayback({ ...getPrefs().store.get().playback, ...patch });
  };
  return { set, fromLink, target };
}

/** Style, speed, fit, mute and quality, straight on the sheet. */
export function QuickSettingsSheet({ base, playback }: { base: Entry; playback: PlaybackSettings }) {
  const { set, fromLink, target } = usePlaybackSetter(base);
  const p = playback;
  return (
    <Sheet title="Quick settings" testId="sheet-quick-settings">
      {fromLink && (
        <Seg
          label="Where changes go"
          big
          className="quick-target"
          options={TARGETS}
          value={target}
          onChange={(t) => visitTarget.set((all) => ({ ...all, [base.key]: t }))}
          testId="quick-target"
        />
      )}
      <StyleRow value={p.style} onChange={(style) => set({ style })} testId="quick-style" />
      <div className="sheet-rows">
        <div className="list-row">
          <span className="row-text">
            <b>Seconds per slide</b>
          </span>
          <Stepper
            label="seconds per slide"
            value={p.intervalSec}
            min={1}
            max={60}
            format={(v) => `${v} s`}
            onChange={(intervalSec) => set({ intervalSec })}
            testId="quick-seconds"
          />
        </div>
        {p.style === "classic" && (
          <div className="list-row">
            <span className="row-text">
              <b>Fit</b>
            </span>
            <Seg label="Fit" className="quick-fit" options={FITS} value={p.fit} onChange={(fit) => set({ fit })} testId="quick-fit" />
          </div>
        )}
        <label className="list-row">
          <span className="row-text">
            <b>Mute videos</b>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={p.videoMuted}
            onChange={(e) => set({ videoMuted: e.target.checked })}
            data-testid="quick-mute"
          />
        </label>
        <button type="button" className="list-row" onClick={() => getNav().openSheet("player-quality")} data-testid="quick-quality">
          <span className="row-text">
            <b>Quality</b>
          </span>
          <span className="row-value">{QUALITY.find((q) => q.value === p.quality)?.label}</span>
          <ChevronRight aria-hidden className="row-chev" />
        </button>
      </div>
      <button
        type="button"
        className="link-row sheet-more"
        onClick={async () => {
          await getNav().back();
          getNav().push({ screen: { kind: "settings", section: "slideshow" }, play: null }, { from: "settings" });
        }}
      >
        More in Settings <ChevronRight aria-hidden />
      </button>
    </Sheet>
  );
}

/** Quality, as a menu over Quick settings; Back returns to it. */
export function QualitySheet({ base, playback }: { base: Entry; playback: PlaybackSettings }) {
  const { set } = usePlaybackSetter(base);
  return (
    <Sheet title="Quality" testId="sheet-quality">
      <Menu label="Quality">
        {QUALITY.map((q) => (
          <MenuRow
            key={q.value}
            on={playback.quality === q.value}
            onPick={() => {
              set({ quality: q.value });
              void getNav().back();
            }}
            testId={`quality-${q.value}`}
          >
            {q.label}
          </MenuRow>
        ))}
      </Menu>
    </Sheet>
  );
}

/** e621's order; an Artists group only when a post credits more than one artist. */
export const KINDS: [TagCategoryName, string][] = [
  ["artist", "Artists"],
  ["copyright", "Copyrights"],
  ["character", "Characters"],
  ["species", "Species"],
  ["general", "General"],
  ["meta", "Meta"],
  ["lore", "Lore"],
];
export const RATING: Record<Rating, string> = { s: "Safe", q: "Questionable", e: "Explicit" };

/** "For you because you fav otter and cozy a lot": the post's two strongest profile tags. */
function useWhy(post: Post, forYou: boolean): string[] {
  const rec = useStore(getRec().store, (r) => r);
  const weights = useMemo(() => (forYou ? weightsOf(rec) : null), [forYou, rec]);
  if (!weights) return [];
  return Object.values(post.tags)
    .flat()
    .filter((t): t is string => !!t && (weights.get(t) ?? 0) > 0)
    .sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0))
    .slice(0, 2);
}

export const fileSize = (bytes: number) => (bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Who, three stats, why For You picked it, every tag by kind, and the file. Tap a tag for its targets. */
export function PlayerInfoSheet({ post, base }: { post: Post; base: Entry }) {
  const screen = base.route.screen;
  // For You's ranked feed (signed in with your own account); signed out it shows Popular, no profile
  const signedIn = useStore(getSession().store, (s) => !!s.creds && !!s.user && !s.link);
  const forYou = signedIn && screen.kind === "tab" && screen.tab === "for-you";
  const by = artists(post)[0];
  const name = by?.replaceAll("_", " ");
  const why = useWhy(post, forYou);
  const act = async (tag: string, action: TagAction) => {
    if (action === "blacklist") return blacklistLine(tag);
    if (action === "pin") {
      if (getRec().store.get().overrides.pinned.includes(tag)) return void toast(`${tag.replaceAll("_", " ")} is already pinned`);
      getRec().togglePin(tag);
      return void toast(`Pinned ${tag.replaceAll("_", " ")}. Update ranking to use it.`);
    }
    // Close the sheet and the player, then go.
    await getNav().back();
    await getNav().back();
    if (action === "open") openArtist(tag);
    else openResults(tag);
  };
  const hold = useTagHold((t, a) => void act(t, a));
  const credited = artists(post);
  const multi = credited.length > 1;
  const [now] = useState(() => Date.now());
  const f = post.files;
  return (
    <Sheet
      title={`Post ${post.id}${name ? ` by ${name}` : ""}`}
      testId="sheet-info"
      side
      head={
        <div className="sheet-head info-head">
          {by ? (
            <button type="button" className="info-who" onClick={() => void act(by, "open")} data-testid="info-artist">
              <Avatar seed={by} className="post-avatar" />
              <span className="row-text">
                <b>
                  {name}
                  <ChevronRight aria-hidden />
                </b>
                <small>
                  #{post.id} · {ago(post.created_at, now)}
                </small>
              </span>
            </button>
          ) : (
            <span className="info-who">
              <Avatar seed={`post:${post.id}`} className="post-avatar" />
              <span className="row-text">
                <b>unknown artist</b>
                <small>
                  #{post.id} · {ago(post.created_at, now)}
                </small>
              </span>
            </span>
          )}
          <SheetClose />
        </div>
      }
    >
      <div className="stat-wells">
        <div className="stat-well">
          <b>
            <ArrowUp aria-hidden className="stat-up" />
            {compact(post.stats.score.total)}
          </b>
          <small>score</small>
        </div>
        <div className="stat-well">
          <b>
            <Heart aria-hidden className="stat-heart" />
            {compact(post.stats.fav_count)}
          </b>
          <small>favs</small>
        </div>
        <div className="stat-well">
          <b data-rating={post.rating}>{RATING[post.rating]}</b>
          <small>rating</small>
        </div>
      </div>
      {why.length > 0 && (
        <p className="info-why" data-testid="info-why">
          <Sparkles aria-hidden />
          <span>
            For you because you fav <b>{why[0].replaceAll("_", " ")}</b>
            {why[1] && (
              <>
                {" "}
                and <b>{why[1].replaceAll("_", " ")}</b>
              </>
            )}{" "}
            a lot.
          </span>
        </p>
      )}
      {KINDS.map(([c, label]) => {
        const tags = c === "artist" ? (multi ? credited : []) : (post.tags[c] ?? []);
        if (!tags.length) return null;
        return (
          <section key={c} className="info-kind" aria-label={label}>
            <h3 className="info-label">
              {label}
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
                  data-testid="info-tag"
                  data-tag={t}
                >
                  {t.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      <div className="info-foot">
        <small>
          {f.original.width} × {f.original.height} · {f.meta.ext.toUpperCase()} · {fileSize(f.meta.size)}
        </small>
        <a className="link-row" href={postPageUrl(post.id)} target="_blank" rel="noopener">
          Open on e621 <ExternalLink aria-hidden />
        </a>
      </div>
      <TagActionsOverlay hold={hold} recommended={false} onAction={(t, a) => void act(t, a)} targets={tagTargets(forYou, true)} />
    </Sheet>
  );
}
