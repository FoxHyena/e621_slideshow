/*
 * The service worker (ENGINEERING.md §7). Hand-rolled on purpose: a small surface, no build plugin.
 *
 * Caches only this origin's own files: `/_next/static/*` (immutable, cache-first) and the app shell
 * for page navigations (network-first, 3 s, then the cached shell: every route serves the same shell).
 * It never touches a cross-origin request: e621's API and media go straight to the network, so no
 * API key and no signed-in answer is ever stored here.
 *
 * Registered as /sw.js?v=<build>; the cache names carry it and `activate` drops older ones. A new
 * worker waits until the page asks it to take over (the "Reload" on the update toast). Install
 * takes the shell and every chunk it names, or fails (and the old worker stays): a new version is
 * never half there offline.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const STATIC = `e6ss-static-${VERSION}`;
const SHELL = `e6ss-shell-${VERSION}`;
const SHELL_KEY = "/following";
const NAV_TIMEOUT_MS = 3000;

/** Same-origin build files only: never an API answer, never another site's file. */
const isStatic = (url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
const isHtml = (res) => (res.headers.get("content-type") || "").startsWith("text/html");
/** Files that are not the app's pages, even when opened as a page (the userscript, icons, the manifest). */
const NOT_A_PAGE = /\.(js|json|webmanifest|png|ico|svg|txt|xml)$|^\/(_next|icons)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(new Request(SHELL_KEY, { cache: "reload", credentials: "same-origin" }));
      if (!res.ok || !isHtml(res)) throw new Error(`shell: ${res.status}`);
      const html = await res.clone().text();
      const chunks = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))];
      const statics = await caches.open(STATIC);
      await statics.addAll(chunks);
      await (await caches.open(SHELL)).put(SHELL_KEY, res);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("e6ss-") && n !== STATIC && n !== SHELL).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "skip-waiting") self.skipWaiting();
  // The page's already-loaded chunks (lazy screens included), so an offline launch has them.
  if (data.type === "cache-loaded" && Array.isArray(data.urls)) {
    const urls = data.urls.map((u) => new URL(u, self.location.origin)).filter(isStatic);
    event.waitUntil(
      caches.open(STATIC).then((c) => Promise.all(urls.map((u) => c.match(u.href).then((hit) => hit || c.add(u.href).catch(() => {}))))),
    );
  }
});

async function cacheFirst(event) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(event.request);
  if (hit) return hit;
  const res = await fetch(event.request);
  if (res.ok && res.type === "basic") event.waitUntil(cache.put(event.request, res.clone()).catch(() => {}));
  return res;
}

async function networkFirstShell(event) {
  const cache = await caches.open(SHELL);
  const fromNet = fetch(event.request).then((res) => {
    // Every route serves the same shell; keep the newest good one.
    if (res.ok && res.type === "basic" && isHtml(res)) event.waitUntil(cache.put(SHELL_KEY, res.clone()).catch(() => {}));
    return res;
  });
  fromNet.catch(() => {}); // a late failure after the timeout won is not an error
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  try {
    const res = await Promise.race([fromNet, timeout]);
    // A host error (a deploy blip, a 502) is no better than offline when a good shell is here.
    if (res && res.status < 500) return res;
  } catch {
    /* offline: fall through to the cached shell */
  }
  const cached = await cache.match(SHELL_KEY);
  if (cached) return cached;
  return fromNet;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Cross-origin (e621's API and media): not ours to touch.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (request.mode === "navigate") {
    if (NOT_A_PAGE.test(url.pathname) || !(request.headers.get("accept") || "").includes("text/html")) return;
    event.respondWith(networkFirstShell(event));
    return;
  }
  if (isStatic(url)) event.respondWith(cacheFirst(event));
});
