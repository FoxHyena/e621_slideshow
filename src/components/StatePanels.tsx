"use client";

/**
 * The states that only show when something went wrong (DESIGN.md "States"): the error panel and
 * e621's slow down. Their own chunk (src/components/State.tsx loads it), so a cold
 * load doesn't carry them; it is fetched when the page is idle.
 */
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { StateBlock } from "./State";

/** A tonal Try again with its 18 refresh icon. */
export function TryAgain({ onClick, label = "Try again", testId }: { onClick: () => void; label?: string; testId?: string }) {
  return (
    <button type="button" className="btn-tonal" onClick={onClick} data-testid={testId}>
      {label === "Try again" && <RotateCw aria-hidden className="state-icon" />}
      {label}
    </button>
  );
}

/**
 * A load that failed, in a panel where the first post would be: Goo says oops, what e621 said sits
 * in a capsule, and Try again. A wrong sign-in is the one failure that isn't the site's.
 */
export function ErrorPanel({ error, onRetry, testId }: { error: string; onRetry: () => void; testId?: string }) {
  const auth = /invalid username|api key/i.test(error);
  return (
    <div className="state-panel" role="alert" data-testid={testId}>
      <StateBlock
        mood="oops"
        size={96}
        head={auth ? "e621 didn't accept your sign-in" : "e621 didn't answer"}
        text={auth ? "Check your username and API key in Settings › Account." : "Your feed is fine. The site is having a moment."}
        extra={<code className="state-said">{error}</code>}
        actions={<TryAgain onClick={onRetry} testId="state-retry" />}
      />
    </div>
  );
}

/**
 * e621 asked us to slow down: Goo snoozes, the sentence counts down, Try now skips the wait. It is
 * mounted when the wait starts, so the wait starts with it. The headline is announced once; the
 * ticking seconds are not.
 */
export function SlowDownPanel({ waitMs, onNow }: { waitMs: number; onNow: () => void }) {
  const left = useWait(waitMs);
  return (
    <div className="state-panel" role="status" data-testid="state-slow">
      <StateBlock
        mood="snooze"
        size={96}
        head="e621 asked us to slow down"
        text={<span aria-live="off">{`Trying again in ${left} s.`}</span>}
        actions={<TryAgain label="Try now" onClick={onNow} testId="state-retry" />}
      />
    </div>
  );
}

/** Loading more hit e621's limit: the same wait, as the feed's last row. */
export function SlowDownRow({ waitMs, onNow }: { waitMs: number; onNow: () => void }) {
  const left = useWait(waitMs);
  return (
    <div className="feed-more-row" role="status" data-testid="feed-more-failed">
      <span>
        e621 asked us to slow down. <span aria-live="off">Trying again in {left} s.</span>
      </span>
      <button type="button" className="btn-tonal" onClick={onNow} data-testid="state-retry">
        Try now
      </button>
    </div>
  );
}

/** Whole seconds left of a wait that started when the caller mounted, ticking once a second. */
function useWait(waitMs: number): number {
  const [end] = useState(() => Date.now() + waitMs);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(1, Math.ceil((end - now) / 1000));
}
