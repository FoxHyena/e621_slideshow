"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import { Bookmark, Check, ChevronDown, Dices, Download, ExternalLink, GalleryVerticalEnd, Heart, History, LayoutGrid, Loader2, Pin, Play, RefreshCw, Trash2, VolumeX, X } from "lucide-react";
import type { Credentials } from "@/lib/e621/client";
import { TAG_CATEGORY_COLORS, type CurrentUser } from "@/lib/e621/types";
import { favoritesTags, REC_DEFAULT_WINDOW, type BuiltQuery, type RecommendedQuery } from "@/lib/query/build";
import { dateMetatag } from "@/lib/query/date";
import { BREADTH_MAX, BREADTH_MIN, ORDER_LABELS, randomSeed, STYLE_LABELS, type Order, type PlaybackSettings, type SearchSettings, type SlideStyle } from "@/lib/settings";
import { storage, type HistoryEntry, type SavedSearch } from "@/lib/storage";
import type { QueueStats } from "@/lib/slideshow/queue";
import DatePanel from "./DatePanel";
import { InlineLoader, stepText } from "./Loader";
import type { PlannedSearch, SearchKind } from "@/lib/recommend/weights";
import TagInput from "./TagInput";
import type { Recommendations } from "./useRecommendations";

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onPlay: () => void;
  /** Open the results as a grid without starting the show. */
  onPreview: () => void;
  /** Browse the search as a scrolling feed. */
  onScroll: () => void;
  playLabel: string;
  search: SearchSettings;
  setSearch: (s: SearchSettings) => void;
  playback: PlaybackSettings;
  setPlayback: (p: PlaybackSettings) => void;
  built: BuiltQuery;
  rec: Recommendations;
  /** every weighted profile tag, strongest first (pins included, mutes excluded) */
  recTags: string[];
  /** the tags that get their own search, and why */
  recPlan: PlannedSearch[];
  creds: Credentials | null;
  user: CurrentUser | null;
  remember: boolean;
  /** signed in with a key that came in a share link */
  linkSession: boolean;
  shareSignIn: boolean;
  setShareSignIn: (on: boolean) => void;
  onSignIn: (c: Credentials, remember: boolean) => Promise<void>;
  onSignOut: () => void;
  onImportBlacklist: () => Promise<string>;
  saved: SavedSearch[];
  onSave: (name: string) => void;
  onLoadSaved: (s: SavedSearch) => void;
  onDeleteSaved: (id: string) => void;
  history: HistoryEntry[];
  onLoadHistory: (tags: string) => void;
  onClearHistory: () => void;
  stats: QueueStats | null;
}

/** Rows rendered in the profile tag list; the filter still searches all of them. */
const TAG_LIST_MAX = 100;

const field = "rounded-md border border-line bg-black/40 px-2 py-1.5 text-sm focus:border-accent focus:outline-none";

function Section({
  title,
  children,
  testId,
  collapse,
  action,
}: {
  title: string;
  children: React.ReactNode;
  testId?: string;
  /** Omit for an always-open section. */
  collapse?: { open: boolean; onToggle: () => void; summary?: string };
  /** Shown right of the title (always-open sections only). */
  action?: React.ReactNode;
}) {
  const bodyId = useId();
  const heading = "text-xs font-semibold uppercase tracking-wider text-neutral-400";
  if (!collapse) {
    return (
      <section className="space-y-3 border-b border-line px-5 py-4" data-testid={testId}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={heading}>{title}</h2>
          {action}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section className="border-b border-line" data-testid={testId} data-open={collapse.open}>
      <h2>
        <button
          type="button"
          onClick={collapse.onToggle}
          aria-expanded={collapse.open}
          aria-controls={bodyId}
          className="flex min-h-11 w-full items-center gap-2 px-5 py-3 text-left hover:bg-white/5"
        >
          <span className={heading}>{title}</span>
          {collapse.summary && (
            <span className="ml-auto truncate pl-2 text-xs normal-case text-neutral-500">{collapse.summary}</span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-neutral-500 transition-transform ${collapse.summary ? "" : "ml-auto"} ${
              collapse.open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      </h2>
      {collapse.open && (
        <div id={bodyId} className="space-y-3 px-5 pt-3 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

/** A lighter, nested collapsible group inside a Section. */
function Subsection({
  title,
  children,
  testId,
  collapse,
}: {
  title: string;
  children: React.ReactNode;
  testId?: string;
  collapse: { open: boolean; onToggle: () => void; summary?: string };
}) {
  const bodyId = useId();
  return (
    <div className="-mx-2" data-testid={testId} data-open={collapse.open}>
      <h3>
        <button
          type="button"
          onClick={collapse.onToggle}
          aria-expanded={collapse.open}
          aria-controls={bodyId}
          className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/5"
        >
          <span className="text-sm text-neutral-300">{title}</span>
          {collapse.summary && (
            <span className="ml-auto truncate pl-2 font-mono text-xs text-neutral-500">{collapse.summary}</span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-neutral-500 transition-transform ${collapse.summary ? "" : "ml-auto"} ${
              collapse.open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      </h3>
      {collapse.open && (
        <div id={bodyId} className="space-y-3 px-2 pb-2 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

function filtersSummary(s: Pick<SearchSettings, "ratings" | "media" | "minScore">): string {
  const ratings = (["s", "q", "e"] as const).filter((r) => s.ratings[r]).map((r) => r.toUpperCase());
  const media = (["image", "gif", "video"] as const).filter((m) => s.media[m]);
  const r = ratings.length ? ratings.join("·") : "no ratings";
  const m = media.length === 3 ? "all media" : media.length ? media.map((x) => `${x}s`).join("·") : "no media";
  return `${r} · ${m}${s.minScore != null ? ` · score ≥${s.minScore}` : ""}`;
}

function Toggle({
  checked,
  onChange,
  children,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-accent"
        data-testid={testId}
      />
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; icon?: ReactNode; testId?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-300">{label}</span>
      <div className="flex rounded-md bg-white/5 p-0.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            data-testid={o.testId}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs ${
              value === o.id ? "bg-accent font-semibold text-black" : "text-neutral-300 hover:text-white"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderRow({ s, setS }: { s: SearchSettings; setS: (patch: Partial<SearchSettings>) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-neutral-300" htmlFor="order">
        Order
      </label>
      <select
        id="order"
        value={s.order}
        onChange={(e) => setS({ order: e.target.value as Order })}
        className={`${field} flex-1`}
        data-testid="order-select"
      >
        {(Object.keys(ORDER_LABELS) as Order[]).map((o) => (
          <option key={o} value={o}>
            {ORDER_LABELS[o]}
          </option>
        ))}
      </select>
      {s.order === "random" && (
        <button
          type="button"
          onClick={() => setS({ seed: randomSeed() })}
          className="flex items-center gap-1 rounded-md border border-line px-2 py-1.5 text-xs hover:border-neutral-400"
          title="New random order"
        >
          <Dices className="size-4" aria-hidden /> Reshuffle
        </button>
      )}
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  testId,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  suffix?: string;
  testId?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-300">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className={`${field} w-20 text-right`}
          data-testid={testId}
        />
        {suffix && <span className="w-6 text-xs text-neutral-400">{suffix}</span>}
      </span>
    </label>
  );
}

function RecommendedPanel({
  search,
  setS,
  rec,
  recTags,
  searched,
  capped,
  user,
}: {
  search: SearchSettings;
  setS: (patch: Partial<SearchSettings>) => void;
  rec: Recommendations;
  recTags: string[];
  /** tags in the candidate search, and why */
  searched: ReadonlyMap<string, SearchKind>;
  /** breadth was cut short by e621's tag limit */
  capped: boolean;
  user: CurrentUser | null;
}) {
  const [filter, setFilter] = useState("");
  if (!user) {
    return (
      <p className="rounded-md bg-accent/10 px-3 py-2 text-xs text-accent" data-testid="rec-signin">
        Sign in under e621 account to get recommendations from your favorites.
      </p>
    );
  }
  const { profile, weights, overrides } = rec;
  // Match the way tags are shown: "pink pawpads" finds pink_pawpads.
  const needle = filter.trim().toLowerCase().replace(/\s+/g, "_");
  // Grouped by why a tag is searched, each group in weight order (the number on the row).
  const byWeight = (a: string, b: string) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0) || a.localeCompare(b);
  const group = (kind: SearchKind | null) =>
    recTags.filter((t) => (searched.get(t) ?? null) === kind).sort(byWeight);
  const groups = [
    { kind: "pinned", label: "Pinned", tags: group("pinned") },
    { kind: "signature", label: "Searched: your most distinctive tags", tags: group("signature") },
    { kind: null, label: "Not searched. Still count when ranking; pin one to search it", tags: group(null) },
  ].filter((g) => g.tags.length > 0);
  const ordered = groups.flatMap((g) => g.tags);
  const matched = needle ? ordered.filter((t) => t.includes(needle)) : ordered;
  const shown = matched.slice(0, TAG_LIST_MAX);
  const headerAt = new Map(groups.map((g) => [g.tags[0], g]));
  const iconBtn = (on: boolean, tone: string) =>
    `rounded p-1 ${on ? tone : "text-neutral-500 opacity-60 hover:opacity-100"} hover:bg-white/10`;
  const tagRow = (tag: string) => {
    const cat = profile?.tags[tag]?.cat ?? "general";
    const pinned = overrides.pinned.includes(tag);
    const muted = overrides.muted.includes(tag);
    // Past the breadth cutoff: not searched, but still scored. Dim it; Pin stays bright so it can be promoted.
    const dim = !muted && !searched.has(tag);
    return (
      <li key={tag} className="flex items-center gap-1" data-testid="rec-tag" data-searched={!dim && !muted}>
        <button
          type="button"
          onClick={() => rec.togglePin(tag)}
          aria-label={`${pinned ? "Unpin" : "Pin"} ${tag}`}
          aria-pressed={pinned}
          className={iconBtn(pinned, "text-accent")}
        >
          <Pin className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => rec.toggleMute(tag)}
          aria-label={`${muted ? "Unmute" : "Mute"} ${tag}`}
          title={muted ? "Unmute" : "Mute: hide posts with this tag"}
          aria-pressed={muted}
          className={`${iconBtn(muted, "text-red-400")} ${dim ? "opacity-30" : ""}`}
        >
          <VolumeX className="size-3.5" aria-hidden />
        </button>
        <span
          className={`min-w-0 flex-1 truncate font-mono text-xs ${muted ? "line-through opacity-50" : dim ? "opacity-40" : ""}`}
          style={{ color: TAG_CATEGORY_COLORS[cat] }}
        >
          {tag.replace(/_/g, " ")}
        </span>
        {!muted && (
          <span className={`font-mono text-[11px] text-neutral-500 ${dim ? "opacity-50" : ""}`}>
            {profile?.tags[tag] ? `×${profile.tags[tag].n} · ` : ""}
            {(weights.get(tag) ?? 0).toFixed(1)}
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3" data-testid="rec-panel">
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-400">
        <span data-testid="rec-status" aria-live="polite">
          {rec.syncing ? (
            <InlineLoader label={rec.step ? stepText(rec.step) : "Syncing favorites…"} size="xs" />
          ) : profile ? (
            `${profile.favIds.length.toLocaleString()} favorites · synced ${new Date(profile.syncedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}`
          ) : (
            "No favorites read yet"
          )}
        </span>
        <button
          type="button"
          onClick={rec.rebuild}
          disabled={rec.syncing}
          className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 hover:border-neutral-400 disabled:opacity-40"
          data-testid="rec-rebuild"
          title="Re-read every favorite from scratch"
        >
          <RefreshCw className="size-3" aria-hidden /> Rebuild
        </button>
      </div>
      {rec.error && (
        <p className="text-xs text-red-400" role="alert">
          Couldn&apos;t read favorites: {rec.error}
        </p>
      )}
      <div className="space-y-1">
        <label htmlFor="rec-breadth" className="flex items-center justify-between text-sm">
          <span className="text-neutral-300">Breadth</span>
          <span className="font-mono text-xs text-neutral-400" data-testid="rec-breadth-value">
            {capped ? `${searched.size} tags (e621 tag limit)` : `${search.breadth} tags`}
          </span>
        </label>
        <input
          id="rec-breadth"
          type="range"
          min={BREADTH_MIN}
          max={BREADTH_MAX}
          step={1}
          value={search.breadth}
          onChange={(e) => setS({ breadth: Number(e.target.value) })}
          className="h-6 w-full cursor-pointer accent-accent"
          data-testid="rec-breadth"
        />
        <div className="flex justify-between text-[11px] text-neutral-500" aria-hidden>
          <span>focused</span>
          <span>varied</span>
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Your highest-weight tags, searched together in one query. Lower stays close to your strongest interests;
        higher brings more variety. Each tag uses one of e621&apos;s search-tag slots.
      </p>
      {recTags.length > 0 ? (
        <div>
          <h3 className="mb-1 text-xs text-neutral-400">
            Your profile: {recTags.length.toLocaleString()} tags you favorite far more than e621 at large.{" "}
            {searched.size} are searched; all of them count when ranking.
          </h3>
          <div className="relative mb-1.5">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                // Esc clears the filter instead of closing the panel
                if (e.key === "Escape" && filter) {
                  e.stopPropagation();
                  setFilter("");
                }
              }}
              placeholder="Find a tag"
              aria-label="Filter profile tags"
              className={`${field} w-full`}
              data-testid="rec-filter"
            />
            {needle && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500">
                {matched.length.toLocaleString()} of {recTags.length.toLocaleString()}
              </span>
            )}
          </div>
          <ul
            className="max-h-72 space-y-0.5 overflow-y-auto overscroll-contain rounded-md bg-black/20 p-1.5"
            data-testid="rec-tags"
            tabIndex={0}
            aria-label="Profile tags, strongest first"
          >
            {shown.map((tag, i) => {
              // Group headers, unless a filter has scrambled positions.
              const g = needle ? undefined : headerAt.get(tag);
              if (!g) return tagRow(tag);
              return (
                <Fragment key={tag}>
                  <li
                    className={`px-1 pb-0.5 text-[11px] text-neutral-500 ${i > 0 ? "mt-1 border-t border-line pt-1.5" : ""}`}
                    data-testid={g.kind ? `rec-group-${g.kind}` : "rec-cutoff"}
                  >
                    {g.label}
                  </li>
                  {tagRow(tag)}
                </Fragment>
              );
            })}
            {shown.length === 0 && <li className="px-1 py-0.5 text-xs text-neutral-500">No profile tags match.</li>}
          </ul>
          {matched.length > shown.length && (
            <p className="mt-1 text-[11px] text-neutral-500" data-testid="rec-tags-truncated">
              Showing top {shown.length} of {matched.length.toLocaleString()}. Use Find a tag for the rest.
            </p>
          )}
        </div>
      ) : (
        !rec.syncing && (
          <p className="text-xs text-neutral-400">Not enough favorites yet: a tag needs to be on at least 3 of them.</p>
        )
      )}
      {overrides.muted.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs text-neutral-400">Muted: posts with these tags are hidden from recommendations</h3>
          <ul className="space-y-0.5" data-testid="rec-muted">
            {overrides.muted.map(tagRow)}
          </ul>
        </div>
      )}
    </div>
  );
}

function AccountSection({
  creds,
  user,
  remember,
  linkSession,
  shareSignIn,
  setShareSignIn,
  onSignIn,
  onSignOut,
  stats,
}: Pick<
  SettingsPanelProps,
  "creds" | "user" | "remember" | "linkSession" | "shareSignIn" | "setShareSignIn" | "onSignIn" | "onSignOut" | "stats"
>) {
  const [username, setUsername] = useState(creds?.username ?? "");
  const [apiKey, setApiKey] = useState(creds?.apiKey ?? "");
  const [keep, setKeep] = useState(remember);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && creds) {
    return (
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2" data-testid="signed-in">
          <Check className="size-4 text-green-400" aria-hidden />
          Signed in as <strong>{user.name}</strong>
        </p>
        <p className="text-xs text-neutral-400">
          {linkSession
            ? "Signed in from a share link, for this tab only."
            : remember
              ? "Key saved in this browser."
              : "Key kept for this tab only."}{" "}
          Favoriting is enabled.
        </p>
        {!linkSession && (
          <div className="space-y-1">
            <Toggle checked={shareSignIn} onChange={setShareSignIn} testId="share-sign-in">
              Include my sign-in in share links
            </Toggle>
            {shareSignIn && (
              <p className="text-xs text-amber-300" data-testid="share-sign-in-warning">
                Anyone with a link you share can act as you on e621 until you regenerate your API key.
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-neutral-400"
        >
          Sign out
        </button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSignIn({ username: username.trim(), apiKey: apiKey.trim() }, keep);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {stats && stats.hidden > 0 && (
        <p className="rounded-md bg-accent/10 px-3 py-2 text-xs text-accent" data-testid="hidden-notice">
          {stats.hidden} post{stats.hidden === 1 ? " was" : "s were"} hidden by e621 for anonymous users. Sign in to
          see them.
        </p>
      )}
      <input
        className={`${field} w-full`}
        placeholder="e621 username"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        aria-label="e621 username"
      />
      <input
        className={`${field} w-full`}
        placeholder="API key"
        type="password"
        autoComplete="current-password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        aria-label="API key"
      />
      <Toggle checked={keep} onChange={setKeep}>
        Remember on this device
      </Toggle>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !username.trim() || !apiKey.trim()}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {busy && <Loader2 className="size-3 animate-spin" aria-hidden />}
          Verify &amp; sign in
        </button>
        <a
          href="https://e621.net/users/home"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-neutral-400 underline hover:text-white"
        >
          Get an API key
        </a>
      </div>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-neutral-500">
        The key is sent only to e621.net, straight from your browser.
      </p>
    </form>
  );
}

function SavedSection({
  saved,
  onSave,
  onLoadSaved,
  onDeleteSaved,
  history,
  onLoadHistory,
  onClearHistory,
}: Pick<
  SettingsPanelProps,
  "saved" | "onSave" | "onLoadSaved" | "onDeleteSaved" | "history" | "onLoadHistory" | "onClearHistory"
>) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave(name.trim());
          setName("");
        }}
      >
        <input
          className={`${field} min-w-0 flex-1`}
          placeholder="Name this search"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Saved search name"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex items-center gap-1 rounded-md border border-line px-3 text-xs hover:border-neutral-400 disabled:opacity-40"
        >
          <Bookmark className="size-3.5" aria-hidden /> Save
        </button>
      </form>
      {saved.length > 0 && (
        <ul className="space-y-1" data-testid="saved-list">
          {saved.map((s) => (
            <li key={s.id} className="group flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
              <button
                type="button"
                onClick={() => onLoadSaved(s)}
                className="min-w-0 flex-1 text-left"
                title={s.tags}
              >
                <span className="block truncate text-sm">{s.name}</span>
                <span className="block truncate font-mono text-xs text-neutral-400">{s.tags || "(everything)"}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteSaved(s.id)}
                aria-label={`Delete saved search ${s.name}`}
                className="text-neutral-500 hover:text-red-400"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <History className="size-3.5" aria-hidden /> Recent
            </span>
            <button type="button" onClick={onClearHistory} className="text-xs text-neutral-500 hover:text-white">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1" data-testid="history-list">
            {history.map((h) => (
              <button
                key={h.tags}
                type="button"
                onClick={() => onLoadHistory(h.tags)}
                className="max-w-full truncate rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-neutral-300 hover:border-accent hover:text-accent"
              >
                {h.tags}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** How to add the Slideshow button to e621 (public/e621-slideshow.user.js). */
function UserscriptSection() {
  const link = "text-neutral-200 underline hover:text-white";
  return (
    <>
      <p className="text-xs text-neutral-400">
        Adds a <span className="font-semibold text-neutral-200">▶ Slideshow</span> button under e621&rsquo;s search
        box. It opens the search here: the same posts e621 shows, in your style and speed, with your blacklist.
      </p>
      <ol className="list-decimal space-y-1.5 pl-4 text-xs text-neutral-300">
        <li>
          Add a userscript manager:{" "}
          <a href="https://violentmonkey.github.io/" target="_blank" rel="noreferrer" className={link}>
            Violentmonkey
          </a>{" "}
          or{" "}
          <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer" className={link}>
            Tampermonkey
          </a>
          . On Safari, use the free Userscripts app from the App Store.
        </li>
        <li>
          Chrome, Edge, Brave: open <code className="font-mono text-neutral-200">chrome://extensions</code>, click{" "}
          Details on the manager, and turn on <span className="font-semibold text-neutral-200">Allow User Scripts</span>.
          Without it the script installs but never runs.
        </li>
        <li>Install the script below, then reload any e621 page.</li>
      </ol>
      <a
        href="/e621-slideshow.user.js"
        className="flex items-center justify-center gap-2 rounded-md border border-line py-2 text-sm font-semibold text-neutral-200 hover:border-accent hover:text-accent"
        data-testid="userscript-install"
      >
        <Download className="size-4" aria-hidden /> Install userscript
      </a>
      <p className="text-xs text-neutral-500">
        No button on e621? Click the manager&rsquo;s toolbar icon there: the script should be listed and on. It
        updates itself.
      </p>
    </>
  );
}

export default function SettingsPanel(props: SettingsPanelProps) {
  const { open, onClose, onPlay, onPreview, onScroll, playLabel, search, setSearch, playback, setPlayback, built, creds } = props;
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [sections, setSections] = useState(storage.loadSections);
  const collapse = (id: string, summary?: string) => ({
    open: !!sections[id],
    summary,
    onToggle: () => {
      const next = { ...sections, [id]: !sections[id] };
      setSections(next);
      storage.saveSections(next);
    },
  });
  const [importing, setImporting] = useState(false);
  const s = search;
  const p = playback;
  const dateTag = dateMetatag(s.date);
  const fitLabel = p.style === "classic" ? { contain: "Fit", cover: "Fill", original: "1:1" }[p.fit] : STYLE_LABELS[p.style];
  const setS = (patch: Partial<SearchSettings>) => setSearch({ ...s, ...patch });
  const setP = (patch: Partial<PlaybackSettings>) => setPlayback({ ...p, ...patch });

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Slideshow settings"
        aria-hidden={!open}
        inert={!open}
        data-testid="settings-panel"
        data-open={open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-panel shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h1 className="text-base font-semibold">Slideshow</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section
            title="Search"
            testId="section-search"
            action={
              <a
                href="https://e621.net/help/cheatsheet"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent"
                data-testid="cheatsheet-link"
              >
                Search cheatsheet <ExternalLink className="size-3" aria-hidden />
              </a>
            }
          >
            <Segmented
              label="Source"
              value={s.source}
              onChange={(source) => setS({ source })}
              options={[
                { id: "search", label: "Search" },
                // Only a signed-in user has favorites to play; keep it visible if it's
                // already picked so the sign-in check on load doesn't hide the choice.
                ...(props.user || s.source === "favorites"
                  ? [
                      {
                        id: "favorites" as const,
                        label: "Favs",
                        icon: <Heart className="size-3.5" fill="currentColor" aria-hidden />,
                        testId: "source-favorites",
                      },
                    ]
                  : []),
                { id: "recommended", label: "Recommended" },
              ]}
            />
            {s.source === "favorites" ? (
              <>
                <p className="text-xs text-neutral-400" data-testid="favorites-note">
                  {props.user ? (
                    <>
                      Plays {props.user.name}&apos;s favorites (
                      <code className="text-neutral-300">{favoritesTags(props.user.name)}</code>), with the filters
                      below.
                    </>
                  ) : (
                    <>Sign in under Account to play your favorites.</>
                  )}
                </p>
                <OrderRow s={s} setS={setS} />
              </>
            ) : s.source === "recommended" ? (
              <RecommendedPanel
                search={s}
                setS={setS}
                rec={props.rec}
                recTags={props.recTags}
                searched={
                  new Map(
                    props.recPlan
                      .filter((p) => "candidates" in built && (built as RecommendedQuery).candidates.includes(p.tag))
                      .map((p) => [p.tag, p.kind]),
                  )
                }
                capped={"capped" in built && (built as RecommendedQuery).capped}
                user={props.user}
              />
            ) : (
              <>
                <TagInput
                  label="Search tags"
                  value={s.tags}
                  onChange={(tags) => setS({ tags })}
                  creds={creds}
                  placeholder="e.g. wolf solo score:>100"
                  onSubmit={onPlay}
                  testId="search-input"
                />
                <OrderRow s={s} setS={setS} />
              </>
            )}
            <Subsection title="Filters" testId="subsection-filters" collapse={collapse("filters", filtersSummary(s))}>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <span className="text-sm text-neutral-400">Rating</span>
                <Toggle checked={s.ratings.s} onChange={(v) => setS({ ratings: { ...s.ratings, s: v } })} testId="rating-s">
                  Safe
                </Toggle>
                <Toggle checked={s.ratings.q} onChange={(v) => setS({ ratings: { ...s.ratings, q: v } })} testId="rating-q">
                  Questionable
                </Toggle>
                <Toggle checked={s.ratings.e} onChange={(v) => setS({ ratings: { ...s.ratings, e: v } })} testId="rating-e">
                  Explicit
                </Toggle>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <span className="text-sm text-neutral-400">Show</span>
                <Toggle checked={s.media.image} onChange={(v) => setS({ media: { ...s.media, image: v } })}>
                  Images
                </Toggle>
                <Toggle checked={s.media.gif} onChange={(v) => setS({ media: { ...s.media, gif: v } })}>
                  GIFs
                </Toggle>
                <Toggle
                  checked={s.media.video}
                  onChange={(v) => setS({ media: { ...s.media, video: v } })}
                  testId="media-video"
                >
                  Videos
                </Toggle>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-neutral-400" htmlFor="min-score">
                  Min score
                </label>
                <input
                  id="min-score"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={s.minScore ?? ""}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setS({ minScore: Number.isFinite(n) ? n : null });
                  }}
                  placeholder="off"
                  className={`${field} w-24`}
                  data-testid="min-score"
                />
              </div>
            </Subsection>
            <Subsection
              title="Upload date"
              testId="subsection-date"
              collapse={collapse("date", dateTag ?? (s.source === "recommended" ? "last 7 days" : "off"))}
            >
              {s.source === "recommended" && !dateTag && (
                <p className="text-xs text-neutral-400">
                  Recommendations always search a window. With no date set, that&apos;s{" "}
                  <code className="text-neutral-300">{dateMetatag(REC_DEFAULT_WINDOW)}</code>.
                </p>
              )}
              <DatePanel value={s.date} onChange={(date) => setS({ date })} />
            </Subsection>
            <details className="text-xs text-neutral-400">
              <summary className="cursor-pointer select-none">
                Query sent to e621{" "}
                <span className={built.tagCount > built.tagLimit ? "text-red-400" : ""}>
                  ({built.tagCount}/{built.tagLimit} tags)
                </span>
              </summary>
              <code className="mt-2 block break-words rounded bg-black/40 p-2 font-mono text-neutral-300" data-testid="query-preview">
                {built.query || "(everything)"}
              </code>
            </details>
            {built.overLimit && (
              <p className="text-xs text-red-400" role="alert">
                Your search uses more than {built.tagLimit} tags; e621 will reject it.
              </p>
            )}
          </Section>

          <Section title="Saved searches" testId="section-saved" collapse={collapse("saved", props.saved.length ? `${props.saved.length} saved` : undefined)}>
            <SavedSection {...props} />
          </Section>


          <Section
            title="Blacklist"
            testId="section-blacklist"
            collapse={collapse("blacklist", `${built.rules.length} rule${built.rules.length === 1 ? "" : "s"}`)}
          >
            <p className="text-xs text-neutral-400">
              One rule per line, e621 syntax: <code className="text-neutral-300">tag1 tag2</code> hides posts with both,{" "}
              <code className="text-neutral-300">-tag</code> exempts, <code className="text-neutral-300">~a ~b</code> means
              either, <code className="text-neutral-300">#</code> comments.
            </p>
            {props.user && (
              <p className="text-xs text-neutral-400" data-testid="blacklist-synced">
                Synced with {props.user.name}&apos;s e621 blacklist on sign-in. Lines you add here stay local.
              </p>
            )}
            <TagInput
              label="Blacklist"
              multiline
              rows={6}
              value={s.blacklist}
              onChange={(blacklist) => setS({ blacklist })}
              creds={creds}
              testId="blacklist-input"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
              <span data-testid="blacklist-stats">
                {built.rules.length} rules · filtered locally
              </span>
              <button
                type="button"
                disabled={importing}
                onClick={async () => {
                  setImporting(true);
                  try {
                    setImportMsg(await props.onImportBlacklist());
                  } catch (e) {
                    setImportMsg(e instanceof Error ? e.message : String(e));
                  } finally {
                    setImporting(false);
                  }
                }}
                className="rounded-md border border-line px-2.5 py-1 hover:border-neutral-400 disabled:opacity-40"
                data-testid="import-blacklist"
              >
                {creds ? "Re-sync from account" : "Import e621 defaults"}
              </button>
            </div>
            {importMsg && <p className="text-xs text-neutral-300">{importMsg}</p>}
          </Section>

          <Section title="Playback" testId="section-playback" collapse={collapse("playback", `${p.intervalSec}s · ${fitLabel}`)}>
            <NumberRow
              label="Seconds per slide"
              value={p.intervalSec}
              min={1}
              max={300}
              suffix="s"
              onChange={(intervalSec) => setP({ intervalSec })}
              testId="interval-input"
            />
            <NumberRow
              label="Preload next"
              value={p.preloadCount}
              min={0}
              max={10}
              onChange={(preloadCount) => setP({ preloadCount })}
            />
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="text-neutral-300" htmlFor="slide-style">
                Style
              </label>
              <select
                id="slide-style"
                value={p.style}
                onChange={(e) => setP({ style: e.target.value as SlideStyle })}
                className={field}
                data-testid="style-select"
              >
                {(Object.keys(STYLE_LABELS) as SlideStyle[]).map((st) => (
                  <option key={st} value={st}>
                    {STYLE_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
            {p.style === "classic" && (
              <Segmented
                label="Fit"
                value={p.fit}
                onChange={(fit) => setP({ fit })}
                options={[
                  { id: "contain", label: "Fit" },
                  { id: "cover", label: "Fill" },
                  { id: "original", label: "1:1" },
                ]}
              />
            )}
            <Segmented
              label="Quality"
              value={p.quality}
              onChange={(quality) => setP({ quality })}
              options={[
                { id: "original", label: "Original" },
                { id: "sample", label: "Fast" },
              ]}
            />
            {p.style === "classic" && (
              <Segmented
                label="Transition"
                value={p.transition}
                onChange={(transition) => setP({ transition })}
                options={[
                  { id: "fade", label: "Fade" },
                  { id: "none", label: "None" },
                ]}
              />
            )}
            <NumberRow
              label="Max video length (0 = full)"
              value={p.videoMaxSec}
              min={0}
              max={3600}
              suffix="s"
              onChange={(videoMaxSec) => setP({ videoMaxSec })}
            />
            <Toggle checked={p.videoMuted} onChange={(videoMuted) => setP({ videoMuted })}>
              Mute videos
            </Toggle>
            <Toggle checked={p.loop} onChange={(loop) => setP({ loop })}>
              Start over after the last post
            </Toggle>
          </Section>

          <Section
            title="e621 account"
            testId="section-account"
            collapse={collapse("account", props.user ? `signed in as ${props.user.name}` : "not signed in")}
          >
            <AccountSection {...props} key={props.user?.name ?? "anon"} />
          </Section>

          <Section title="Keyboard" testId="section-keyboard" collapse={collapse("keyboard")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-neutral-300">
              {[
                ["← →", "Previous / next"],
                ["Space", "Pause / play"],
                ["F", "Fullscreen"],
                ["I", "Post info"],
                ["L", "Favorite"],
                ["G", "Gallery"],
                ["T", "Scroll view (J / K to step)"],
                ["O", "Open on e621"],
                ["C", "Copy share link"],
                ["S / Esc", "Settings"],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded border border-line bg-black/40 px-1.5 font-mono">{k}</kbd>
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="e621 button" testId="section-userscript" collapse={collapse("userscript", "userscript")}>
            <UserscriptSection />
          </Section>
        </div>

        <footer className="flex gap-2 border-t border-line p-4">
          <button
            type="button"
            onClick={onPreview}
            disabled={built.overLimit}
            className="flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 font-semibold text-neutral-200 hover:bg-white/5 disabled:opacity-40"
            data-testid="preview-button"
          >
            <LayoutGrid className="size-4" aria-hidden /> Preview
          </button>
          <button
            type="button"
            onClick={onScroll}
            disabled={built.overLimit}
            className="flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 font-semibold text-neutral-200 hover:bg-white/5 disabled:opacity-40"
            data-testid="scroll-button"
          >
            <GalleryVerticalEnd className="size-4" aria-hidden /> Scroll
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={built.overLimit}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent py-2.5 font-semibold text-black hover:bg-accent-strong disabled:opacity-40"
            data-testid="play-button"
          >
            <Play className="size-4 fill-current" aria-hidden /> {playLabel}
          </button>
        </footer>
      </aside>
    </>
  );
}
