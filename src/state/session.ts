/**
 * The e621 sign-in (ENGINEERING.md §2). Credentials stay in this tab's memory and go only to
 * e621; they're written to localStorage only with Remember on. A share link's sign-in is for this
 * tab only: never saved, and it doesn't replace a key this browser saved.
 */
import { E621Error, getCurrentUser, type Credentials } from "@/lib/e621/client";
import type { CurrentUser } from "@/lib/e621/types";
import { decodeShareCreds } from "@/lib/share";
import { storage } from "@/lib/storage";
import { getGoo } from "./goo";
import { getPrefs, type PrefsApi } from "./prefs";
import { createStore, type Store } from "./store";

export interface Session {
  creds: Credentials | null;
  user: CurrentUser | null;
  /** the key is saved on this device */
  remember: boolean;
  /** signed in with a link's key, for this tab only */
  link: boolean;
  /** share links carry the sign-in (off until turned on; cleared on sign-out) */
  shareSignIn: boolean;
  /**
   * Feeds may start: the key (if any) has been checked, or a remembered key has the profile e621
   * confirmed last time (checked behind the first paint). Feeds wait for this, so they don't fetch twice.
   */
  ready: boolean;
}

export interface SessionApi {
  store: Store<Session>;
  /** Check a remembered or link key once on load. Rejects with e621's reason. */
  verify(): Promise<void>;
  signIn(c: Credentials, remember: boolean): Promise<void>;
  signOut(): void;
  setShareSignIn(on: boolean): void;
  /** Re-read the account's blacklist; returns its rule count (null: signed out or switched meanwhile). */
  importBlacklist(): Promise<number | null>;
}

export function createSession(linkFragment: string | null, prefs: PrefsApi = getPrefs()): SessionApi {
  const linkCreds = linkFragment ? decodeShareCreds(linkFragment) : null;
  const saved = storage.loadCredentials();
  // A remembered key with the account e621 confirmed last time: signed in from the first paint.
  const profile = !linkCreds && saved ? storage.loadAccount(saved.username) : null;
  const store = createStore<Session>({
    creds: linkCreds ?? saved,
    user: profile,
    remember: !linkCreds && saved !== null,
    link: linkCreds !== null,
    shareSignIn: storage.loadShareSignIn(),
    ready: (linkCreds ?? saved) === null || profile !== null,
  });
  let verified = (linkCreds ?? saved) === null;
  const adopt = (u: CurrentUser) => {
    store.set((s) => ({ ...s, user: u }));
    return prefs.syncAccount(u.blacklisted_tags ?? "", store.get().link);
  };
  let verifying: Promise<void> | null = null;
  return {
    store,
    verify() {
      const { creds } = store.get();
      if (!creds || verified) return Promise.resolve();
      verifying ??= getCurrentUser(creds)
        .catch((e) => {
          // e621 refused the key: same as an anonymous answer. Anything else (offline, busy)
          // keeps the remembered profile; the next load checks again.
          if (e instanceof E621Error && (e.status === 401 || e.status === 403)) return { id: null, name: "" };
          throw e;
        })
        .then((u) => {
          // A sign-out or another sign-in while this was in flight wins.
          if (store.get().creds !== creds) return;
          if (u.id === null) {
            // Signed in from the saved profile: not any more.
            const s = store.get();
            if (s.user) storage.saveAccount(s.user.name, null);
            store.set((x) => ({ ...x, user: null }));
            throw new Error("e621 didn't accept the saved username and API key");
          }
          verified = true;
          adopt(u);
          if (store.get().remember) storage.saveAccount(u.name, u);
        })
        .finally(() => {
          verifying = null;
          if (store.get().creds === creds) store.set((s) => ({ ...s, ready: true }));
        });
      return verifying;
    },
    async signIn(c, remember) {
      const u = await getCurrentUser(c);
      if (u.id === null) throw new Error("e621 didn't accept that username and API key");
      // Another account through "Change": the one before leaves nothing behind, as on a sign-out.
      const before = store.get();
      const prev = before.link ? null : (before.user?.name ?? before.creds?.username ?? null);
      if (prev && prev.toLowerCase() !== u.name.toLowerCase()) storage.purgeAccount(prev);
      prefs.endVisit();
      store.set((s) => ({ ...s, creds: c, user: u, remember, link: false, ready: true }));
      verified = true;
      adopt(u);
      storage.saveCredentials(remember ? c : null);
      storage.saveAccount(u.name, remember ? u : null);
      // Without Remember nothing per-account stays behind, not even an earlier session's list.
      if (!remember) storage.purgeAccount(u.name);
    },
    signOut() {
      const { link, user, creds } = store.get();
      // Per-account caches go with the sign-out (never a link's: it saved none), also when the
      // saved key was never verified (offline, rejected).
      const name = user?.name ?? creds?.username;
      if (!link && name) storage.purgeAccount(name);
      // Leaving a link's sign-in keeps whatever key (and share setting) this browser had saved.
      if (link) prefs.endVisit();
      else {
        storage.saveShareSignIn(false);
        storage.saveCredentials(null);
        // the goo goes with the account (the bar wipes it off)
        if (getGoo().store.get().count > 0) getGoo().wipe();
      }
      verified = true;
      store.set({ creds: null, user: null, remember: false, link: false, shareSignIn: link ? storage.loadShareSignIn() : false, ready: true });
    },
    setShareSignIn(on) {
      storage.saveShareSignIn(on);
      store.set((s) => ({ ...s, shareSignIn: on }));
    },
    async importBlacklist() {
      const { creds } = store.get();
      if (!creds) return null;
      const u = await getCurrentUser(creds);
      if (store.get().creds !== creds) return null;
      return adopt(u);
    },
  };
}

let instance: SessionApi | null = null;
export function getSession(): SessionApi {
  if (!instance) instance = createSession(window.__e6link ?? location.hash);
  return instance;
}
/** Tests only. */
export function resetSession(): void {
  instance = null;
}
