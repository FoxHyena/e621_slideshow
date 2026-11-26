"use client";

/**
 * The states that replace content (DESIGN.md "States (landing, empty, error, offline)"): Goo, a
 * headline, one sentence that says why, then the way out. Empty states sit on the ground; an error
 * sits in a panel where the first post would be; offline is a sunk banner, not a state.
 */
import { Wifi, WifiOff } from "lucide-react";
import { lazy, Suspense, useSyncExternalStore, type ReactNode } from "react";
import { createStore, type Store } from "@/state/store";
import { Goo, type GooMood } from "./Goo";

export function StateBlock({
  mood,
  head,
  text,
  extra,
  actions,
  size = 112,
  screen,
  testId,
}: {
  mood: GooMood;
  head: string;
  text: ReactNode;
  /** between the sentence and the actions (an error's capsule) */
  extra?: ReactNode;
  actions?: ReactNode;
  size?: number;
  /** the whole screen's answer: 64 below what's above it */
  screen?: boolean;
  testId?: string;
}) {
  return (
    <div className="state" data-screen={screen || undefined} data-testid={testId}>
      <Goo mood={mood} size={size} />
      <h2 className="state-head">{head}</h2>
      <p className="state-text">{text}</p>
      {(extra || actions) && (
        <div className="state-acts">
          {extra}
          {actions}
        </div>
      )}
    </div>
  );
}

/** The second, lesser way out ("Search instead"): no fill, Link Blue. */
export function QuietButton({ children, onClick, testId }: { children: ReactNode; onClick: () => void; testId?: string }) {
  return (
    <button type="button" className="btn-quiet" onClick={onClick} data-testid={testId}>
      {children}
    </button>
  );
}

/**
 * Loaded when the page is idle (src/shell/lazy.ts) or when one is needed, so a cold load doesn't carry
 * them. If the chunk can't come (offline before the idle prefetch ran), a plain panel stands in: the
 * failure is still said, with its way out, just without Goo's art.
 */
const panels = () => import("./StatePanels");
interface PanelProps {
  error?: string;
  onRetry?: () => void;
  onNow?: () => void;
  waitMs?: number;
}
type Panel = (p: PanelProps) => ReactNode;
const plain = (head: string, act: string): { default: Panel } => ({
  default: (p) => (
    <div className="state-panel" role="alert">
      <h2 className="state-head">{head}</h2>
      {p.error && <p className="state-text">{p.error}</p>}
      <div className="state-acts">
        <button type="button" className="btn-tonal" onClick={p.onRetry ?? p.onNow} data-testid="state-retry">
          {act}
        </button>
      </div>
    </div>
  ),
});
const LazyError = lazy(() => panels().then((m) => ({ default: m.ErrorPanel as Panel }), () => plain("e621 didn't answer", "Try again")));
const LazySlowPanel = lazy(() => panels().then((m) => ({ default: m.SlowDownPanel as Panel }), () => plain("e621 asked us to slow down", "Try now")));
const LazySlowRow = lazy(() => panels().then((m) => ({ default: m.SlowDownRow as Panel }), () => plain("e621 asked us to slow down", "Try now")));

/**
 * A load that failed, in a panel where the first post would be: Goo says oops, what e621 said sits
 * in a capsule, and Try again. A wrong sign-in is the one failure that isn't the site's.
 */
export function ErrorPanel(p: { error: string; onRetry: () => void; testId?: string }) {
  return (
    <Suspense fallback={<div className="state-panel" aria-busy />}>
      <LazyError {...p} />
    </Suspense>
  );
}

/** e621 asked us to slow down: Goo snoozes, the sentence counts down, Try now skips the wait. */
export function SlowDownPanel(p: { waitMs: number; onNow: () => void }) {
  return (
    <Suspense fallback={<div className="state-panel" aria-busy />}>
      <LazySlowPanel {...p} />
    </Suspense>
  );
}

/** Loading more hit e621's limit: the same wait, as the feed's last row. */
export function SlowDownRow(p: { waitMs: number; onNow: () => void }) {
  return (
    <Suspense fallback={<div className="feed-more-row" aria-busy />}>
      <LazySlowRow {...p} />
    </Suspense>
  );
}

const NUMBER = ["No", "One", "Two", "Three", "Four", "Five"];

/**
 * Why a search shows nothing, in real counts: "Two filters are on, and 3 posts are hidden by your
 * blacklist." With nothing on and nothing hidden, e621 has nothing for it.
 */
export function noMatchSentence(filtersOn: number, stats: { blacklisted: number; hidden: number }): string {
  const parts: string[] = [];
  if (filtersOn > 0) parts.push(`${NUMBER[filtersOn] ?? filtersOn} ${filtersOn === 1 ? "filter is" : "filters are"} on`);
  const posts = (n: number) => `${n} ${n === 1 ? "post is" : "posts are"}`;
  if (stats.blacklisted > 0) parts.push(`${posts(stats.blacklisted)} hidden by your blacklist`);
  if (stats.hidden > 0) parts.push(`${stats.hidden} ${stats.hidden === 1 ? "post needs" : "posts need"} you signed in`);
  if (parts.length === 0) return "Nothing on e621 matches this search.";
  const s = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
  // later clauses start lower case; only the first word is a sentence start
  return `${s[0].toUpperCase()}${s.slice(1)}.`;
}

/**
 * An empty feed with no filters of its own (For You's window, an artist, Popular): Goo snoozes and
 * says why, unless the blacklist or sign-in took what was there, which it then counts.
 */
export function quietEmpty(head: string, text: string, { screen, testId }: { screen?: boolean; testId?: string } = {}) {
  return function QuietEmpty(stats: { blacklisted: number; hidden: number }) {
    const took = stats.blacklisted + stats.hidden > 0;
    return <StateBlock mood={took ? "look" : "snooze"} screen={screen} head={head} text={took ? noMatchSentence(0, stats) : text} testId={testId} />;
  };
}

/** The connection, and "just came back" for 2 s after it does. */
interface Net {
  online: boolean;
  back: boolean;
}
let net: Store<Net> | null = null;
function netStore(): Store<Net> {
  if (net) return net;
  const s = createStore<Net>({ online: typeof navigator === "undefined" || navigator.onLine, back: false });
  let t: ReturnType<typeof setTimeout> | undefined;
  if (typeof window !== "undefined") {
    window.addEventListener("offline", () => {
      clearTimeout(t);
      s.set({ online: false, back: false });
    });
    window.addEventListener("online", () => {
      s.set({ online: true, back: true });
      clearTimeout(t);
      t = setTimeout(() => s.set({ online: true, back: false }), 2000);
    });
  }
  return (net = s);
}

const ONLINE: Net = { online: true, back: false };

/**
 * Offline: a sunk banner under the header. When the connection comes back it says so in white with
 * a green icon for 2 s, then leaves.
 */
export function OfflineBanner() {
  const s = netStore();
  // the server can't know, so it says online; a client that loaded offline shows the banner after hydrating
  const { online, back } = useSyncExternalStore(s.subscribe, s.get, () => ONLINE);
  if (online && !back) return null;
  // in the first load, not the lazy panels: offline, no chunk can come
  return (
    <div className="state-banner" data-ok={online || undefined} role="status" data-testid="offline-banner">
      {online ? <Wifi aria-hidden /> : <WifiOff aria-hidden />}
      <span>{online ? "Back online" : "You're offline. Showing what's loaded."}</span>
    </div>
  );
}
