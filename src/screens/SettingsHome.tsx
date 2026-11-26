"use client";

/**
 * Settings' home (DESIGN.md "Settings"): the account, the groups, the goo row and the app foot. Its
 * own chunk, loaded when the tab opens or the page is idle, so it stays out of the first load.
 */
import { ChevronRight, Droplets, LogIn, Play, Shield, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import Avatar, { AppMark } from "@/components/Avatar";
import { turnMark } from "@/feed/motion";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/nav/routes";
import { SECTION_LABEL } from "@/shell/screens";
import { getFollows } from "@/state/follows";
import { getGoo, gooLabel } from "@/state/goo";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";

/** Settings' one action row (DESIGN.md "Tab bar goo"): how much goo, and Wipe clean. */
function GooRow() {
  const goo = getGoo();
  const n = useStore(goo.store, (s) => s.count);
  return (
    <div className="list-group">
      <div className="list-row" data-testid="goo-row">
        <span className="row-well" aria-hidden>
          <Droplets />
        </span>
        <span className="row-text">
          <b>Tab bar goo</b>
          <small data-testid="goo-count">{gooLabel(n)}</small>
        </span>
        <button type="button" className="btn-tonal" data-size="compact" onClick={() => goo.wipe()} disabled={n === 0} data-testid="goo-wipe">
          Wipe clean
        </button>
      </div>
    </div>
  );
}

/** What each Settings group holds, in a muted line under its name (DESIGN.md "Settings"). */
const SECTION_ROW: Record<Exclude<SettingsSection, "account" | "classic">, { icon: LucideIcon; line: string }> = {
  content: { icon: Shield, line: "Ratings and blacklist" },
  slideshow: { icon: Play, line: "Style, timing and videos" },
  "for-you": { icon: Sparkles, line: "What For You searches" },
  app: { icon: Smartphone, line: "Install, data and about" },
};

/** The account in its own group: who you are, or a way to sign in. */
function AccountRow({ open }: { open: (e: React.MouseEvent) => void }) {
  const { user, link } = useStore(getSession().store, (s) => s);
  const follows = useStore(getFollows().store, (f) => (f.status === "ready" ? f.followed.size : null));
  return (
    <ul className="list-group" aria-label="Account">
      <li>
        {/* the app's own router handles it (onClick), like every in-app link */}
        <a href={`/settings/${"account" satisfies SettingsSection}`} className="list-row" data-account={user ? "" : undefined} onClick={open} data-testid="settings-account">
          {user ? (
            <Avatar seed={user.name} className="row-mark-l" />
          ) : (
            <span className="row-well" aria-hidden>
              <LogIn />
            </span>
          )}
          <span className="row-text">
            <b>{user ? user.name.replaceAll("_", " ") : "Sign in to e621"}</b>
            <small>
              {user
                ? `${link ? "On a shared link" : "Signed in to e621"}${follows !== null && !link ? ` · ${follows.toLocaleString("en")} follows` : ""}`
                : "For your favorites, Following and For You"}
            </small>
          </span>
          <ChevronRight aria-hidden className="row-chev" />
        </a>
      </li>
    </ul>
  );
}

/** The app mark, the name and the version; tapping the mark turns it one notch. */
function AppFoot() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className="app-foot">
      <button type="button" ref={ref} aria-label="e621 Slideshow" onClick={() => turnMark(ref.current?.querySelector(".mark"))}>
        <AppMark seed="e621-slideshow" />
      </button>
      <b>e621 Slideshow</b>
      <small>Version {process.env.APP_VERSION}</small>
    </div>
  );
}

export function SettingsHome({ onSection }: { onSection: (s: SettingsSection) => void }) {
  const seconds = useStore(getPrefs().store, (p) => p.playback.intervalSec);
  const go = (s: SettingsSection) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSection(s);
  };
  return (
    <div className="screen-frame">
      <div className="title-row">
        <h1 tabIndex={-1} className="screen-title">
          Settings
        </h1>
      </div>
      <AccountRow open={go("account")} />
      <ul className="list-group" aria-label="Settings">
        {SETTINGS_SECTIONS.filter((s) => s !== "account").map((s) => {
          const { icon: Icon, line } = SECTION_ROW[s as Exclude<SettingsSection, "account" | "classic">];
          return (
            <li key={s}>
              <a href={`/settings/${s}`} className="list-row" onClick={go(s)}>
                <span className="row-well" aria-hidden>
                  <Icon />
                </span>
                <span className="row-text">
                  <b>{SECTION_LABEL[s]}</b>
                  <small>{line}</small>
                </span>
                {s === "slideshow" && <span className="row-value">{seconds} s</span>}
                <ChevronRight aria-hidden className="row-chev" />
              </a>
            </li>
          );
        })}
      </ul>
      <GooRow />
      <AppFoot />
    </div>
  );
}
