"use client";

/**
 * The one persistent client shell (ENGINEERING.md §1). It renders the tab roots and the
 * pushed screens of the current history stack, each inside <Activity> so a hidden screen
 * keeps its state, and owns the tab bar, focus, scroll offsets and push/back motion.
 */
import { Activity, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { boot } from "@/nav/boot";
import { installEdgeSwipe } from "@/nav/edgeSwipe";
import { focusScreen, restoreFocus, trackOpeners } from "@/nav/focus";
import { baseIndex, getNav, isOverlay, type Entry, type NavState } from "@/nav/history";
import { lockScroll, restoreOffset, saveOffset, unlockScroll } from "@/nav/scroll";
import { runTransition, type NavDirection } from "@/nav/transition";
import { activeTab, screenKey, tab as tabRoute, tabRoot, TABS, type Tab } from "@/nav/routes";
import { LegacyHome } from "./LegacyHome";
import { FollowingScreen } from "@/screens/Following";
import { migrate } from "@/state/migrate";
import { getSession } from "@/state/session";
import { Toaster, toast } from "sonner";
import { ScreenContext } from "./context";
import { TabBar } from "./TabBar";
import { ArtistScreen, ArtistsScreen, FavoritesScreen, ForYouScreen, NotFoundScreen, PlaceholderScreen, Player, prefetchScreens, ResultsScreen, SearchScreen, SettingsPage, SignInSheet, TuneScreen } from "./lazy";
import { SIGN_IN_SHEET } from "@/nav/routes";

/** The tab whose root this entry shows; the pre-boot `/` counts as Following. */
const rootOf = (e: Entry): Tab | null => tabRoot(e.route.screen) ?? (e.route.screen.kind === "root" ? "following" : null);

/**
 * Settings › Account holds the legacy app until slice 7 (sign-in, and the settings not moved yet).
 * It's one screen however many entries show it, kept mounted outside <Activity>: hiding there would
 * run its effect cleanups, which dispose a running show for good.
 */
/** The old app (`/settings/classic`) while its flows are ported: kept mounted once opened. */
const isAccount = (e: Entry) => e.route.screen.kind === "settings" && e.route.screen.section === "classic";
const ACCOUNT_ID = "classic";

/** The entry whose screen is on show (under any player or sheet). */
const baseOf = (s: NavState): Entry => s.stack[baseIndex(s.stack, s.index)];
/** Scroll offsets belong to a screen, not an entry: `replace` (a tab, a new filter) keeps the key. */
const offsetKey = (e: Entry) => `${e.key}:${screenKey(e.route.screen)}`;
const sameScreen = (a: Entry, b: Entry) => a.key === b.key && screenKey(a.route.screen) === screenKey(b.route.screen);

function direction(prev: NavState, next: NavState): NavDirection {
  const a = baseOf(prev);
  const b = baseOf(next);
  // Opening or closing the player or a sheet: the overlay animates itself.
  if (sameScreen(a, b)) return "none";
  if (rootOf(a) && rootOf(b)) return "tab";
  switch (next.cause) {
    case "push":
      return "push";
    case "back":
      return "back";
    case "replace":
      return activeTab(a.route.screen, a.from) !== activeTab(b.route.screen, b.from) ? "tab" : "none";
    default:
      return "none";
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export default function Shell() {
  const [nav] = useState(() => {
    migrate();
    return getNav();
  });
  const [shown, setShown] = useState(() => nav.store.get());
  const [immersive, setImmersive] = useState(false);

  const screens = useRef(new Map<string, HTMLElement>());
  const screenOf = (e: Entry) => screens.current.get(isAccount(e) ? ACCOUNT_ID : (rootOf(e) ?? e.key)) ?? null;

  // Boot runs in a layout effect, not in render: it writes history, and Next's patched
  // pushState updates the router, which React forbids while another component renders.
  const quiet = useRef(false);
  // Mirror the nav store into render state, inside a View Transition for push and back.
  useLayoutEffect(() => {
    const stopOpeners = trackOpeners(nav);
    let prev = nav.store.get();
    let booting = true;
    const unsub = nav.store.subscribe(() => {
      const next = nav.store.get();
      const dir = booting ? "none" : direction(prev, next);
      const left = baseOf(prev);
      const box = screenOf(left);
      // A screen already hidden by an earlier, uncommitted move reads 0: keep its last offset.
      if (!sameScreen(left, baseOf(next)) && box && box.getClientRects().length > 0) saveOffset(offsetKey(left));
      prev = next;
      // Commit the latest state, not `next`: a transition's callback runs later, and a quicker
      // move (a second Forward) may already have landed.
      runTransition(dir, () => setShown(nav.store.get()));
    });
    const before = nav.store.get();
    boot(nav);
    getSession()
      .verify()
      .catch((e: Error) => toast.error(`e621 sign-in failed: ${e.message}`, { id: "sign-in-failed" }));
    booting = false;
    if (nav.store.get() !== before) quiet.current = true;
    return () => {
      unsub();
      stopOpeners();
    };
  }, [nav]);

  useEffect(() => installEdgeSwipe(() => void nav.back({ gesture: true })), [nav]);
  useEffect(() => prefetchScreens(), []);

  // Desktop: Esc goes back (UX §8). The legacy home handles its own keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || isTyping(e.target)) return;
      const cur = nav.current();
      if (isAccount(cur) && !isOverlay(cur)) return;
      // An open dialog handles Esc itself (closed ones stay in the DOM, inert or hidden).
      const open = [...document.querySelectorAll<HTMLElement>("[role=dialog][aria-modal=true]")].some(
        (d) => !d.closest("[inert],[aria-hidden=true],[hidden]") && d.getClientRects().length > 0,
      );
      if (open) return;
      void nav.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  const top = shown.stack[shown.index];
  const cur = baseOf(shown);
  // An overlay with nothing under it (a reload) shows its own screen too.
  const overlay = isOverlay(top) ? top : null;
  const curRoot = rootOf(cur);
  const lit = curRoot ?? activeTab(cur.route.screen, cur.from);

  // Tab roots mount on first visit and then stay (adjusting state while rendering). Not for the
  // pre-boot `/`: a share link moves on to its Results, and Following would fetch for nothing.
  const visit = cur.route.screen.kind === "root" ? null : curRoot;
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set(visit ? [visit] : []));
  if (visit && !visited.has(visit)) setVisited(new Set(visited).add(visit));
  // Each tab root's latest entry: a hidden root keeps its own, so its feed stays bound to it.
  const [roots, setRoots] = useState<Partial<Record<Tab, Entry>>>(() => (curRoot ? { [curRoot]: cur } : {}));
  if (curRoot && roots[curRoot] !== cur) setRoots({ ...roots, [curRoot]: cur });

  // Pushed screens below and at the current entry; popped ones unmount. Overlays aren't screens.
  const pushed = shown.stack
    .slice(0, shown.index + 1)
    .filter((e, i) => !rootOf(e) && !isAccount(e) && baseIndex(shown.stack, i) === i);
  const onAccount = isAccount(cur);
  const [accountMounted, setAccountMounted] = useState(onAccount);
  if (onAccount && !accountMounted) setAccountMounted(true);

  // Focus and scroll after the new screen is on screen.
  const last = useRef(shown);
  useLayoutEffect(() => {
    const prev = last.current;
    last.current = shown;
    if (prev === shown) return;
    const from = baseOf(prev);
    const to = baseOf(shown);
    const left = prev.stack[prev.index];
    // Boot's own rewrite of a pasted URL: leave focus where the page load put it.
    const wasQuiet = quiet.current;
    quiet.current = false;
    if (sameScreen(from, to)) {
      // An overlay closed (a sheet over the player included): focus goes back to what opened it.
      const now = shown.stack[shown.index];
      if (isOverlay(left) && left.key !== now.key && (shown.cause === "back" || shown.cause === "pop")) {
        const box = isOverlay(now) ? document.querySelector<HTMLElement>("[data-testid=player]") : screenOf(to);
        restoreFocus(left.key, box);
      }
      return;
    }
    if (wasQuiet) return;
    const el = screenOf(to);
    restoreOffset(offsetKey(to));
    // The legacy account panel has no heading: focus its box, not a row left behind on Settings.
    if (shown.cause === "push") {
      if (isAccount(to)) el?.focus({ preventScroll: true });
      else focusScreen(el);
    }
    else if (shown.cause === "back" || shown.cause === "pop") restoreFocus(from.key, el);
  }, [shown]);

  // One stable ref callback; each screen names itself in data-id.
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el?.dataset.id) return;
    const id = el.dataset.id;
    const map = screens.current;
    map.set(id, el);
    return () => {
      if (map.get(id) === el) map.delete(id);
    };
  }, []);

  const onTab = async (t: Tab) => {
    if ((await nav.goTab(t)) === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The player and sheets hold the page still underneath them.
  const held = overlay !== null;
  useLayoutEffect(() => {
    if (!held) return;
    lockScroll();
    return unlockScroll;
  }, [held]);

  const barHidden = (immersive && onAccount) || overlay?.route.play != null;
  const ctx = (e: Entry, visible: boolean) => ({
    entry: e,
    visible,
    sheet: visible ? (overlay?.sheet ?? null) : null,
    play: visible ? (overlay?.route.play ?? null) : null,
  });

  return (
    <div className="shell" data-immersive={barHidden || undefined}>
      {!barHidden && <div className="bottom-scrim" aria-hidden />}
      <TabBar
        current={lit}
        hidden={barHidden}
        onTab={(t) => void onTab(t)}
        onSearch={() => nav.push({ screen: { kind: "search" }, play: null }, { from: lit })}
      />
      {accountMounted && (
        <section
          ref={ref}
          data-id={ACCOUNT_ID}
          className="screen screen-legacy"
          data-screen="classic"
          hidden={!onAccount}
          tabIndex={-1}
          aria-label="Classic slideshow"
        >
          <LegacyHome active={onAccount} immersive={barHidden} onImmersive={setImmersive} />
        </section>
      )}
      {TABS.filter((t) => visited.has(t)).map((t) => (
        <Activity key={t} mode={curRoot === t ? "visible" : "hidden"}>
          <section ref={ref} data-id={t} className="screen" data-screen={t}>
            {(t === "for-you" || t === "following" || t === "artists") && roots[t] ? (
              <ScreenContext value={ctx(curRoot === t ? cur : roots[t]!, curRoot === t)}>
                <Suspense fallback={null}>{t === "following" ? <FollowingScreen /> : t === "artists" ? <ArtistsScreen /> : <ForYouScreen />}</Suspense>
              </ScreenContext>
            ) : (
              <Suspense fallback={null}>
                <PlaceholderScreen
                  screen={tabRoute(t).screen}
                  onSection={(s) => nav.push({ screen: { kind: "settings", section: s }, play: null }, { from: "settings" })}
                />
              </Suspense>
            )}
          </section>
        </Activity>
      ))}
      {pushed.map((e) => (
        <Activity key={`${e.key}:${screenKey(e.route.screen)}`} mode={e === cur ? "visible" : "hidden"}>
          <section ref={ref} data-id={e.key} className="screen" data-screen={e.route.screen.kind}>
            <ScreenContext value={ctx(e, e === cur)}>
              <Suspense fallback={null}>
                <PushedScreen e={e} />
              </Suspense>
            </ScreenContext>
          </section>
        </Activity>
      ))}
      {overlay?.sheet === SIGN_IN_SHEET && (
        <Suspense fallback={null}>
          <SignInSheet />
        </Suspense>
      )}
      {overlay?.route.play != null && (
        <Suspense fallback={null}>
          <Player key={cur.key} base={cur} top={overlay} />
        </Suspense>
      )}
      <Toaster position="bottom-center" theme="dark" duration={6000} offset={{ bottom: "calc(var(--stack-top) + 12px)" }} mobileOffset={{ bottom: "calc(var(--stack-top) + 12px)" }} />
    </div>
  );
}

function PushedScreen({ e }: { e: Entry }) {
  const nav = getNav();
  const screen = e.route.screen;
  switch (screen.kind) {
    case "notFound":
      return <NotFoundScreen path={screen.path} onHome={() => void nav.goTab("following")} />;
    case "search":
      return <SearchScreen />;
    case "results":
      return <ResultsScreen params={screen.params} />;
    case "favorites":
      return <FavoritesScreen params={screen.params} />;
    case "artist":
      return <ArtistScreen name={screen.name} params={screen.params ?? ""} />;
    case "tune":
      return <TuneScreen />;
    case "settings":
      if (screen.section && screen.section !== "classic") return <SettingsPage section={screen.section} />;
      return null;
    default:
      return <PlaceholderScreen screen={screen} onBack={() => void nav.back()} onSection={() => {}} />;
  }
}
