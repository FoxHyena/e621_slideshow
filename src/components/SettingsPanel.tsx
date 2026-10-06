"use client";

import { useId, useState } from "react";
import { Bookmark, Check, ChevronDown, Dices, ExternalLink, History, Loader2, Play, Trash2, X } from "lucide-react";
import type { Credentials } from "@/lib/e621/client";
import type { CurrentUser } from "@/lib/e621/types";
import type { BuiltQuery } from "@/lib/query/build";
import { dateMetatag } from "@/lib/query/date";
import { ORDER_LABELS, randomSeed, type Order, type PlaybackSettings, type SearchSettings } from "@/lib/settings";
import { storage, type HistoryEntry, type SavedSearch } from "@/lib/storage";
import type { QueueStats } from "@/lib/slideshow/queue";
import DatePanel from "./DatePanel";
import TagInput from "./TagInput";

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onPlay: () => void;
  playLabel: string;
  search: SearchSettings;
  setSearch: (s: SearchSettings) => void;
  playback: PlaybackSettings;
  setPlayback: (p: PlaybackSettings) => void;
  built: BuiltQuery;
  creds: Credentials | null;
  user: CurrentUser | null;
  remember: boolean;
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

function filtersSummary(s: Pick<SearchSettings, "ratings" | "media">): string {
  const ratings = (["s", "q", "e"] as const).filter((r) => s.ratings[r]).map((r) => r.toUpperCase());
  const media = (["image", "gif", "video"] as const).filter((m) => s.media[m]);
  const r = ratings.length ? ratings.join("·") : "no ratings";
  const m = media.length === 3 ? "all media" : media.length ? media.map((x) => `${x}s`).join("·") : "no media";
  return `${r} · ${m}`;
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
  options: { id: T; label: string }[];
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
            className={`rounded px-2.5 py-1 text-xs ${
              value === o.id ? "bg-accent font-semibold text-black" : "text-neutral-300 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
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

function AccountSection({
  creds,
  user,
  remember,
  onSignIn,
  onSignOut,
  stats,
}: Pick<SettingsPanelProps, "creds" | "user" | "remember" | "onSignIn" | "onSignOut" | "stats">) {
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
          {remember ? "Key saved in this browser." : "Key kept for this tab only."} Favoriting is enabled.
        </p>
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

export default function SettingsPanel(props: SettingsPanelProps) {
  const { open, onClose, onPlay, playLabel, search, setSearch, playback, setPlayback, built, creds } = props;
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
  const fitLabel = { contain: "Fit", cover: "Fill", original: "1:1" }[p.fit];
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
            <TagInput
              label="Search tags"
              value={s.tags}
              onChange={(tags) => setS({ tags })}
              creds={creds}
              placeholder="e.g. wolf solo score:>100"
              onSubmit={onPlay}
              testId="search-input"
            />
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
            </Subsection>
            <Subsection title="Upload date" testId="subsection-date" collapse={collapse("date", dateTag ?? "off")}>
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
                {built.inQuery.length} in query · {built.localOnly.length} filtered locally
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
            <Segmented
              label="Quality"
              value={p.quality}
              onChange={(quality) => setP({ quality })}
              options={[
                { id: "original", label: "Original" },
                { id: "sample", label: "Fast" },
              ]}
            />
            <Segmented
              label="Transition"
              value={p.transition}
              onChange={(transition) => setP({ transition })}
              options={[
                { id: "fade", label: "Fade" },
                { id: "none", label: "None" },
              ]}
            />
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
                ["O", "Open on e621"],
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
        </div>

        <footer className="border-t border-line p-4">
          <button
            type="button"
            onClick={onPlay}
            disabled={built.overLimit}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 font-semibold text-black hover:bg-accent-strong disabled:opacity-40"
            data-testid="play-button"
          >
            <Play className="size-4 fill-current" aria-hidden /> {playLabel}
          </button>
        </footer>
      </aside>
    </>
  );
}
