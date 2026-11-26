"use client";

/**
 * Screens that land in later slices (ENGINEERING.md §11). Each has its real heading, so
 * navigation, focus and Back can be tested now; the content arrives with its slice.
 */
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { SettingsSection } from "@/nav/routes";

export const SECTION_LABEL: Record<SettingsSection, string> = {
  account: "Account",
  content: "Content",
  slideshow: "Slideshow",
  "for-you": "For You",
  app: "App",
  classic: "Classic slideshow",
};

export function Frame({ title, onBack, children }: { title: string; onBack?: () => void; children?: ReactNode }) {
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
