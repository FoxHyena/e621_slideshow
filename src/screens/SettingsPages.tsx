"use client";

/**
 * Settings' sub-pages (UX.md "Settings", DESIGN.md "Settings" and "Settings: Account, Content, For
 * You, App"): each a pushed screen with Back, the large title, then groups. Their own chunk.
 */
import { AlertTriangle, ChevronLeft, ChevronRight, Download, ExternalLink, Heart, History, Keyboard, KeyRound, Link2, LogOut, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";
import { Menu, MenuRow } from "@/components/Menu";
import { StateBlock } from "@/components/State";
import { Field, Seg, Stepper } from "@/components/v6";
import { StyleRow } from "@/player/styles";
import { DEFAULT_BLACKLIST, mergeBlacklists } from "@/lib/query/blacklist";
import { DEFAULT_PLAYBACK, type PlaybackSettings } from "@/lib/settings";
import type { SettingsSection } from "@/nav/routes";
import { getNav } from "@/nav/history";
import { useScreen } from "@/shell/context";
import { SECTION_LABEL } from "@/shell/screens";
import { Sheet } from "@/shell/Sheet";
import { getArtists } from "@/state/artists";
import { getFollows } from "@/state/follows";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { shallow, useStore } from "@/state/store";
import { openArtist, openSignIn } from "./actions";

const SOURCE = "https://github.com/FoxHyena/e621_slideshow";
const label = (n: string) => n.replaceAll("_", " ");

export function SettingsPage({ section }: { section: Exclude<SettingsSection, "classic"> }) {
  return (
    <div className="screen-frame settings-page" data-testid={`settings-page-${section}`}>
      <div className="screen-toolbar">
        <button type="button" className="toolbar-circle" aria-label="Back" onClick={() => void getNav().back()}>
          <ChevronLeft aria-hidden />
        </button>
      </div>
      <h1 tabIndex={-1} className="screen-title">
        {SECTION_LABEL[section]}
      </h1>
      {section === "account" ? <Account /> : section === "content" ? <Content /> : section === "slideshow" ? <Slideshow /> : section === "for-you" ? <ForYouPage /> : <AppPage />}
    </div>
  );
}

/** A note under a group: Muted footnote, lined up with the rows' text. */
const Note = ({ children, warn, testId }: { children: ReactNode; warn?: boolean; testId?: string }) => (
  <p className="group-note" data-warn={warn || undefined} data-testid={testId}>
    {warn && <AlertTriangle aria-hidden />}
    <span>{children}</span>
  </p>
);

function SwitchRow({ title, line, on, set, disabled, testId, icon }: { title: string; line?: string; on: boolean; set: (on: boolean) => void; disabled?: boolean; testId: string; icon?: ReactNode }) {
  return (
    <label className="list-row">
      {icon}
      <span className="row-text">
        <b>{title}</b>
        {line && <small>{line}</small>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={on} disabled={disabled} onChange={(e) => set(e.target.checked)} data-testid={testId} />
    </label>
  );
}

// ---- Account ------------------------------------------------------------------

function Account() {
  const s = useStore(getSession().store, (x) => ({ user: x.user, creds: x.creds, remember: x.remember, link: x.link, shareSignIn: x.shareSignIn, ready: x.ready }), shallow);
  const follows = useStore(getFollows().store, (f) => (f.status === "ready" ? f.followed.size : null));
  const followsUser = useStore(getFollows().store, (f) => f.user);
  useEffect(() => {
    void getFollows().ensure();
  }, [followsUser]);
  // known once your favorites have been read (Artists › Suggested, the first run); not read for this
  const favCount = useStore(getArtists().store, (a) => (a.user === s.user?.name ? a.favorites : 0));
  if (!s.ready) return null;
  if (!s.user || !s.creds)
    return (
      <StateBlock
        mood="wave"
        size={96}
        head="Not signed in"
        text="Sign in to follow artists, favorite posts and use your blacklist."
        actions={
          <button type="button" className="btn-gold" onClick={openSignIn} data-testid="account-sign-in">
            Sign in with e621
          </button>
        }
        testId="account-signed-out"
      />
    );
  const session = getSession();
  return (
    <>
      <div className="list-group" data-flat>
        <div className="list-row" data-account="">
          <Avatar seed={s.user.name} className="row-mark-l" />
          <span className="row-text">
            <b data-testid="account-name">{label(s.user.name)}</b>
            <small>{s.link ? "On a shared link, for this tab" : `Signed in to e621${follows !== null ? ` · ${follows.toLocaleString("en-US")} follow${follows === 1 ? "" : "s"}` : ""}`}</small>
          </span>
        </div>
      </div>
      <ul className="list-group">
        <li>
          <button type="button" className="list-row" onClick={() => getNav().push({ screen: { kind: "favorites", params: "" }, play: null })} data-testid="account-favorites">
            <span className="row-well" data-tone="pink" aria-hidden>
              <Heart />
            </span>
            <span className="row-text">
              <b>Your favorites</b>
              <small>{favCount ? `${favCount.toLocaleString("en-US")} post${favCount === 1 ? "" : "s"}` : "On e621"}</small>
            </span>
            <ChevronRight aria-hidden className="row-chev" />
          </button>
        </li>
      </ul>
      {!s.link && (
        <>
          <div className="list-group">
            <SwitchRow
              icon={
                <span className="row-well" aria-hidden>
                  <Link2 />
                </span>
              }
              title="Sign-in links"
              line="Links can sign in as you"
              on={s.shareSignIn}
              set={(on) => session.setShareSignIn(on)}
              testId="share-sign-in"
            />
          </div>
          <Note warn testId="share-sign-in-warning">
            Anyone with such a link can use your e621 account until you make a new API key. Leave this off unless the link is for you.
          </Note>
          <ul className="list-group">
            <li>
              <button type="button" className="list-row" onClick={openSignIn} data-testid="account-key">
                <span className="row-well" aria-hidden>
                  <KeyRound />
                </span>
                <span className="row-text">
                  <b>API key</b>
                  <small>{s.remember ? "Saved on this device" : "Kept for this tab only"}</small>
                </span>
                <span className="row-value">Change</span>
                <ChevronRight aria-hidden className="row-chev" />
              </button>
            </li>
          </ul>
        </>
      )}
      <button type="button" className="btn-tonal settings-wide" onClick={() => session.signOut()} data-testid="sign-out">
        <LogOut aria-hidden className="state-icon" />
        Sign out
      </button>
    </>
  );
}

// ---- Content ------------------------------------------------------------------

const RATINGS = [
  { key: "s", title: "Safe" },
  { key: "q", title: "Questionable" },
  { key: "e", title: "Explicit" },
] as const;

/** One blacklist line: its tags, a minus tag Muted ("but not with"). */
function LineText({ line }: { line: string }) {
  const parts = line.split(/\s+/).filter(Boolean);
  return (
    <span className="bl-line">
      {parts.map((t, i) => (
        <span key={i}>
          {i > 0 && <span className="bl-sep"> · </span>}
          <span className={t.startsWith("-") ? "bl-neg" : undefined}>{label(t)}</span>
        </span>
      ))}
    </span>
  );
}

function Content() {
  const prefs = getPrefs();
  const search = useStore(prefs.store, (p) => p.search);
  const signedIn = useStore(getSession().store, (x) => !!x.user && !x.link);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // (a line twice, from e621 or by hand, shows once; Remove takes every copy)
  const lines = [
    ...new Set(
      search.blacklist
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ];

  const setRating = (k: "s" | "q" | "e", v: boolean) => {
    const now = prefs.store.get().search; // (two quick taps: the second builds on the first)
    if (!v && RATINGS.filter((r) => now.ratings[r.key]).length <= 1) {
      toast("Keep at least one rating on", { id: "ratings" });
      return;
    }
    prefs.setSearch({ ...now, ratings: { ...now.ratings, [k]: v } });
  };
  const add = () => {
    const line = draft.trim().toLowerCase().replace(/\s+/g, " ");
    if (!line) return;
    prefs.editBlacklist((all) => (all.split("\n").some((l) => l.trim() === line) ? all : `${all.trim() ? `${all.trimEnd()}\n` : ""}${line}`));
    setDraft("");
  };
  const remove = (line: string) =>
    prefs.editBlacklist((all) =>
      all
        .split("\n")
        .filter((l) => l.trim() !== line)
        .join("\n"),
    );
  const count = (t: string) => t.split("\n").filter((l) => l.trim()).length;
  const importDefaults = () => {
    const added = count(mergeBlacklists(search.blacklist, DEFAULT_BLACKLIST)) - count(search.blacklist);
    prefs.editBlacklist((b) => mergeBlacklists(b, DEFAULT_BLACKLIST));
    toast(added > 0 ? `Added ${added} line${added === 1 ? "" : "s"} from e621's default list` : "You already have e621's default list", { id: "bl-import" });
  };
  const sync = async () => {
    setBusy(true);
    try {
      const n = await getSession().importBlacklist();
      if (n === null) return; // signed out or switched meanwhile: nothing was synced
      toast(`Synced ${n} line${n === 1 ? "" : "s"} from your account`, { id: "bl-sync" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "e621 didn't answer", { id: "bl-sync" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="list-label">
        <span>Ratings</span>
      </div>
      <div className="list-group">
        {RATINGS.map((r) => (
          <SwitchRow
            key={r.key}
            icon={
              <span className="row-well rating-letter" data-rating={r.key} aria-hidden>
                {r.key.toUpperCase()}
              </span>
            }
            title={r.title}
            on={search.ratings[r.key]}
            set={(v) => setRating(r.key, v)}
            testId={`rating-${r.key}`}
          />
        ))}
      </div>
      <div className="list-label">
        <span>Blacklist</span>
        <span data-testid="blacklist-count">
          {lines.length} line{lines.length === 1 ? "" : "s"}
        </span>
      </div>
      <form
        className="bl-add"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Field value={draft} onChange={setDraft} placeholder="Tags to hide" aria-label="Tags to hide" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" data-testid="blacklist-field" />
        <button type="submit" className="btn-tonal" disabled={!draft.trim()} data-testid="blacklist-add">
          <Plus aria-hidden className="state-icon" />
          Add
        </button>
      </form>
      {lines.length > 0 && (
        <ul className="list-group" data-flat data-testid="blacklist-lines">
          {lines.map((l) => (
            <li key={l} className="list-row bl-row" data-testid="blacklist-line">
              <span className="row-text">
                <LineText line={l} />
              </span>
              <button type="button" className="bl-remove" aria-label={`Remove ${l}`} onClick={() => remove(l)} data-testid="blacklist-remove">
                <Minus aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Note>A post is hidden when it has every tag on a line. A minus means &ldquo;but not with&rdquo;.</Note>
      <ul className="list-group">
        {signedIn && (
          <li className="list-row">
            <span className="row-text">
              <b>Your e621 blacklist</b>
              <small>Synced when you sign in</small>
            </span>
            <button type="button" className="btn-tonal" data-size="compact" disabled={busy} onClick={() => void sync()} data-testid="blacklist-sync">
              Sync
            </button>
          </li>
        )}
        <li className="list-row">
          <span className="row-text">
            <b>e621&rsquo;s default list</b>
            <small>For new e621 accounts</small>
          </span>
          <button type="button" className="btn-tonal" data-size="compact" onClick={importDefaults} data-testid="blacklist-import">
            <Download aria-hidden className="state-icon" />
            Import
          </button>
        </li>
      </ul>
    </>
  );
}

// ---- Slideshow ----------------------------------------------------------------

const FITS = [
  { value: "contain", label: "Fit" },
  { value: "cover", label: "Fill" },
  { value: "original", label: "1:1" },
] as const;
type Choice<K extends keyof PlaybackSettings> = { value: PlaybackSettings[K]; label: string };
const CHOICES = {
  transition: [
    { value: "fade", label: "Fade" },
    { value: "none", label: "None" },
  ] as Choice<"transition">[],
  quality: [
    { value: "sample", label: "Sample" },
    { value: "original", label: "Original" },
  ] as Choice<"quality">[],
  videoMaxSec: [
    { value: 15, label: "15 s" },
    { value: 30, label: "30 s" },
    { value: 60, label: "60 s" },
    { value: 120, label: "2 min" },
    { value: 0, label: "Whole video" },
  ] as Choice<"videoMaxSec">[],
  preloadCount: [1, 2, 3, 4, 6, 8].map((n) => ({ value: n, label: `${n} post${n === 1 ? "" : "s"}` })) as Choice<"preloadCount">[],
};
type ChoiceKey = keyof typeof CHOICES;
const TITLES: Record<ChoiceKey, string> = { transition: "Transition", quality: "Quality", videoMaxSec: "Longest video", preloadCount: "Load ahead" };
const SHEET = "choose:";

function Slideshow() {
  const prefs = getPrefs();
  const p = useStore(prefs.store, (x) => x.playback);
  const { sheet } = useScreen();
  const set = (patch: Partial<PlaybackSettings>) => prefs.setPlayback({ ...prefs.store.get().playback, ...patch });
  const open = (k: ChoiceKey) => getNav().openSheet(`${SHEET}${k}`);
  const valueOf = (k: ChoiceKey) => (CHOICES[k] as { value: unknown; label: string }[]).find((c) => c.value === p[k])?.label ?? String(p[k]);
  const choiceRow = (k: ChoiceKey) => (
    <button type="button" className="list-row" onClick={() => open(k)} aria-haspopup="dialog" data-testid={`slideshow-${k}`}>
      <span className="row-text">
        <b>{TITLES[k]}</b>
      </span>
      <span className="row-value">{valueOf(k)}</span>
      <ChevronRight aria-hidden className="row-chev" />
    </button>
  );
  const name = sheet?.startsWith(SHEET) ? sheet.slice(SHEET.length) : null;
  const picking = name && Object.hasOwn(CHOICES, name) ? (name as ChoiceKey) : null;

  return (
    <>
      <div className="list-label">
        <span>Style</span>
      </div>
      <StyleRow value={p.style} onChange={(style) => set({ style })} testId="slideshow-style" />
      <div className="list-group" data-flat>
        <div className="list-row">
          <span className="row-text">
            <b>Seconds per slide</b>
          </span>
          <Stepper label="seconds per slide" value={p.intervalSec} min={1} max={60} format={(v) => `${v} s`} onChange={(intervalSec) => set({ intervalSec })} testId="slideshow-seconds" />
        </div>
        {p.style === "classic" && (
          <div className="list-row">
            <span className="row-text">
              <b>Fit</b>
            </span>
            <Seg label="Fit" className="quick-fit" options={FITS} value={p.fit} onChange={(fit) => set({ fit })} testId="slideshow-fit" />
          </div>
        )}
        {p.style === "classic" && choiceRow("transition")}
        {choiceRow("quality")}
      </div>
      <div className="list-label">
        <span>Videos</span>
      </div>
      <div className="list-group" data-flat>
        <SwitchRow title="Mute videos" on={p.videoMuted} set={(videoMuted) => set({ videoMuted })} testId="slideshow-mute" />
        {choiceRow("videoMaxSec")}
      </div>
      <div className="list-label">
        <span>Playback</span>
      </div>
      <div className="list-group" data-flat>
        <SwitchRow title="Loop at the end" line="Off stops on the last post" on={p.loop} set={(loop) => set({ loop })} testId="slideshow-loop" />
        {choiceRow("preloadCount")}
      </div>
      <button type="button" className="text-btn settings-reset" onClick={() => set({ ...DEFAULT_PLAYBACK })} data-testid="slideshow-reset">
        Reset to defaults
      </button>
      {picking && (
        <Sheet title={TITLES[picking]} testId={`sheet-${picking}`}>
          <Menu label={TITLES[picking]}>
            {(CHOICES[picking] as { value: PlaybackSettings[ChoiceKey]; label: string }[]).map((c) => (
              <MenuRow
                key={String(c.value)}
                on={p[picking] === c.value}
                onPick={() => {
                  set({ [picking]: c.value } as Partial<PlaybackSettings>);
                  void getNav().back();
                }}
                testId={`choose-${String(c.value)}`}
              >
                {c.label}
              </MenuRow>
            ))}
          </Menu>
        </Sheet>
      )}
    </>
  );
}

// ---- For You ------------------------------------------------------------------

function ForYouPage() {
  const artists = getArtists();
  const hidden = useStore(artists.store, (s) => s.hidden);
  const signedIn = useStore(getSession().store, (x) => !!x.user && !x.link);
  return (
    <>
      <ul className="list-group">
        <li>
          <button type="button" className="list-row" onClick={() => getNav().push({ screen: { kind: "tune" }, play: null }, { from: "for-you" })} data-testid="for-you-tune">
            <span className="row-well" aria-hidden>
              <SlidersHorizontal />
            </span>
            <span className="row-text">
              <b>Tune</b>
              <small>Breadth, pinned and muted tags</small>
            </span>
            <ChevronRight aria-hidden className="row-chev" />
          </button>
        </li>
      </ul>
      {signedIn && (
        <>
          <div className="list-label">
            <span>Hidden artists</span>
            <span data-testid="hidden-count">{hidden.length}</span>
          </div>
          {hidden.length === 0 ? (
            <Note testId="hidden-none">None</Note>
          ) : (
            <>
              <ul className="list-group" data-testid="hidden-artists">
                {hidden.map((name) => (
                  <li key={name} className="list-row hidden-row" data-testid="hidden-artist" data-artist={name}>
                    <button type="button" className="hidden-who" onClick={() => openArtist(name)}>
                      <Avatar seed={name} className="row-mark" />
                      <span className="row-text">
                        <b>{label(name)}</b>
                        <small>Hidden from suggestions</small>
                      </span>
                    </button>
                    <button type="button" className="btn-tonal" data-size="compact" onClick={() => artists.unhide(name)} data-testid="hidden-show">
                      Show
                    </button>
                  </li>
                ))}
              </ul>
              <Note>They don&rsquo;t show in suggestions. Their posts still show if you follow them or search.</Note>
            </>
          )}
        </>
      )}
    </>
  );
}

// ---- App ----------------------------------------------------------------------

const KEYS: [string[], string][] = [
  [["←", "→"], "Previous, next"],
  [["Space"], "Pause, play"],
  [["L"], "Favorite"],
  [["I"], "Post info"],
  [["S"], "Quick settings"],
  [["F"], "Full screen"],
  [["O"], "Open on e621"],
  [["C"], "Copy share link"],
  [["Esc"], "Close the player"],
];

function AppPage() {
  const { sheet } = useScreen();
  return (
    <>
      <ul className="list-group">
        <li>
          <a className="list-row" href="/e621-slideshow.user.js" target="_blank" rel="noopener" data-testid="userscript-install">
            <span className="row-well" aria-hidden>
              <Download />
            </span>
            <span className="row-text">
              <b>e621 button</b>
              <small>Adds a Slideshow button to e621</small>
            </span>
            <ExternalLink aria-hidden className="row-chev" />
          </a>
        </li>
        <li>
          <button type="button" className="list-row" onClick={() => getNav().openSheet("keys")} aria-haspopup="dialog" data-testid="app-keys">
            <span className="row-well" aria-hidden>
              <Keyboard />
            </span>
            <span className="row-text">
              <b>Keyboard shortcuts</b>
              <small>On a computer</small>
            </span>
            <ChevronRight aria-hidden className="row-chev" />
          </button>
        </li>
      </ul>
      <ul className="list-group">
        <li>
          <button type="button" className="list-row" onClick={() => getNav().push({ screen: { kind: "settings", section: "classic" }, play: null }, { from: "settings" })} data-testid="app-classic">
            <span className="row-well" aria-hidden>
              <History />
            </span>
            <span className="row-text">
              <b>Classic slideshow</b>
              <small>The old one-page app, until all of it has moved here</small>
            </span>
            <ChevronRight aria-hidden className="row-chev" />
          </button>
        </li>
      </ul>
      <Note>The e621 button needs a userscript manager (Tampermonkey or Violentmonkey); opening the link offers to install it.</Note>
      <div className="list-label">
        <span>About</span>
      </div>
      <ul className="list-group" data-flat>
        <li className="list-row">
          <span className="row-text">
            <b>Version</b>
          </span>
          <span className="row-value" data-testid="app-version">
            {process.env.APP_VERSION}
          </span>
        </li>
        <li>
          <a className="list-row" href={SOURCE} target="_blank" rel="noopener noreferrer">
            <span className="row-text">
              <b>Source code</b>
            </span>
            <ExternalLink aria-hidden className="row-chev" />
          </a>
        </li>
      </ul>
      <Note>Not run by e621. It reads e621 with your own account and key.</Note>
      {sheet === "keys" && (
        <Sheet title="Keyboard shortcuts" testId="sheet-keys">
          <dl className="keys">
            {KEYS.map(([keys, what]) => (
              <div key={what} className="keys-row">
                <dt>{what}</dt>
                <dd>
                  {keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Sheet>
      )}
    </>
  );
}
