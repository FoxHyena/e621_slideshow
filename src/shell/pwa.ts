/**
 * The installed-app side (ENGINEERING.md §7, DESIGN.md "Install, update and the app icon"): the
 * service worker, the "New version ready" toast, and what Settings › App's install row can offer.
 * Loaded after boot, off the first load.
 */
import { toast } from "sonner";
import { getNav, isOverlay } from "@/nav/history";
import { createStore } from "@/state/store";

/** How this browser can install the app (Settings › App's row). */
export type InstallWay =
  /** already running as the installed app */
  | "installed"
  /** the browser has its own dialog (Android; Chrome and Edge on a computer) */
  | "prompt"
  /** iPhone or iPad Safari: Share › Add to Home Screen */
  | "ios"
  /** Safari on a Mac: File › Add to Dock */
  | "mac"
  /** a chat or social app's browser on an iPhone: open it in Safari first */
  | "in-app"
  /** nothing to offer (Firefox on a computer, or the browser hasn't offered yet) */
  | null;

export interface PwaState {
  install: InstallWay;
  /** a new version has downloaded and waits for a reload */
  updateReady: boolean;
}

export const pwa = createStore<PwaState>({ install: null, updateReady: false });

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferred: BeforeInstallPromptEvent | null = null;
let registration: ServiceWorkerRegistration | null = null;
let started = false;

const UPDATED = "e6ss:updated-from";
/** This build (the worker's cache names carry it). */
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** The way to install here, from the browser alone (before any prompt event). */
export function installWayOf(nav: { userAgent: string; maxTouchPoints?: number; standalone?: boolean }, standalone: boolean): InstallWay {
  if (standalone || nav.standalone) return "installed";
  const ua = nav.userAgent;
  // iPadOS reports itself as a Mac; touch points tell them apart.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  if (ios) {
    if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|Snapchat|Discord|TikTok|musical_ly|GSA\/|WhatsApp|LinkedInApp|Pinterest/.test(ua)) return "in-app";
    return "ios";
  }
  if (/Macintosh/.test(ua) && /Version\/\d+.*Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "mac";
  return null;
}

/** Open the browser's own install dialog (the "prompt" way). */
export async function promptInstall(): Promise<void> {
  const e = deferred;
  if (!e) return;
  deferred = null;
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    pwa.set((s) => ({ ...s, install: outcome === "accepted" ? "installed" : null }));
  } catch {
    // the browser took the offer back; it offers again on a later visit
    pwa.set((s) => ({ ...s, install: null }));
  }
}

/** Take the waiting version: the worker takes over, then the page reloads on it. */
export function reloadToUpdate(): void {
  const waiting = registration?.waiting;
  try {
    sessionStorage.setItem(UPDATED, BUILD);
  } catch {
    /* the "Updated" toast is a nicety */
  }
  if (!waiting) {
    location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
  waiting.postMessage({ type: "skip-waiting" });
}

/** "New version ready", once per version, only on a feed or list at rest (never over a sheet or the player). */
function offerUpdate(): void {
  if (pwa.get().updateReady) return;
  pwa.set((s) => ({ ...s, updateReady: true }));
  const nav = getNav();
  const show = () => {
    if (isOverlay(nav.current()) || document.querySelector("[data-testid=first-run-read]")) return false;
    toast("New version ready", { id: "update", duration: 6000, action: { label: "Reload", onClick: reloadToUpdate } });
    return true;
  };
  if (show()) return;
  const unsub = nav.store.subscribe(() => {
    if (show()) unsub();
  });
}

function watch(reg: ServiceWorkerRegistration): void {
  registration = reg;
  // Only an update waits: the very first worker has nothing to replace.
  const ready = () => reg.waiting && navigator.serviceWorker.controller && offerUpdate();
  ready();
  reg.addEventListener("updatefound", () => {
    const w = reg.installing;
    w?.addEventListener("statechange", () => {
      if (w.state === "installed") ready();
    });
  });
}

/** The page's already-loaded chunks, handed to the worker so an offline launch has them. */
function cacheLoaded(): void {
  const urls = performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((u) => u.startsWith(`${location.origin}/_next/static/`));
  navigator.serviceWorker.controller?.postMessage({ type: "cache-loaded", urls });
}

export function startPwa(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const standalone = matchMedia("(display-mode: standalone)").matches;
  pwa.set((s) => ({ ...s, install: installWayOf(navigator as Navigator & { standalone?: boolean }, standalone) }));
  // The browser's own pop-up offer is held back: Settings › App's row is the only way in.
  const offered = (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    if (pwa.get().install !== "installed") pwa.set((s) => ({ ...s, install: "prompt" }));
  };
  // (the inline script in <head> kept one that came before this code loaded)
  const early = (window as Window & { __e6bip?: Event }).__e6bip;
  if (early) offered(early);
  window.addEventListener("beforeinstallprompt", offered);
  window.addEventListener("appinstalled", () => pwa.set((s) => ({ ...s, install: "installed" })));

  try {
    const from = sessionStorage.getItem(UPDATED);
    if (from !== null) {
      sessionStorage.removeItem(UPDATED);
      if (from !== BUILD) toast.success(`Updated to ${process.env.APP_VERSION}`, { id: "updated", duration: 4000 });
    }
  } catch {
    /* private mode */
  }

  // Development serves changing chunks under one name: no worker there.
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  sw.getRegistration()
    // A version already waiting is newer than any shell that asks: registering again (from an older
    // shell served after a slow network) would throw it away.
    .then((have) => (have?.waiting ? have : sw.register(`/sw.js?v=${encodeURIComponent(BUILD)}`, { updateViaCache: "none" })))
    .then((reg) => {
      watch(reg);
      if (sw.controller) cacheLoaded();
      else sw.addEventListener("controllerchange", cacheLoaded, { once: true });
    })
    .catch(() => {
      /* no worker: the app works as a plain page */
    });
}
