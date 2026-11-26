/**
 * The e621 sign-in (ENGINEERING.md §2). Credentials stay in this tab's memory and go only to
 * e621; they're written to localStorage only with Remember on. A share link's sign-in is for this
 * tab only: never saved, and it doesn't replace a key this browser saved.
 */
import { getCurrentUser, type Credentials } from "@/lib/e621/client";
import type { CurrentUser } from "@/lib/e621/types";
import { decodeShareCreds } from "@/lib/share";
import { storage } from "@/lib/storage";
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
  /** the key (if any) has been checked: feeds wait for this, so they don't fetch twice */
  ready: boolean;
}

export interface SessionApi {
  store: Store<Session>;
  /** Check a remembered or link key once on load. Rejects with e621's reason. */
  verify(): Promise<void>;
  signIn(c: Credentials, remember: boolean): Promise<void>;
  signOut(): void;
  setShareSignIn(on: boolean): void;
  /** Re-read the account's blacklist; returns its rule count. */
  importBlacklist(): Promise<number>;
}

export function createSession(linkFragment: string | null, prefs: PrefsApi = getPrefs()): SessionApi {
  const linkCreds = linkFragment ? decodeShareCreds(linkFragment) : null;
  const saved = storage.loadCredentials();
  const store = createStore<Session>({
    creds: linkCreds ?? saved,
    user: null,
    remember: !linkCreds && saved !== null,
    link: linkCreds !== null,
    shareSignIn: storage.loadShareSignIn(),
    ready: (linkCreds ?? saved) === null,
  });
  const adopt = (u: CurrentUser) => {
    store.set((s) => ({ ...s, user: u }));
    return prefs.syncAccount(u.blacklisted_tags ?? "", store.get().link);
  };
  let verifying: Promise<void> | null = null;
  return {
    store,
    verify() {
      const { creds, user } = store.get();
      if (!creds || user) return Promise.resolve();
      verifying ??= getCurrentUser(creds)
        .then((u) => {
          // A sign-out or another sign-in while this was in flight wins.
          if (store.get().creds !== creds) return;
          if (u.id === null) throw new Error("e621 didn't accept the saved username and API key");
          adopt(u);
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
      prefs.endVisit();
      store.set((s) => ({ ...s, creds: c, user: u, remember, link: false, ready: true }));
      adopt(u);
      storage.saveCredentials(remember ? c : null);
      // Without Remember nothing per-account stays behind, not even an earlier session's list.
      if (!remember) storage.saveRanked(u.name, null);
    },
    signOut() {
      const { link, user, creds } = store.get();
      // Per-account caches go with the sign-out (never a link's: it saved none), also when the
      // saved key was never verified (offline, rejected).
      const name = user?.name ?? creds?.username;
      if (!link && name) storage.saveRanked(name, null);
      // Leaving a link's sign-in keeps whatever key (and share setting) this browser had saved.
      if (link) prefs.endVisit();
      else {
        storage.saveShareSignIn(false);
        storage.saveCredentials(null);
      }
      store.set({ creds: null, user: null, remember: false, link: false, shareSignIn: link ? storage.loadShareSignIn() : false, ready: true });
    },
    setShareSignIn(on) {
      storage.saveShareSignIn(on);
      store.set((s) => ({ ...s, shareSignIn: on }));
    },
    async importBlacklist() {
      const { creds } = store.get();
      if (!creds) return 0;
      const u = await getCurrentUser(creds);
      if (store.get().creds !== creds) return 0;
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
