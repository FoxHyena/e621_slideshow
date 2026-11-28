/**
 * The installed-app side (ENGINEERING.md §7, DESIGN.md "Install, update and the app icon"): the
 * service worker, the "New version ready" toast, and what Settings › App's install row can offer.
 * Loaded after boot, off the first load.
 */
import { RefreshCw } from "lucide-react";
import { createElement } from "react";
import { toast } from "sonner";
import { ACTION_MS } from "./toastLook";
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

/** This build (the worker's cache names carry it). */
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
/** How often an open app asks which build the site serves, and the least time between two asks. */
const CHECK_EVERY_MS = 30 * 60_000;
const CHECK_GAP_MS = 60_000;
let lastCheck = 0;
/** The version the toast was last shown for. */
let offered: string | null = null;

/** The build a worker serves: it is registered as /sw.js?v=<build>. */
const versionOf = (w: ServiceWorker | null | undefined) => (w ? new URL(w.scriptURL).searchParams.get("v") : null);


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
  // (nothing is said after the reload: the Reload just tapped already told; owner-approved 2026-11-27)
  const waiting = registration?.waiting;
  if (!waiting) {
    location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
  waiting.postMessage({ type: "skip-waiting" });
}

/** "New version ready", once per version, only on a feed or list at rest (never over a sheet or the player). */
function offerUpdate(waiting: ServiceWorker): void {
  const version = versionOf(waiting);
  // This page already runs it (a cold start fetched the new shell): it takes over without asking
  // (DESIGN.md: "A cold start runs the new version without asking"), and gets the chunks loaded so far.
  if (version === BUILD) {
    navigator.serviceWorker.addEventListener("controllerchange", cacheLoaded, { once: true });
    waiting.postMessage({ type: "skip-waiting" });
    return;
  }
  if (offered === version) return;
  offered = version;
  pwa.set((s) => ({ ...s, updateReady: true }));
  const nav = getNav();
  const show = () => {
    if (offered !== version) return true; // a newer version took this one's place
    if (isOverlay(nav.current()) || document.querySelector("[data-testid=first-run-read]")) return false;
    toast("New version ready", { id: "update", icon: createElement(RefreshCw), duration: ACTION_MS, action: { label: "Reload", onClick: reloadToUpdate } });
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
  const ready = () => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
  };
  const follow = (w: ServiceWorker | null) =>
    w?.addEventListener("statechange", () => {
      if (w.state === "installed") ready();
    });
  ready();
  // (one may already be downloading: the register that just resolved started it)
  follow(reg.installing);
  reg.addEventListener("updatefound", () => follow(reg.installing));
}

/** The build the site serves now, or null (offline, a deploy mid-way). */
async function siteBuild(): Promise<string | null> {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    const { build } = res.ok ? ((await res.json()) as { build?: unknown }) : {};
    return typeof build === "string" && build ? build : null;
  } catch {
    return null;
  }
}

/**
 * Ask which build the site serves now. A newer one is registered under its own name, downloads, and
 * then offers itself. The worker's own update check can't see a deploy: its file is the same every
 * build, only the ?v= differs (DECISIONS 2026-11-27, "A deploy reaches an open app").
 */
export async function checkForUpdate(): Promise<void> {
  const reg = registration;
  if (!reg || document.visibilityState !== "visible" || Date.now() - lastCheck < CHECK_GAP_MS) return;
  lastCheck = Date.now();
  const build = await siteBuild();
  // (no answer: the next event asks again, not half an hour on; back from the background the network
  // is often not up yet)
  if (!build) {
    lastCheck = 0;
    return;
  }
  // already running, downloading or waiting
  if ([reg.active, reg.installing, reg.waiting].some((w) => versionOf(w) === build)) return;
  await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(build)}`, { updateViaCache: "none" }).catch(() => {});
}

/**
 * Which registration this launch watches. A first launch, or a page of the active worker's own build,
 * registers its own. A version already waiting is kept when this page runs it or the active one's
 * build (an older shell, served after a slow network, would throw it away). A page on another build
 * than the active worker registers its own only when the site serves it (a newer shell, fetched on a
 * cold start); an older shell never puts its older version back.
 */
async function registrationFor(sw: ServiceWorkerContainer): Promise<ServiceWorkerRegistration> {
  const own = () => sw.register(`/sw.js?v=${encodeURIComponent(BUILD)}`, { updateViaCache: "none" });
  const have = await sw.getRegistration();
  if (!have?.active) return own();
  if (have.waiting && [have.active, have.waiting].some((w) => versionOf(w) === BUILD)) return have;
  if (versionOf(have.active) === BUILD || (await siteBuild()) === BUILD) return own();
  return have;
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
  const onOffer = (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    if (pwa.get().install !== "installed") pwa.set((s) => ({ ...s, install: "prompt" }));
  };
  // (the inline script in <head> kept one that came before this code loaded)
  const early = (window as Window & { __e6bip?: Event }).__e6bip;
  if (early) onOffer(early);
  window.addEventListener("beforeinstallprompt", onOffer);
  window.addEventListener("appinstalled", () => pwa.set((s) => ({ ...s, install: "installed" })));

  // Development serves changing chunks under one name: no worker there.
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  registrationFor(sw)
    .then((reg) => {
      watch(reg);
      if (sw.controller) cacheLoaded();
      else sw.addEventListener("controllerchange", cacheLoaded, { once: true });
      // An open app (an installed one is rarely quit) asks again when it comes back to the front, and
      // every half hour while it is there.
      const check = () => void checkForUpdate();
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
      window.addEventListener("online", check);
      setInterval(check, CHECK_EVERY_MS);
    })
    .catch(() => {
      /* no worker: the app works as a plain page */
    });
}
