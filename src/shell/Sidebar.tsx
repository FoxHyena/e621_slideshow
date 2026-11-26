"use client";

/**
 * The sidebar on a computer (DESIGN.md "On a computer", proposed): the tab bar stood on its side.
 * A floating panel with the app mark, the four tabs on the tab bar's sliding capsule, Following's
 * count, Search with the "/" key, and the account at the bottom. 232 wide with names from 1100 px,
 * 68 and icons only from 900. Its own chunk: a phone never loads it.
 *
 * The goo pools in its foot (owner-picked, "Pool"), over the account row, which shows through in Goo
 * Ink; none with icons only. Not designed yet, so not here: the drop's flight into the pool, the wipe
 * on a computer, and the secret tab.
 */
import { CircleUser, Rss, Search, Settings, Sparkle, Users, type LucideIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import Avatar, { AppMark } from "@/components/Avatar";
import { Pool } from "@/components/Pool";
import type { Tab } from "@/nav/routes";
import { getFollows } from "@/state/follows";
import { getGoo } from "@/state/goo";
import { newOnFollowing } from "@/state/following";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";

const TABS: { tab: Tab; label: string; Icon: LucideIcon }[] = [
  { tab: "following", label: "Following", Icon: Rss },
  { tab: "for-you", label: "For You", Icon: Sparkle },
  { tab: "artists", label: "Artists", Icon: Users },
  { tab: "settings", label: "Settings", Icon: Settings },
];

const NARROW = "(max-width: 1099px)";
function useNarrow(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(NARROW);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(NARROW).matches,
    () => false,
  );
}

const plain = (e: React.MouseEvent) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const name = (n: string) => n.replaceAll("_", " ");
const hrefOf = (t: Tab) => (t === "settings" ? "/settings" : `/${t}`);

export interface SidebarProps {
  current: Tab;
  onTab: (t: Tab) => void;
  onSearch: () => void;
  hidden: boolean;
}

export default function Sidebar({ current, onTab, onSearch, hidden }: SidebarProps) {
  const narrow = useNarrow();
  const fresh = useStore(newOnFollowing, (n) => n);
  // a link's borrowed sign-in isn't this browser's account
  const user = useStore(getSession().store, (s) => (s.link ? null : (s.user?.name ?? null)));
  const follows = useStore(getFollows().store, (f) => (f.status === "ready" ? f.followed.size : null));
  const followsUser = useStore(getFollows().store, (f) => f.user);
  const goo = useStore(getGoo().store, (g) => g.count);
  const idx = Math.max(0, TABS.findIndex((t) => t.tab === current));
  // the account's follow count (one read of e621's list, shared with Artists and Settings)
  useEffect(() => {
    if (user && followsUser) void getFollows().ensure();
  }, [user, followsUser]);

  // "/" opens Search from anywhere but a field (DESIGN.md: the key well on the Search field).
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.repeat || e.isComposing || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      // (an open dialog keeps its keys; closed ones stay in the DOM, inert or hidden)
      const open = [...document.querySelectorAll<HTMLElement>("[role=dialog][aria-modal=true]")].some(
        (d) => !d.closest("[inert],[aria-hidden=true],[hidden]") && d.getClientRects().length > 0,
      );
      if (open) return;
      e.preventDefault();
      onSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, onSearch]);

  const tip = (label: string) => (narrow ? label : undefined);
  // (signed out, Following has no count of its own; the store may still hold the last account's)
  const who = user ? name(user) : "Not signed in";
  const line = user ? (follows !== null ? `${follows.toLocaleString("en-US")} follow${follows === 1 ? "" : "s"}` : "Signed in") : "Sign in";
  const badge = user && fresh.user === user && fresh.count > 0 && current !== "following" ? (fresh.count > 99 ? "99+" : `${fresh.count}${fresh.more ? "+" : ""}`) : null;

  return (
    <nav className="side" aria-label="Tabs" data-hidden={hidden || undefined} inert={hidden} data-testid="sidebar">
      {!narrow && (
        <Pool
          kind="side"
          n={goo}
          className="side-pool"
          ink={
            <span className="side-account side-pool-ink">
              <i className="side-avatar pool-ring" />
              <span className="side-who">
                <b>{who}</b>
                <small>{line}</small>
              </span>
            </span>
          }
        />
      )}
      <div className="side-brand">
        <AppMark className="side-mark" />
        <span className="side-name">Slideshow</span>
      </div>
      <div className="side-tabs">
        <span className="side-ind" aria-hidden style={{ transform: `translateY(${idx * 48}px)` }} />
        {TABS.map(({ tab, label, Icon }) => (
          <a
            key={tab}
            href={hrefOf(tab)}
            className="side-tab"
            aria-current={tab === current ? "page" : undefined}
            aria-label={tab === "following" && badge ? `${label}, ${badge} new` : undefined}
            title={tip(label)}
            data-testid={`tab-${tab}`}
            onClick={(e) => {
              if (!plain(e)) return;
              e.preventDefault();
              onTab(tab);
            }}
          >
            <Icon aria-hidden className="side-icon" />
            <span className="side-label">{label}</span>
            {tab === "following" && badge && (
              <span className="side-badge" aria-hidden data-testid="side-badge">
                {badge}
              </span>
            )}
          </a>
        ))}
      </div>
      <a
        href="/search"
        className="side-search"
        title={tip("Search")}
        aria-keyshortcuts="/"
        onClick={(e) => {
          if (!plain(e)) return;
          e.preventDefault();
          onSearch();
        }}
        data-testid="side-search"
      >
        <Search aria-hidden className="side-search-icon" />
        <span className="side-label">Search</span>
        <kbd className="side-key" aria-hidden>
          /
        </kbd>
      </a>
      <a
        href={hrefOf("settings")}
        className="side-account"
        title={tip(user ? who : "Sign in")}
        onClick={(e) => {
          if (!plain(e)) return;
          e.preventDefault();
          onTab("settings");
        }}
        data-testid="side-account"
      >
        {user ? <Avatar seed={user} className="side-avatar" /> : <CircleUser aria-hidden className="side-avatar side-nobody" />}
        <span className="side-who">
          <b>{who}</b>
          <small>{line}</small>
        </span>
      </a>
    </nav>
  );
}
