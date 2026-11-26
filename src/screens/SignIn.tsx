"use client";

/**
 * The sign-in sheet (UX.md "Sign-in sheet", DESIGN.md "Sign-in sheet"): three steps to get an API key,
 * Username and API key, Remember, and one gold Sign in. It opens over whatever asked (a Follow, a
 * heart, Settings), and on success closes; what asked carries on (a follow you tapped is made once
 * you're in). The key is never kept until e621 accepts it, and then only with Remember on; only the
 * username draft survives a trip to e621 for the key (this tab only).
 */
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { getNav } from "@/nav/history";
import { SIGN_IN_SHEET } from "@/nav/routes";
import { Sheet } from "@/shell/Sheet";
import { getFollows } from "@/state/follows";
import { getSession } from "@/state/session";
import { SIGNIN_DRAFT } from "@/lib/storage";

/** e621's account page, where "Manage API access" makes a key. */
export const API_KEY_PAGE = "https://e621.net/users/home";
const DRAFT = SIGNIN_DRAFT;

const readDraft = (): string => {
  try {
    return sessionStorage.getItem(DRAFT) ?? "";
  } catch {
    return "";
  }
};
const writeDraft = (v: string) => {
  try {
    if (v) sessionStorage.setItem(DRAFT, v);
    else sessionStorage.removeItem(DRAFT);
  } catch {
    /* private mode: the draft is a convenience */
  }
};

export function SignInSheet() {
  const session = getSession();
  // Changing the key starts from what you have; a shared link's sign-in isn't yours to start from.
  const [mine] = useState(() => {
    const s = session.store.get();
    return s.link ? null : s.creds ? { username: s.creds.username, remember: s.remember } : null;
  });
  const [username, setUsername] = useState(() => mine?.username ?? readDraft());
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(mine?.remember ?? true);
  const signedIn = useRef(false);
  // Closed without signing in: a Follow tapped while signed out doesn't happen later by surprise.
  useEffect(
    () => () => {
      // (StrictMode's practice unmount leaves the sheet up: only a real close drops it)
      if (!signedIn.current && getNav().current().sheet !== SIGN_IN_SHEET) getFollows().dropPending();
    },
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const ids = { user: useId(), key: useId(), err: useId() };
  const ready = username.trim() !== "" && apiKey.trim() !== "" && !busy;

  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) setApiKey(t);
      setHint(null);
    } catch {
      setHint("Couldn't read the clipboard. Paste into the field instead.");
    }
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await session.signIn({ username: username.trim(), apiKey: apiKey.trim() }, remember);
      signedIn.current = true;
      writeDraft("");
      // (only if the sheet is still up: closed while e621 answered, Back would leave the screen under it)
      if (getNav().current().sheet === SIGN_IN_SHEET) await getNav().back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "e621 didn't answer. Try again.");
      setBusy(false);
    }
  };

  return (
    <Sheet title="Sign in with e621" testId="sheet-sign-in">
      <form
        className="signin"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <ol className="signin-steps">
          <li>
            <span className="signin-n" aria-hidden>
              1
            </span>
            <a className="signin-link" href={API_KEY_PAGE} target="_blank" rel="noopener noreferrer" data-testid="sign-in-key-page">
              Open your API key page
              <ExternalLink aria-hidden />
            </a>
          </li>
          <li>
            <span className="signin-n" aria-hidden>
              2
            </span>
            Create a key (any name) and copy it
          </li>
          <li>
            <span className="signin-n" aria-hidden>
              3
            </span>
            Come back and paste it here
          </li>
        </ol>
        <label className="signin-label" htmlFor={ids.user}>
          Username
        </label>
        <div className="field6" data-has={username ? "" : undefined}>
          <input
            id={ids.user}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              writeDraft(e.target.value.trim());
            }}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            data-autofocus={username ? undefined : ""}
            data-testid="sign-in-username"
          />
        </div>
        <label className="signin-label" htmlFor={ids.key}>
          API key
        </label>
        <div className="field6 signin-key" data-has={apiKey ? "" : undefined}>
          <input
            id={ids.key}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="current-password"
            spellCheck={false}
            enterKeyHint="go"
            data-autofocus={username ? "" : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.err : undefined}
            data-testid="sign-in-key"
          />
          <button type="button" className="btn-tonal signin-paste" onClick={() => void paste()} data-testid="sign-in-paste">
            Paste
          </button>
        </div>
        {hint && (
          <p className="signin-hint" role="status" data-testid="sign-in-hint">
            {hint}
          </p>
        )}
        {error && (
          <p id={ids.err} className="signin-error" role="alert" data-testid="sign-in-error">
            {error}
          </p>
        )}
        <p className="signin-note">
          <ShieldCheck aria-hidden />
          <span>Your key stays on this device and is only ever sent to e621.</span>
        </p>
        <label className="list-row signin-remember">
          <span className="row-text">
            <b>Remember on this device</b>
          </span>
          <input type="checkbox" role="switch" className="switch" checked={remember} onChange={(e) => setRemember(e.target.checked)} data-testid="sign-in-remember" />
        </label>
        <button type="submit" className="btn-gold signin-go" disabled={!ready} aria-busy={busy || undefined} data-testid="sign-in-submit">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Sheet>
  );
}
