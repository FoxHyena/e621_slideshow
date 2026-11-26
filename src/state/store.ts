import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * A tiny external store. Components read it through `useStore` with a selector, so a
 * screen re-renders only when the slice it selected changes (ENGINEERING.md §2).
 */
export interface Store<S> {
  get(): S;
  set(next: S | ((s: S) => S)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === "function" ? (next as (s: S) => S)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Select a slice of a store. The selector may return a new object each time: the last
 * result is kept while `eq` says it's unchanged, so React sees a stable snapshot.
 */
export function useStore<S, T>(store: Store<S>, select: (s: S) => T, eq: (a: T, b: T) => boolean = Object.is): T {
  const last = useRef<{ s: S; select: (s: S) => T; t: T } | null>(null);
  // Selectors are usually inline arrows that close over props: recompute when either the
  // state or the selector changes, and keep the previous result while it's equal.
  const getSnapshot = () => {
    const s = store.get();
    const prev = last.current;
    if (prev && Object.is(prev.s, s) && prev.select === select) return prev.t;
    const t = select(s);
    const keep = prev !== null && eq(prev.t, t);
    last.current = { s, select, t: keep ? prev.t : t };
    return last.current.t;
  };
  const subscribe = useCallback((l: () => void) => store.subscribe(l), [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Shallow equality for selector results that are small objects or arrays. */
export function shallow<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a) as (keyof T)[];
  const kb = Object.keys(b) as (keyof T)[];
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is(a[k], b[k]));
}
