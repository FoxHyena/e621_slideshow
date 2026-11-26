/**
 * The tab bar's goo count (DESIGN.md "Tab bar goo"): every favourite adds one, the secret Goo
 * tab adds ten, Wipe clean in Settings and signing out set it back to zero. Goo only ever adds:
 * un-favouriting leaves it (an open question in DESIGN.md; this is the conservative choice).
 * Stored like the other signed-in records (storage.ts `saveGoo`).
 *
 * `wipes` counts wipes, so the bar can play the blade once per wipe. `landing` holds drops still
 * in the air: the bar waits for them before it grows.
 */
import { loadGoo, saveGoo } from "@/lib/storage";
import { createStore, type Store } from "./store";

/** Past this the bar looks the same; the number keeps counting for the label. */
export const GOO_MAX = 100_000;

export interface GooState {
  count: number;
  wipes: number;
}

export interface GooApi {
  store: Store<GooState>;
  add(k?: number): void;
  /** One favourite of post `id`: counts once per page session, so un-favouriting and
   * favouriting again doesn't add twice. True if it counted. */
  addFav(id: number): boolean;
  wipe(): void;
}

export function createGoo(load: () => number = () => 0, save: (n: number) => void = () => {}): GooApi {
  const store = createStore<GooState>({ count: Math.min(GOO_MAX, load()), wipes: 0 });
  const faved = new Set<number>();
  const api: GooApi = {
    store,
    add(k = 1) {
      if (!(k > 0)) return;
      store.set((s) => ({ ...s, count: Math.min(GOO_MAX, s.count + Math.floor(k)) }));
      save(store.get().count);
    },
    addFav(id) {
      if (faved.has(id)) return false;
      faved.add(id);
      api.add(1);
      return true;
    },
    wipe() {
      store.set((s) => ({ count: 0, wipes: s.wipes + 1 }));
      save(0);
    },
  };
  return api;
}

let instance: GooApi | null = null;
/** How the signed-in records are kept right now; the session sets it (session.ts). */
const keep = { remember: false, link: false };
export function setGooKeep(remember: boolean, link: boolean): void {
  keep.remember = remember;
  keep.link = link;
}
export function getGoo(): GooApi {
  // a link's borrowed sign-in leaves the goo of this browser alone
  if (!instance) instance = createGoo(loadGoo, (n) => !keep.link && saveGoo(n, keep.remember));
  return instance;
}

/** "1 favorite", "23 favorites" (the app's US spelling, as on the pills) */
export function gooLabel(n: number): string {
  return n === 1 ? "1 favorite" : `${n.toLocaleString("en")} favorites`;
}
