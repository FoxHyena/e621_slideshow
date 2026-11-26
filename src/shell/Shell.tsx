"use client";

/**
 * The one persistent client shell (ENGINEERING.md §1). It renders the tab roots and the
 * pushed screens of the current history stack, each inside <Activity> so a hidden screen
 * keeps its state, and owns the tab bar, focus, scroll offsets and push/back motion.
 */
import { Activity, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { boot } from "@/nav/boot";
import { installEdgeSwipe } from "@/nav/edgeSwipe";
import { focusScreen, restoreFocus, trackOpeners } from "@/nav/focus";
import { getNav, type Entry, type NavState } from "@/nav/history";
import { restoreOffset, saveOffset } from "@/nav/scroll";
import { runTransition, type NavDirection } from "@/nav/transition";
import { activeTab, screenKey, tab as tabRoute, tabRoot, TABS, type Tab } from "@/nav/routes";
import { LegacyHome } from "./LegacyHome";
import { NotFoundScreen, PlaceholderScreen } from "./screens";
import { migrate } from "@/state/migrate";
import { TabBar } from "./TabBar";

/** The tab whose root this entry shows; the pre-boot `/` counts as Following. */
const rootOf = (e: Entry): Tab | null => tabRoot(e.route.screen) ?? (e.route.screen.kind === "root" ? "following" : null);

function direction(prev: NavState, next: NavState): NavDirection {
  const a = prev.stack[prev.index];
  const b = next.stack[next.index];
  if (a.key === b.key && screenKey(a.route.screen) === screenKey(b.route.screen)) return "none";
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
  const screenOf = (e: Entry) => screens.current.get(rootOf(e) ?? e.key) ?? null;

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
      const left = prev.stack[prev.index];
      const box = screenOf(left);
      // A screen already hidden by an earlier, uncommitted move reads 0: keep its last offset.
      if (box && box.getClientRects().length > 0) saveOffset(left.key, box);
      prev = next;
      // Commit the latest state, not `next`: a transition's callback runs later, and a quicker
      // move (a second Forward) may already have landed.
      runTransition(dir, () => setShown(nav.store.get()));
    });
    const before = nav.store.get();
    boot(nav);
    booting = false;
    if (nav.store.get() !== before) quiet.current = true;
    return () => {
      unsub();
      stopOpeners();
    };
  }, [nav]);

  useEffect(() => installEdgeSwipe(() => void nav.back({ gesture: true })), [nav]);

  // Desktop: Esc goes back (UX §8). The legacy home handles its own keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || isTyping(e.target)) return;
      const cur = nav.current();
      if (rootOf(cur) === "following" && !cur.route.play) return;
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

  const cur = shown.stack[shown.index];
  const curRoot = rootOf(cur);
  const lit = curRoot ?? activeTab(cur.route.screen, cur.from);

  // Tab roots mount on first visit and then stay (adjusting state while rendering).
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set(curRoot ? [curRoot] : []));
  if (curRoot && !visited.has(curRoot)) setVisited(new Set(visited).add(curRoot));

  // Pushed screens below and at the current entry; popped ones unmount.
  const pushed = shown.stack.slice(0, shown.index + 1).filter((e) => !rootOf(e));

  // Focus and scroll after the new screen is on screen.
  const last = useRef(shown);
  useLayoutEffect(() => {
    const prev = last.current;
    last.current = shown;
    if (prev === shown) return;
    const from = prev.stack[prev.index];
    const to = shown.stack[shown.index];
    if (from.key === to.key && screenKey(from.route.screen) === screenKey(to.route.screen)) return;
    if (quiet.current) {
      // Boot's own rewrite of a pasted URL: leave focus where the page load put it.
      quiet.current = false;
      return;
    }
    const el = screenOf(to);
    restoreOffset(to.key, el);
    if (shown.cause === "push") focusScreen(el);
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
    if ((await nav.goTab(t)) === "top") screenOf(nav.current())?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const barHidden = immersive && curRoot === "following";

  return (
    <div className="shell" data-immersive={barHidden || undefined}>
      <TabBar
        current={lit}
        hidden={barHidden}
        onTab={(t) => void onTab(t)}
        onSearch={() => nav.push({ screen: { kind: "search" }, play: null }, { from: lit })}
      />
      {visited.has("following") && (
        // Not in <Activity>: hiding would run the legacy app's effect cleanups, which dispose
        // its running show for good. Slice 3 replaces it with a real screen.
        <section ref={ref} data-id="following" className="screen screen-legacy" data-screen="following" hidden={curRoot !== "following"}>
          <LegacyHome active={curRoot === "following"} immersive={barHidden} onImmersive={setImmersive} />
        </section>
      )}
      {TABS.filter((t) => t !== "following" && visited.has(t)).map((t) => (
        <Activity key={t} mode={curRoot === t ? "visible" : "hidden"}>
          <section ref={ref} data-id={t} className="screen" data-screen={t}>
            <PlaceholderScreen
              screen={tabRoute(t).screen}
              onSection={(s) => nav.push({ screen: { kind: "settings", section: s }, play: null }, { from: "settings" })}
            />
          </section>
        </Activity>
      ))}
      {pushed.map((e) => (
        <Activity key={`${e.key}:${screenKey(e.route.screen)}`} mode={e === cur ? "visible" : "hidden"}>
          <section ref={ref} data-id={e.key} className="screen" data-screen={e.route.screen.kind}>
            {e.route.screen.kind === "notFound" ? (
              <NotFoundScreen path={e.route.screen.path} onHome={() => void nav.goTab("following")} />
            ) : (
              <PlaceholderScreen screen={e.route.screen} onBack={() => void nav.back()} onSection={() => {}} />
            )}
          </section>
        </Activity>
      ))}
    </div>
  );
}
