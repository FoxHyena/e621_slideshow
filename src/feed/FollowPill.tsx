"use client";

/**
 * Follow, everywhere an artist shows (UX §5, DESIGN.md "Follow pill").
 *
 * - `FollowPill` (cards, the player): only for artists you don't follow. A tap wiggles it into
 *   a quiet "✓ Following" (the artist's mark spins and throws its dots: `onFollowed`); tapping it
 *   again unfollows. It waits for your list, so an artist you follow never flashes a Follow.
 * - `FollowButton` (the artist page): always there, "Follow" or "✓ Following".
 * Signed out, both open sign-in, and the artist is followed once you're in.
 */
import { Check, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { atLimit, getFollows, isFollowed, LIMIT_MESSAGE } from "@/state/follows";
import { shallow, useStore } from "@/state/store";

const label = (name: string) => name.replaceAll("_", " ");

function useFollow(name: string) {
  const follows = getFollows();
  const s = useStore(
    follows.store,
    (x) => ({ signedIn: x.user !== null, checking: x.checking, status: x.status, on: isFollowed(x, name), full: atLimit(x) }),
    shallow,
  );
  // Again when the account arrives (a sign-in confirmed after mount) or the list goes back to idle.
  useEffect(() => {
    void follows.ensure();
  }, [follows, s.signedIn, s.status]);
  return { ...s, set: (on: boolean) => follows.setFollowed(name, on), retry: () => void follows.ensure("user", true) };
}

export function FollowPill({ name, art = false, always = false, onFollowed }: { name: string; art?: boolean; always?: boolean; onFollowed?: () => void }) {
  const f = useFollow(name);
  /** tapped here: stays (as ✓) after following, so it can be undone in place */
  const [touched, setTouched] = useState(false);
  const [wiggle, setWiggle] = useState(0);
  if (f.checking || (f.signedIn && f.status !== "ready")) return null;
  // `always`: the artist page's compact bar shows "✓ Following" too
  if (f.on && !touched && !always) return null;
  return (
    <button
      type="button"
      className={`follow-pill${art ? " follow-pill-art" : ""}`}
      aria-pressed={f.on}
      aria-label={`Follow ${label(name)}`}
      data-wiggle={wiggle % 2 === 1 ? "a" : wiggle > 0 ? "b" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (f.signedIn && !always) setTouched(true);
        if (!f.on) {
          setWiggle((w) => w + 1);
          if (f.signedIn && !f.full) onFollowed?.();
        }
        f.set(!f.on);
      }}
      data-testid="follow-pill"
      data-artist={name}
    >
      {f.on ? (
        <>
          <Check aria-hidden className="follow-check" />
          Following
        </>
      ) : (
        <>
          <Plus aria-hidden className="follow-plus" />
          Follow
        </>
      )}
    </button>
  );
}

/** `tag`: a tag that isn't an artist ("Follow tag"). `onFollowed`: the page's mark spins and bursts. */
export function FollowButton({ name, tag = false, onFollowed }: { name: string; tag?: boolean; onFollowed?: () => void }) {
  const f = useFollow(name);
  const [wiggle, setWiggle] = useState(0);
  const waiting = f.checking || (f.signedIn && (f.status === "idle" || f.status === "loading"));
  const blocked = !f.on && f.full;
  const note = useId();
  return (
    <div className="follow-hero">
      <button
        type="button"
        className="btn-tonal follow-button"
        // one name, the state in aria-pressed: "Follow fox, toggle button, pressed"
        aria-label={blocked ? LIMIT_MESSAGE : `Follow ${name.replaceAll("_", " ")}`}
        aria-pressed={f.on}
        aria-busy={waiting || undefined}
        aria-describedby={blocked ? note : undefined}
        disabled={waiting || blocked}
        data-wiggle={wiggle % 2 === 1 ? "a" : wiggle > 0 ? "b" : undefined}
        onClick={() => {
          // toggling either way wiggles it (DESIGN.md "Artist page")
          setWiggle((w) => w + 1);
          if (!f.on && f.signedIn && !f.full) onFollowed?.();
          f.set(!f.on);
        }}
        data-testid="follow-button"
      >
        {blocked ? null : f.on ? <Check aria-hidden className="follow-check" /> : <Plus aria-hidden className="follow-plus" />}
        {blocked ? LIMIT_MESSAGE : f.on ? "Following" : tag ? "Follow tag" : "Follow"}
      </button>
      {blocked && (
        <p id={note} className="follow-note" data-testid="follow-limit">
          Unfollow an artist in Artists to follow another.
        </p>
      )}
      {f.status === "error" && f.signedIn && (
        <p className="feed-note" role="alert">
          Couldn&rsquo;t read what you follow.{" "}
          <button type="button" className="text-btn" onClick={f.retry}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
