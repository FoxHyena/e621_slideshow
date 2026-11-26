"use client";

/**
 * Settings' home (DESIGN.md "Settings"): the account, the groups, the goo row and the app foot. Its
 * own chunk, loaded when the tab opens or the page is idle, so it stays out of the first load.
 */
import { ChevronRight, LogIn, Play, Shield, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import Avatar, { AppMark } from "@/components/Avatar";
import { Wordmark } from "@/components/Wordmark";
import { popMark } from "@/feed/motion";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/nav/routes";
import { SECTION_LABEL } from "@/shell/screens";
import { TitleRow } from "@/shell/TitleRow";
import { getFollows } from "@/state/follows";
import { openSignIn } from "./actions";
import { GooRow } from "./GooRow";
import { getPrefs } from "@/state/prefs";
import { getSession } from "@/state/session";
import { useStore } from "@/state/store";

/** What each Settings group holds, in a muted line under its name (DESIGN.md "Settings"). */
const SECTION_ROW: Record<Exclude<SettingsSection, "account" | "classic">, { icon: LucideIcon; line: string }> = {
  content: { icon: Shield, line: "Ratings and blacklist" },
  slideshow: { icon: Play, line: "Style, timing and videos" },
  "for-you": { icon: Sparkles, line: "What For You searches" },
  app: { icon: Smartphone, line: "Install, data and about" },
};

/**
 * The account in its own group: who you are (a link to the Account page), or, signed out, a row with
 * Sign in right on it that brings up the sign-in sheet (owner, 2026-11-26: no page in between).
 */
function AccountRow({ open }: { open: (e: React.MouseEvent) => void }) {
  const { user, link } = useStore(getSession().store, (s) => s);
  const follows = useStore(getFollows().store, (f) => (f.status === "ready" ? f.followed.size : null));
  if (!user)
    return (
      <div className="list-group" role="group" aria-label="Account">
        <div className="list-row" data-testid="settings-account">
          <span className="row-well" aria-hidden>
            <LogIn />
          </span>
          <span className="row-text">
            <b>Sign in to e621</b>
            <small>For your favorites, Following and For You</small>
          </span>
          <button type="button" className="btn-gold" data-size="compact" onClick={openSignIn} data-testid="settings-sign-in">
            Sign in
          </button>
        </div>
      </div>
    );
  return (
    <ul className="list-group" aria-label="Account">
      <li>
        {/* the app's own router handles it (onClick), like every in-app link */}
        <a href={`/settings/${"account" satisfies SettingsSection}`} className="list-row" data-account="" onClick={open} data-testid="settings-account">
          <Avatar seed={user.name} className="row-mark-l" />
          <span className="row-text">
            <b>{user.name.replaceAll("_", " ")}</b>
            <small>{`${link ? "On a shared link" : "Signed in to e621"}${follows !== null && !link ? ` · ${follows.toLocaleString("en")} follows` : ""}`}</small>
          </span>
          <ChevronRight aria-hidden className="row-chev" />
        </a>
      </li>
    </ul>
  );
}

/** The app mark, the name and the version; tapping the mark pops it. */
function AppFoot() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className="app-foot">
      <button type="button" ref={ref} aria-label="eLicks21" onClick={() => popMark(ref.current?.querySelector(".mark"))}>
        <AppMark />
      </button>
      <Wordmark />
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
      <TitleRow title="Settings" />
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
      <GooRow jar />
      <AppFoot />
    </div>
  );
}
