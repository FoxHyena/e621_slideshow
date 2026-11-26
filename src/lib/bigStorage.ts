/**
 * IndexedDB key-value storage for data too big for localStorage (per-favorite
 * tags for the learned ranking). Everything fails soft: without IndexedDB
 * (private windows, old browsers) reads return undefined and writes false, and
 * Recommended falls back to lift ranking.
 */
const DB_NAME = "e6ss";
const STORE = "kv";

let db: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.catch(() => (db = null));
  return db;
}

function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = op(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const bigStorage = {
  /** Whether IndexedDB works here at all. */
  async available(): Promise<boolean> {
    try {
      await open();
      return true;
    } catch {
      return false;
    }
  },
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await run<T | undefined>("readonly", (s) => s.get(key));
    } catch {
      return undefined;
    }
  },
  async del(key: string): Promise<void> {
    try {
      await run("readwrite", (s) => s.delete(key));
    } catch {
      // nothing kept, or nothing to drop
    }
  },
  async set(key: string, value: unknown): Promise<boolean> {
    try {
      await run("readwrite", (s) => s.put(value, key));
      return true;
    } catch {
      return false;
    }
  },
};
