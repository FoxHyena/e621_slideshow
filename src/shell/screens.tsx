"use client";

/**
 * Screens that land in later slices (ENGINEERING.md §11). Each has its real heading, so
 * navigation, focus and Back can be tested now; the content arrives with its slice.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { SETTINGS_SECTIONS, type Screen, type SettingsSection } from "@/nav/routes";

export const SECTION_LABEL: Record<SettingsSection, string> = {
  account: "Account",
  content: "Content",
  slideshow: "Slideshow",
  "for-you": "For You",
  app: "App",
};

function Frame({ title, onBack, children }: { title: string; onBack?: () => void; children?: ReactNode }) {
  return (
    <div className="screen-frame">
      <div className="screen-toolbar">
        {onBack && (
          <button type="button" className="toolbar-circle" aria-label="Back" onClick={onBack}>
            <ChevronLeft aria-hidden />
          </button>
        )}
      </div>
      <h1 tabIndex={-1} className="screen-title">
        {title}
      </h1>
      {children}
    </div>
  );
}

const Soon = ({ children }: { children: ReactNode }) => <p className="screen-note">{children}</p>;

export function PlaceholderScreen({
  screen,
  onBack,
  onSection,
}: {
  screen: Screen;
  onBack?: () => void;
  onSection: (s: SettingsSection) => void;
}) {
  switch (screen.kind) {
    case "tab":
      if (screen.tab === "for-you")
        return (
          <Frame title="For You">
            <Soon>Posts picked from your favorites will show up here. For now, start For You from the Following tab.</Soon>
          </Frame>
        );
      return (
        <Frame title="Artists">
          <Soon>The artists you follow, and ones you might like, will show up here.</Soon>
        </Frame>
      );
    case "settings":
      if (screen.section)
        return (
          <Frame title={SECTION_LABEL[screen.section]} onBack={onBack}>
            <Soon>These settings are moving here. Until then, they&rsquo;re in the panel on the Following tab.</Soon>
          </Frame>
        );
      return (
        <Frame title="Settings">
          <ul className="settings-group" aria-label="Settings">
            {SETTINGS_SECTIONS.map((s) => (
              <li key={s}>
                <a
                  href={`/settings/${s}`}
                  className="settings-row"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    onSection(s);
                  }}
                >
                  <span>{SECTION_LABEL[s]}</span>
                  <ChevronRight aria-hidden className="settings-chevron" />
                </a>
              </li>
            ))}
          </ul>
        </Frame>
      );
    case "tune":
      return (
        <Frame title="Tune For You" onBack={onBack}>
          <Soon>Choose what For You leans towards. Coming with the For You screen.</Soon>
        </Frame>
      );
    case "search":
      return (
        <Frame title="Search" onBack={onBack}>
          <Soon>Search e621 by tags. For now, search from the panel on the Following tab.</Soon>
        </Frame>
      );
    case "results":
      return (
        <Frame title="Results" onBack={onBack}>
          <Soon>Results for {new URLSearchParams(screen.params).get("tags") || "all posts"} will show up here.</Soon>
        </Frame>
      );
    case "favorites":
      return (
        <Frame title="Favorites" onBack={onBack}>
          <Soon>Your e621 favorites will show up here.</Soon>
        </Frame>
      );
    case "artist":
      return (
        <Frame title={screen.name} onBack={onBack}>
          <Soon>This artist&rsquo;s posts will show up here.</Soon>
        </Frame>
      );
    case "notFound":
    case "root":
      return null;
  }
}

export function NotFoundScreen({ path, onHome }: { path: string; onHome: () => void }) {
  return (
    <Frame title="Page not found">
      <p className="screen-note">
        There&rsquo;s nothing at <span className="break-all text-fg">{path}</span>.
      </p>
      <button type="button" className="btn-gold mt-6" onClick={onHome}>
        Go to Following
      </button>
    </Frame>
  );
}
