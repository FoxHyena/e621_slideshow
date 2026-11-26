"use client";

import { Info } from "lucide-react";
import { openSignIn } from "@/screens/actions";

/**
 * A link visit on a browser with no account: e621's blacklist for you isn't applied (DESIGN.md "Not
 * signed in on this browser"). Sunk on Results; in the player's glass over the show's first 4 s.
 */
export function NotSignedIn({ glass }: { glass?: boolean }) {
  return (
    <div className="nobody-banner" data-glass={glass || undefined} role="note" data-testid="nobody-banner">
      <Info aria-hidden />
      <span>
        <b>Not signed in on this browser</b>
        <small>Your blacklist isn&apos;t applied</small>
      </span>
      <button type="button" className="nobody-sign-in" onClick={openSignIn} data-testid="nobody-sign-in">
        Sign in
      </button>
    </div>
  );
}
