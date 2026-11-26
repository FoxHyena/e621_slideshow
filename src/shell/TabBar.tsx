"use client";

import { Rss, Search, Settings, Sparkle, Users, type LucideIcon } from "lucide-react";
import type { Tab } from "@/nav/routes";

const TABS: { tab: Tab; label: string; Icon: LucideIcon }[] = [
  { tab: "following", label: "Following", Icon: Rss },
  { tab: "for-you", label: "For You", Icon: Sparkle },
  { tab: "artists", label: "Artists", Icon: Users },
  { tab: "settings", label: "Settings", Icon: Settings },
];

/**
 * The floating tab bar (DESIGN.md "Tab bar"); a left rail at 900 px and up (UX §8).
 * `current` lights the tab; tapping the current tab's root asks the screen to scroll to top.
 */
export function TabBar({
  current,
  onTab,
  onSearch,
  hidden,
}: {
  current: Tab;
  onTab: (t: Tab) => void;
  onSearch: () => void;
  hidden: boolean;
}) {
  return (
    <nav className="tabbar" aria-label="Tabs" data-hidden={hidden || undefined} inert={hidden}>
      {TABS.map(({ tab, label, Icon }) => {
        const on = tab === current;
        return (
          <a
            key={tab}
            href={tab === "settings" ? "/settings" : `/${tab}`}
            className="tab"
            aria-current={on ? "page" : undefined}
            data-testid={`tab-${tab}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              onTab(tab);
            }}
          >
            <Icon aria-hidden className="tab-icon" />
            <span>{label}</span>
          </a>
        );
      })}
      <a
        href="/search"
        className="tab tab-rail-only"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onSearch();
        }}
      >
        <Search aria-hidden className="tab-icon" />
        <span>Search</span>
      </a>
    </nav>
  );
}
