"use client";

/**
 * Following's first run after sign-in (DESIGN.md "First run after sign-in", UX.md Following §5):
 * you follow no one yet, so Following reads your favorites and offers the artists you favorite a
 * lot, the top ten picked. One tap follows them all in one request. "Skip for now" folds it into a
 * row above Popular today. Its own chunk: only an account that follows no one needs it.
 */
import { Check, ChevronRight, Heart, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";
import { Goo } from "@/components/Goo";
import { StateBlock } from "@/components/State";
import { TryAgain } from "@/components/StatePanels";
import { compact } from "@/lib/feed/format";
import { LIST_TOP, PICKED, type ArtistSuggestion } from "@/lib/recommend/artists";
import { storage } from "@/lib/storage";
import { getNav } from "@/nav/history";
import { Sheet } from "@/shell/Sheet";
import { getArtists, type ArtistsState, type ReadStep } from "@/state/artists";
import { FOLLOW_LIMIT, getFollows } from "@/state/follows";
import { getSession } from "@/state/session";
import { shallow, useStore } from "@/state/store";

export interface FirstRunProps {
  /** the title row with `right` in place of the tools */
  head: (right?: ReactNode) => ReactNode;
  /** Popular today, under the skipped row */
  popular: ReactNode;
}

const STEPS: [ReadStep, string][] = [
  ["favorites", "Read your favorites"],
  ["artists", "Count your artists"],
  ["posts", "See who still posts"],
];

const name = (n: string) => n.replaceAll("_", " ");

export function FirstRun({ head, popular }: FirstRunProps) {
  const session = useStore(getSession().store, (s) => ({ user: s.user?.name ?? null, remember: s.remember }), shallow);
  const artists = getArtists();
  const a = useStore(artists.store, (s) => s);
  const [skipped, setSkipped] = useState(() => (session.user ? storage.loadFirstRunSkipped(session.user) : false));

  // again when the account arrives or changes (the store forgets a request with the account)
  useEffect(() => {
    artists.ensure();
  }, [artists, a.user]);

  const skip = (on: boolean) => {
    if (session.user) storage.saveFirstRunSkipped(session.user, on, session.remember);
    setSkipped(on);
  };
  const skipButton = (
    <button type="button" className="btn-quiet" onClick={() => skip(true)} data-testid="first-run-skip">
      Skip for now
    </button>
  );

  if (skipped) {
    const offer = a.status === "reading" || a.status === "idle" || a.list.length > 0;
    return (
      <>
        {head()}
        {offer ? (
          <div className="list-group first-skipped">
            <button type="button" className="list-row" onClick={() => skip(false)} data-testid="first-run-resume">
              <span className="row-well" data-tone="pink" aria-hidden>
                <Heart />
              </span>
              <span className="row-text">
                <b>Follow from your favorites</b>
                <small>{a.status === "ready" ? `${Math.min(a.list.length, LIST_TOP)} artists you favorite a lot` : "Artists you favorite a lot"}</small>
              </span>
              <ChevronRight aria-hidden className="row-chev" />
            </button>
          </div>
        ) : (
          <StateBlock
            mood="snooze"
            head="You don't follow anyone yet"
            text="Tap Follow on an artist, and their new posts show up here first."
            testId="following-none"
          />
        )}
        {popular}
      </>
    );
  }

  if (a.status === "error")
    return (
      <>
        {head()}
        <div className="state-panel" role="alert" data-testid="first-run-error">
          <StateBlock
            mood="oops"
            size={96}
            head="Couldn't read your favorites"
            text="e621 didn't answer. Nothing was changed."
            actions={
              <>
                <TryAgain onClick={() => artists.ensure(true)} testId="state-retry" />
                {skipButton}
              </>
            }
          />
        </div>
      </>
    );

  if (a.status === "ready" && a.list.length === 0)
    return (
      <>
        {head()}
        <StateBlock
          mood="look"
          head="Find artists to follow"
          text={
            a.favorites === 0
              ? "You have no favorites yet, so there is nothing to suggest from."
              : "No artist turns up often enough in your favorites to suggest yet."
          }
          actions={
            <button type="button" className="btn-tonal" onClick={() => getNav().push({ screen: { kind: "search" }, play: null }, { from: "following" })}>
              <Search aria-hidden className="state-icon" />
              Search
            </button>
          }
          testId="first-run-none"
        />
        {popular}
      </>
    );

  if (a.status !== "ready")
    return (
      <>
        {head()}
        <Reading a={a} skip={skipButton} />
      </>
    );

  return <Pick list={a.list.slice(0, LIST_TOP)} head={head(skipButton)} />;
}

/** "640 of 1,284 · about 20 s": e621 hands favorites over 320 a page, about a second each. */
function readSub(a: ArtistsState): { line: string; num: string | null } {
  const n = (x: number) => x.toLocaleString("en-US");
  if (a.step === "favorites" || a.step === null) {
    if (a.done == null || !a.total) return { line: "Reading your favorites", num: null };
    const secs = Math.max(1, Math.ceil((a.total - a.done) / 320));
    return { line: "Reading your favorites", num: `${n(a.done)} of ${n(a.total)} · about ${secs} s` };
  }
  if (a.step === "artists") return { line: "Counting your artists", num: a.done != null && a.total ? `${n(a.done)} of ${n(a.total)}` : null };
  return { line: "Seeing who still posts", num: a.found != null ? `${n(a.found)} artists` : null };
}

export function Reading({ a, skip }: { a: ArtistsState; skip?: ReactNode }) {
  const at = a.step === "artists" ? 1 : a.step === "posts" ? 2 : 0;
  const sub = readSub(a);
  const notes = [a.favorites ? a.favorites.toLocaleString("en-US") : "", a.found != null ? `${a.found}` : "", ""];
  return (
    <div className="state first-read" data-screen data-testid="first-run-read">
      <Goo mood="busy" size={112} />
      <h2 className="state-head">Finding artists you love</h2>
      <p className="state-text">
        <span role="status">{sub.line}</span>
        {sub.num && (
          <>
            <br />
            <span className="first-num">{sub.num}</span>
          </>
        )}
      </p>
      <ol className="first-steps" aria-label="Steps">
        {STEPS.map(([id, label], i) => {
          const state = i < at ? "done" : i === at ? "now" : "todo";
          return (
            <li key={id} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span className="first-step-n" aria-hidden>
                {state === "done" ? <Check strokeWidth={2.8} /> : state === "now" ? <i className="first-spin" /> : i + 1}
              </span>
              <span>{label}</span>
              {state === "done" && notes[i] && <em>{notes[i]}</em>}
            </li>
          );
        })}
      </ol>
      {skip && <div className="state-acts">{skip}</div>}
    </div>
  );
}

/**
 * The list is the screen: a row is a checkbox, the top ten start picked, one gold button follows
 * them. In a sheet (Artists › Suggested), the button is the sheet's footer and following closes it.
 */
export function Pick({ list, head, inSheet = false }: { list: ArtistSuggestion[]; head?: ReactNode; inSheet?: boolean }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(list.slice(0, PICKED).map((c) => c.name)));
  const [just, setJust] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const followed = useStore(getFollows().store, (s) => s.followed.size);
  const room = Math.max(0, FOLLOW_LIMIT - followed);
  // only what's on the list counts (a name followed or hidden since it opened doesn't)
  const n = list.filter((c) => picked.has(c.name)).length;

  const toggle = (who: string) => {
    const next = new Set(picked);
    if (next.has(who)) next.delete(who);
    else next.add(who);
    setJust(next.has(who) ? who : null);
    setPicked(next);
  };

  const go = async () => {
    const names = list.filter((c) => picked.has(c.name)).map((c) => c.name);
    // The follow shows at once (optimistic), so a sheet closes at the tap: a Back after the answer
    // could leave the screen if the sheet was already closed.
    if (inSheet) void getNav().back();
    setBusy(true);
    const res = await getFollows().followMany(names);
    setBusy(false);
    if (!res) return;
    const k = res.skipped.length;
    const done = res.added.length;
    toast(done ? `Following ${done} artist${done === 1 ? "" : "s"}` : "No one was followed", {
      id: "follow:many",
      description: k ? `${k} skipped: ${res.skipped.map((x) => `${name(x.name)} (${x.reason})`).join(", ")}` : undefined,
    });
    // The list goes (Following turns into the feed): focus lands on the title, not nowhere.
    if (!inSheet) requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-screen="following"] h1')?.focus({ preventScroll: true }));
  };

  const label = busy ? "Following…" : n === 0 ? "Pick artists to follow" : n > room ? `e621 allows ${FOLLOW_LIMIT} follows (${room} left)` : `Follow ${n} artist${n === 1 ? "" : "s"}`;
  const off = busy || n === 0 || n > room;

  const button = (
    <button type="button" className="btn-gold" disabled={off} onClick={() => void go()} data-testid="first-run-follow">
      {!off && <Heart aria-hidden fill="currentColor" />}
      {label}
    </button>
  );
  const body = (
    <>
      <p className="screen-sub first-sub">You&apos;ve favorited these artists a lot. Follow them?</p>
      <div className="list-label">
        <span>Top {list.length}</span>
        <span className="list-label-two">
          <button type="button" onClick={() => setPicked(new Set(list.map((c) => c.name)))} data-testid="pick-all">
            Select all
          </button>
          <button type="button" onClick={() => setPicked(new Set())} data-testid="pick-none">
            None
          </button>
        </span>
      </div>
      <ul className="list-group" role="group" aria-label="Artists to follow">
        {list.map((c) => {
          const on = picked.has(c.name);
          return (
            <li key={c.name}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className="list-row pick-row"
                data-just={just === c.name || undefined}
                onClick={() => toggle(c.name)}
                data-testid="pick-row"
              >
                <Avatar seed={c.name} className="row-mark" />
                <span className="row-text">
                  <b>{name(c.name)}</b>
                  <small>
                    you faved {c.favs}
                    {c.posts > 0 && ` · ${compact(c.posts)} posts`}
                  </small>
                </span>
                <span className="pick-check" aria-hidden>
                  <Check strokeWidth={3} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
  if (inSheet)
    return (
      <Sheet title="Follow from favorites" footer={<div className="sheet-cta">{button}</div>} testId="sheet-follow-favorites">
        <div className="first-pick-sheet" data-testid="first-run-pick">
          {body}
        </div>
      </Sheet>
    );
  return (
    <div className="first-pick" data-testid="first-run-pick">
      {head}
      {body}
      <div className="first-cta">{button}</div>
    </div>
  );
}
