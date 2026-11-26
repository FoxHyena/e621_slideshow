# Engineering

## Current state (2026-11-25, main @ 93e6834)

Deploy: Vercel (`server: Vercel`, `x-nextjs-prerender: 1` on `/`). Not a static export, so dynamic
routes like `/artist/[name]` can render client-side without `generateStaticParams`. "CI" is the Vercel
preview check on PRs; there is no GitHub Actions workflow.

Shell: `src/app/page.tsx` renders `ClientApp`, which loads `App` with `dynamic(..., { ssr: false })`
because everything reads localStorage on first render. One route, `/`.

### `src/components/App.tsx` (1,300 lines): owns almost everything

| Concern | What lives there | Lines |
|---|---|---|
| Persisted settings | `search`, `playback`, `saved`, `history`, `shareSignIn`; each setter also writes localStorage | 123–155 |
| Share/launch links | `decodeShare` / `decodeLaunch` / `decodeShareCreds` read once from `location`; `onShared` effect starts the show on mount, then `replaceState` strips the URL | 125–141, 424–441 |
| Account | `creds`, `user`, `remember`, `linkSession`; re-verify on load, `signIn`, `signOut`, `syncBlacklist` | 136–146, 245–299 |
| Recommendations | `useRecommendations` hook (profile sync, weights, learned model, overrides) + derived `recCandidates` | 218–243 |
| The one active queue | `active: { queue, key, search, serial }`; `startQueue` builds `PostQueue` or `RecommendedQueue`; a `setVersion` counter re-renders on every queue change | 160–161, 302–339 |
| Slideshow | `index`, `trail`, `paused`, `ready`, timer, stall watchdog, preloader, swipe, fullscreen, controls auto-hide | 162–166, 476–579, 715–756 |
| Overlays | `panelOpen` (settings is the home screen), `infoOpen`, `browse: grid/feed/null`, `browseFrom` ref, `feedPlace` ref | 166–195 |
| Artist feeds | `artistFeeds[]` stacked over the feed; `history.pushState` + `popstate` + `history.go(-n)` hacks so Back closes them | 170–191, 664–713 |
| Tag actions | `editTags` (info overlay +/−), `searchTag` / `blacklistTag` (hold-a-tag targets), Recommended pins/mutes instead | 601–662 |
| Favorites | optimistic toggle, patched into the main queue and every artist queue | 581–599 |
| Keyboard | one `keydown` handler branching on panel / browsing / artist / show | 758–847 |
| Render | Stage, loaders, Feed, artist Feeds, Gallery, InfoOverlay, controls, toast, SettingsPanel | 882–1299 |

### What's tangled

1. **One queue at a time.** `active` is the only queue. Feed, grid and slideshow are views over it, so
   there is no way to have Following, For You and an artist page alive at once. Starting a new search
   disposes the old queue. The registry in the target plan replaces this.
2. **Navigation is overlay flags, not URLs.** `panelOpen`, `browse`, `browseFrom`, `artistFeeds` and the
   pushState counter encode where you are. Back only works for artist feeds, via manual history
   bookkeeping. Reload always lands on the settings panel.
3. **Settings is the home screen and the editor for the active search.** `search` mixes "what I'm
   browsing" (tags, source, order, date, filters) with global preferences (blacklist), and `apply()`
   decides whether to restart by comparing queue keys.
4. **Re-render on any queue change** via `setVersion`, so the whole tree, including the slideshow stage,
   re-renders when a feed page lands.
5. **Slideshow state is global**, though only the player needs it (index, trail, timer, preloader).
6. **Feed is reused for artist feeds with no-op props** (`onPlayFrom={() => {}}`, `onGrid={() => {}}`).
7. **Favorite patching fans out by hand** to each queue that might hold the post.

### What's already reusable

- `PostQueue` / `RecommendedQueue` (`src/lib/slideshow/queue.ts`, `src/lib/recommend/stream.ts`):
  view-agnostic, cursor paging, `ensure(index)`, `patch`, `setRules`, `dispose`. `search:subscriptions`
  runs through `PostQueue` unchanged.
- `client.ts`: every call goes through one throttle (550 ms gap, under e621's 2 req/s). Adding
  `tag_subscriptions` and `saved_searches` calls is mechanical.
- `storage.ts` (localStorage, prefix `e6ss:v1:`) and `bigStorage.ts` (IndexedDB `e6ss`/`kv`).
- The favorites `Profile` keeps per-tag counts with categories, so "how many of artist X's posts you've
  favorited" is `profile.tags[x].n` for artist-category tags. `TagCache` has site-wide `post_count` per
  tag (7-day TTL). Artist affinity costs no extra requests for tags already looked up.
- Pure libs with tests: query building, blacklist, date filters, share encoding, layout, recommend.

### Component map

- **Feed.tsx** (560): Instagram-style cards (avatar, artist, rating, media, heart, score, Play from here,
  TagStrip). No virtualization: renders `posts.slice(0, shown.count)` in pages of 20 (`useShown`); the DOM
  only grows. Bottom sentinel IntersectionObserver (`rootMargin 1500px`) loads more; a second observer at
  the vertical midline picks the active card (only it plays video). Scroll restore on mount from
  `savedScroll()`; reports `onPlace` on every scroll. J/K/L/Enter keys. Reused for artist feeds with five
  no-op props; header/footer/stats blocks duplicated with Gallery.
- **Gallery.tsx** (213): square-tile grid, preview → sample fade-in, pages of 120, same sentinel logic.
  No saved scroll; centers the current post on mount.
- **useShown.ts**: render-paging so Recommended's thousands of posts can't crash a phone tab.
- **TagActions.tsx**: `useTagHold` (450 ms hold, 10 px slop, window pointer/touch listeners, vibrate on
  arm), `TagStrip`, `TagActionsOverlay` (Search/Pin + Blacklist targets). Only Feed uses it.
- **InfoOverlay.tsx**: slideshow side panel: meta, "Recommended because", tags with +/− (Pin/Mute).
  Duplicates Feed's `RATING` map.
- **Avatar.tsx + lib/avatar.ts**: procedural kaleidoscope SVG from the artist name (FNV-1a → mulberry32),
  no API calls (e621 has no artist pictures). Halo copies instead of SVG blur for iOS.
- **Loader.tsx**: progress ring + icon swap + ETA + optional checklist; `InlineLoader` for footers.
- **Media.tsx / Stage.tsx / stages/**: 5 styles behind `StageProps` (post, trail, upcoming, playback,
  ready/timer flags). Self-contained: the player can move wholesale.
- **SettingsPanel.tsx** (1,218): right drawer. Sections: Search (source Search/Favs/Recommended, TagInput,
  order, RecommendedPanel with breadth/pins/mutes/rebuild, Filters, Upload date, query preview), Saved
  searches + Recent, Blacklist, Playback, e621 account, Keyboard, e621 button (userscript). Footer:
  Preview / Scroll / Play. Takes ~30 props from App.
- **useRecommendations.ts**: profile sync → tag cache → negatives → learned fit. localStorage: profile,
  tagCache, overrides per user. IndexedDB: `favFeatures:<name>`, `negatives`, `learned:<name>`.

### Tests

- 70 Playwright tests in `e2e/slideshow.spec.ts` against `e2e/mock.ts` (`page.route("https://e621.net/**")`;
  handles posts, autocomplete, users/me, users/42, favorites GET/POST/DELETE, tags; 404 otherwise).
  Sign-in is seeded in localStorage (`tester` / `goodkey`), no UI login. Many tests drive the settings
  panel, so the IA change will rewrite a large share of them.
- `pnpm screenshots`: same mock plus generated blurred SVG animal art at 1280×800.
- Userscript opens `https://e621.cumdump.dog/?tags=<tags>` (or bare `/`) in a new tab, button "▶ Slideshow".

## Target (Phase 4, 2026-11-25; revised after plan review round 1)

Inputs: UX.md v3.2, DESIGN.md (root), DECISIONS.md, the Next 16.3.8 docs digest and e621ng research in the
side-session notes. This section is the build contract for Phase 5; changes go through DECISIONS.md.

### 0. Constraints that shape everything

- **Client-only, credentials in the browser.** The API key lives in memory, plus localStorage only with
  Remember on (as today). It is sent only to `https://e621.net` in an `Authorization: Basic` header,
  never in a URL (except the existing opt-in share-with-sign-in fragment, which is stripped on read).
- **One request lane to e621** at ≤ 2 req/s (today's 550 ms gap). Nothing ever runs two e621 requests
  in parallel. Non-GET requests also spend e621's per-user token bucket, so writes are batched.
- **Vercel, normal build** (not `output: 'export'`), no `cacheComponents` (DECISIONS: it preserves only 3
  routes).
- **Old links keep working** (UX §2 table).

### 1. Routing and the shell

**Route files exist only to give every URL a real response.** Each `page.tsx` returns `null`. The root
`layout.tsx` renders `<ClientShell />` (a `'use client'` wrapper that `dynamic(() => import('Shell'), { ssr:
false })` once, so the shell never remounts) and then `{children}`.

```
src/app/layout.tsx                 metadata, viewport (viewportFit: cover, themeColor), <ClientShell/>
src/app/page.tsx                   /            → shell boot decides (links, else /following)
src/app/following/page.tsx         null
src/app/for-you/page.tsx           null
src/app/for-you/tune/page.tsx      null
src/app/artists/page.tsx           null
src/app/artist/[name]/page.tsx     null (dynamicParams default true: any name)
src/app/search/page.tsx            null
src/app/favorites/page.tsx         null
src/app/settings/[[...section]]/page.tsx  null
src/app/not-found.tsx              shell shows a "Not found" screen with a way home
```

**In-app navigation does not use `router.push`.** It uses native `history.pushState` / `replaceState`,
which Next 16 integrates with its router (docs: "Shallow routing on the client"), so no RSC fetch happens
and the layout never re-renders. The shell reads the location from its own `nav` store
(`useSyncExternalStore` over `{ path, search, state }`, updated by our push/replace and `popstate`), not
from `usePathname`, so it never needs Suspense boundaries for `useSearchParams`.

`src/nav/`:

| Module | Job |
|---|---|
| `routes.ts` | Pure: parse a URL into a `Route` (`{ kind: 'tab', tab } \| { kind: 'artist', name } \| { kind: 'results', query } \| …`, plus `play` and `sheet`), and build URLs from routes. Unit-tested against the UX §2 table. |
| `history.ts` | `push(route)`, `replace(route)`, `back()`, `goTab(tab)`. Every entry we create carries `state.e6 = { depth, key, parentHint }`. `back()` is the UX §3 helper: `history.back()` when `depth > 0`, otherwise `replace(parentOf(route))`. It ignores re-entry while a pop is in flight. The pop resolves on the next `popstate`, or after a 400 ms timeout plus a re-sync from `location` (for a skipped entry or bfcache), so the lock can't stick. `goTab` pops pushed screens through `back()` (awaited), then replaces or pushes per §3. |
| `boot.ts` | Runs once before the first render, and only rewrites history when `history.state?.e6` is missing (a fresh load, not a Back/Forward into entries an earlier document made; those just re-sync the store, as does `pageshow`). It decodes share and launch links (`share.ts` today) and builds **three** entries: `replace('/following')`, `push('/search?tags=wolf&<link filters>')`, `push(…&play=first)`. Closing the player then shows Results, and Back from Results goes home (UX §2). The link's filters live in the Results URL, so a reload keeps them. Pasting a pushed-screen URL inserts `/following` below it. |
| `link-fragment` (inline `<head>` script) | Runs before hydration, because Next's initial `canonicalUrl` is `location.href` including the hash. It moves `#u=…&k=…` into a `window.__e6link` memory variable and strips the hash with `replaceState`. A test asserts that no URL or history entry ever contains `k=`. |
| `scroll.ts` | `history.scrollRestoration = 'manual'`. Saves the outgoing screen's anchor (post id + offset from the top of the viewport) on every navigation and on `pagehide`. Restores the incoming one in a layout effect. Anchors persist in localStorage for 1 day (UX §3). It also owns the **scroll lock** for the player and sheets (`position: fixed` at the saved offset). While locked, `scrollY()` returns the locked offset, windowing is frozen, and anchor saves use the locked value, so nothing reads 0. |
| `edgeSwipe.ts` | Standalone-mode left-edge swipe → `back()` (UX §3). Ships in slice 1. |
| `transition.ts` | Push/Back motion (UX §7) wraps the nav-store commit in `document.startViewTransition(() => flushSync(commit))` where it is supported, and is instant otherwise or under reduced motion. Two screens never need to be visible at once. Stable React 19.2.8 has no `<ViewTransition>`. |
| `focus.ts` | On push, focus moves to the new screen's `h1` (`tabIndex=-1`). Each entry key remembers the element that opened it, and Back restores focus to that element if it is still connected, or else to the screen heading (UX §9.2). |

**Screen stack.** The shell renders:
- The **4 tab roots**, each mounted on first visit and then kept, wrapped in
  `<Activity mode={visible ? 'visible' : 'hidden'}>` (React 19.2).
- The **pushed screens in the current history stack**, keyed by entry `key`, also inside `<Activity>`. A
  screen whose entry is popped unmounts. Its feed stays in the registry (§3) for a while, so coming back
  by Forward restores it from the anchor.
- **Overlays** on top: player (`?play=`), sheets (`state.e6.sheet`), toasts.

Screens scroll the **document** (UX §4). Hidden screens are `display: none`, so only one screen has
height at a time. The scroll module swaps offsets on every visibility change. Media inside a hidden
screen is paused in a `useLayoutEffect` cleanup, because `<video>` keeps playing under `display: none`.

**Spike (slice 1, first thing).** Read from the Next source in review: the patched `pushState`/`replaceState`
merge Next's `__NA` and tree into our object, and traversal preserves custom state (`app-router.js`
84–95 and 252–279; `segment-cache/navigation.js` 492). Still to confirm at runtime on Next 16.3.8:
(a) `popstate` between our entries makes no RSC request and doesn't re-render the layout; (b) boot's
same-tick replace + push and a quick double Back leave the right URL on each entry, since Next's
`HistoryUpdater` (`useInsertionEffect`) re-writes `canonicalUrl` on every router commit; (c) every entry
we push carries `__NA`, because popstate to an entry without it makes Next reload the page; (d) boot on an
unknown URL (the not-found tree); (e) a reload on every route file serves the shell. **Fallback:** one optional catch-all `src/app/[[...slug]]/page.tsx`, with the `nav` store
owning `popstate` outright. Nothing above the `nav` module changes.

### 2. State

Plain React: small external stores read with `useSyncExternalStore` through a selector hook. No state
library. Each store is a module with a typed snapshot, actions, and a `subscribe`. Screens re-render
only when their selected slice changes, which fixes today's `setVersion` whole-tree re-render. Queues
mutate `posts` in place, so each feed publishes a `version` number from the queue's `onChange`, and
selectors over a feed select `version` (plus what they derive), never the array itself.

```ts
// src/state/store.ts (≈40 lines)
createStore<S>(initial: S): { get(): S; set(fn: (s: S) => S): void; subscribe(l: () => void): () => void }
useStore<S, T>(store, select: (s: S) => T, eq = Object.is): T   // useSyncExternalStore + memoized selector
```

| Store (`src/state/`) | Holds | Persists | Replaces in App.tsx |
|---|---|---|---|
| `session` | creds, current user, remember, link session (this tab only) | creds only with Remember (today's keys) | account block, `signIn`/`signOut`, re-verify |
| `prefs` | ratings, blacklist (local + account sync), playback settings, saved searches, recent searches, link-visit overrides | localStorage `e6ss:v1:*` | `search`/`playback`/`saved`/`history` setters |
| `follows` | subscribed tags `name → subId`, loading state, pending ops | IDB per user, 10 min SWR | new |
| `marker` | anchor saved-search id, session threshold `lastSeen`, "marked this session" | localStorage per user, 12 h (so a reload keeps the same dots) | new |
| `favs` | an overlay `Map<postId, boolean>` of optimistic favorite states plus in-flight ops | no | the fan-out patching into every queue |
| `feeds` | the feed registry (§3) | anchors only | `active` queue, `artistFeeds[]` |
| `recs` | the existing `useRecommendations` pipeline as a store (profile, weights, model, ranked list) | as today (IDB + localStorage), plus the ranked id list in localStorage for 30 min | `useRecommendations` hook in App |
| `artists` | derived per-artist stats (`favs`, `postCount`, `lastPostAt`, tiles) and suggestions | IDB, 1 h | new |
| `ui` | toasts, sheet stack, the "Update ranking" / new-posts pill flags | no | toast state, `panelOpen`, `infoOpen` |

**Favorites without fan-out.** Cards and the player render `faved = favs.get(post.id) ?? post.is_favorited`
and `count = post.fav_count + (faved − post.is_favorited)`, which can't double-count once a refetched post
already includes the fav. Ops are serialized per post (the latest intent wins, and a late failure of an
older op doesn't roll back a newer one). A 422 "already favorited" counts as success. Toggling writes the
overlay, calls e621, and on failure reverts the overlay and toasts the reason. A toggle marks the
Favorites feed stale. Queues never get patched, so a post that appears in Following, an artist
page and the player stays consistent.

**Player state is local** to the `Player` component (index, trail, paused, timer, preloader, controls).
Only playback prefs are shared. The 5 stages move over unchanged (`StageProps`).

### 3. Data, caching and paging

**Request lane (`src/lib/e621/client.ts`).** Keep the single throttle chain and add:
- **Priority:** `user` (taps, the visible page) > `page` (next-page prefetch) > `bg` (suggestion tiles,
  tag counts, marker checks). The chain stays strictly sequential; only the order of waiting tasks changes.
- **Aging:** a waiting task gains one priority level every 3 s, so For You's long ranking run can't
  starve `bg` work.
- **Back-off for everyone:** a 429/503 pauses the whole lane for 5 s (not just the feed that got it).
- **`AbortSignal`:** a queued task whose signal aborts is removed before it runs. Feeds abort their
  prefetch when evicted. Queues treat `AbortError` as a no-op, not an error state.
- **New calls:** `getSubscriptions()` (GET `/tag_subscriptions.json`, the whole list, ≤ 500),
  `subscribe(names[])` (POST `tag_names=a b c`, one write; response `{ added, skipped }`),
  `unsubscribe(subId)` (DELETE), `getSavedSearches()` (anchor row: `is_subscription`, `last_seen_post_id`,
  `new_count`), `visitAnchor(id)` (GET `/saved_searches/:id/visit.json`, `redirect: 'manual'`; an
  `opaqueredirect` response counts as success), and `newerThan(id)` (`search:subscriptions id:>N limit=1`).

**Small reads go through a query cache** (`src/lib/cache.ts`): an in-memory `Map<key, { at, promise, data }>`
that dedupes in-flight requests and serves stale data while revalidating. It is optionally backed by IDB
through `bigStorage`, with an envelope `{ v, at, data }` and a per-key TTL, keyed per username.

| Key | TTL / mode | Invalidated by |
|---|---|---|
| `subs:<user>` | 10 min, stale-while-revalidate | follow / unfollow (written through optimistically) |
| `anchor:<user>` | read once per session | `visitAnchor` success |
| `tags:<name>` (post_count, category) | 7 days (today's TagCache) | — |
| `artist:<name>` (lastPostAt + 3 tiles) | 1 h | ratings / blacklist change (refiltered locally, not refetched) |
| `recRanked:<user>` | 30 min (localStorage, UX) | Tune changes, ⋯ › Refresh |
| `feedHead:<feedKey>` | 10 min | refresh |

**Signed-in data at rest (decision, DECISIONS 2026-11-25).** Per-user caches (`subs`, `anchor`,
`feedHead`, `recRanked`, `artist:*`, today's favorites profile) are written to IDB/localStorage **only
with Remember on**; a this-tab-only sign-in keeps them in memory. Sign-out purges every key for that
user. None of them contain the key. `bigStorage` gains `delete`, `keys(prefix)` and a TTL sweep at boot.
Suggestion tiles are keyed **per artist** (`artist:<name>`), not per batch, so keys don't grow without bound.

**Feeds** don't use the query cache: queues own their pages. The `feeds` registry maps a `FeedKey` (kind +
normalized params + ratings + username) to a `Feed { queue, filters, status, anchor, lastUsed, refs }`.
- The 4 tab feeds are pinned. Feeds referenced by the current history stack are kept.
- Others are evicted after 5 min unreferenced, with at most 8 alive. Eviction calls `queue.dispose()` and
  aborts the queue's requests.
- **Ratings are part of the `FeedKey`** (they are in the e621 query), so a ratings change makes new feeds.
  The **blacklist is not** in the key: a change calls `setRules` on every live queue (as today).
- A filter change creates a new key, so it is a new feed (replace history, UX).
- **Instant first paint:** `feedHead` keeps the first page of Following and For You in IDB (10 min).
  A warm launch renders it at once and revalidates behind the new-posts pill rule ("nothing jumps").

**Paging.** Keep `PostQueue` cursor paging (`page=b<id>`, 100 per page) and `RecommendedQueue`. The feed
asks for the next page when the reader passes **70% of the posts loaded so far** (index-based, not a
1,500 px margin), at priority `page`. The player keeps `ensure(index + REFILL_THRESHOLD)`. **Memory:** queues keep slim
posts (only the fields we render, about 1 KB each). One global budget of 3,000 posts covers all live feeds.
Over budget, hidden non-tab feeds are evicted first, then hidden tab feeds are reset to their first page
(the anchor is kept). The visible feed is never trimmed; past 2,000 posts its footer offers "Start from
the top". Head-dropping was rejected: `PostQueue` only pages forward, `RecommendedQueue` can't refetch,
and dropping the head shifts player indices.

**Invalidation on writes:**

| Action | Effect |
|---|---|
| Follow / unfollow | Ops are serialized per tag (an Undo-unfollow waits for its follow). POST returns `{ added, skipped }` with ids in `added`; any tag without an id gets a list refetch before its DELETE. Pending ops are re-applied on top of any fetched list, and a fetch that started before the latest write is dropped (a generation counter). `follows` updated optimistically and written to `subs:`. Following's feed gets a "stale" flag (shows the new-posts pill on the next visit; never reorders in place). Suggestions drop that artist. On failure: roll back, toast. |
| Favorite | `favs` overlay; the For You profile counts update lazily on the next sync. |
| Sign in / out | Per-user stores reset. Feeds keyed by user, so the old user's feeds are disposed. IDB entries stay keyed by user. Sign-out deletes the remembered key. |
| Ratings | New feed keys (the old feeds are disposed); suggestion tiles refiltered locally. |
| Blacklist | `setRules` on live queues; suggestion tiles refiltered locally. |
| Mark seen | `anchor:` updated; the threshold for this session stays (UX: dots don't move). |

### 4. Following specifics

- Feed: `search:subscriptions` + ratings + filters, newest first.
- Threshold = `last_seen_post_id` from the anchor on the first load of the session; `marker` keeps it for
  12 h so a reload mid-session shows the same dots.
- **Pure functions, unit-tested** (`src/lib/following/`): `isNew(post, threshold)`,
  `bursts(posts, threshold)` (runs of 5+ new posts sharing their first artist → first 3 + "+N"),
  `dividerIndex`, `newCountLabel` ("12 new" / "40+ new"), and `shouldMarkSeen(state)` implementing UX §5's
  three rules.
- `visitAnchor` uses its own fetch path (`redirect: 'manual'`; `request()` throws on status 0). It runs only
  after `newerThan(maxRawIdSeen)` returns nothing, where `maxRawIdSeen` is the highest id the queue
  received *before* the blacklist and filters, so hidden posts can't block marking forever. Then it
  re-reads the anchor: only if `last_seen_post_id` went up does it toast "Marked as seen on e621".
  Otherwise it falls back to the local marker and logs why.
- **Not verified live.** The marker calls are built from the e621ng source. The live check needs the
  owner's key in the browser pane (the owner signs in; I never type it). Fallback if `visit.json`
  misbehaves: a local marker per account (DECISIONS).

### 5. Rendering performance

- **Windowed feeds without a library.** Each post's height is known before its image loads: header 44 +
  media ((column − 24) × h/w from `post.file`, at the post's own aspect ratio per DESIGN, except images taller than 1:2, which are capped at 1:2 and shown whole on the panel colour; DECISIONS) + 12 + 32 + 12 + 32 + 12
  padding + 24 gap. A pure `layoutFeed(posts, width)` returns offsets. The feed renders posts whose box
  is within ±2 viewports, absolutely positioned inside a spacer of the total height. Tests cover the
  layout math. Bursts and inserted rows (divider, suggestion card) have fixed heights too. Card heights are pinned in CSS (`height`, `overflow: hidden`), and a dev-only check warns when a measured card differs from the math. **One `relayout(preserveAnchor)` path** handles everything that changes the layout: resize/rotation, font load, `setRules`, `queue.remove` (media error), burst expand. It records the anchor, recomputes, and scrolls so the anchor stays put. Grids are
  square tiles, so the windowing is trivial.
- **Measure before adding a library.** If windowing shows jank on device, revisit (`@tanstack/virtual` is
  the candidate) with a DECISIONS entry.
- **Images:**
  - Cards use `sample` (preview below 300 CSS px).
  - Every image has `width`/`height` attributes (no layout shift), `decoding="async"` and
    `loading="lazy"`. The first card gets `fetchpriority="high"`.
  - Grid tiles go preview → sample as today.
- **Video:**
  - One live `<video>`: the card nearest the middle, muted, `playsinline`. All others are posters.
  - Paused on Activity hide.
  - No autoplay with reduced motion.
- **Budgets** (checked in Phase 6 and noted in TESTING.md):

| Budget | Target | How it's measured |
|---|---|---|
| Scroll | 60 fps, no task over 50 ms while scrolling | Chrome performance panel, 4× CPU throttle, 375×812 |
| First feed content | < 1.5 s on a warm cache | `feedHead` cached first page |
| Layout shift | CLS 0 from images | reserved aspect ratio on every image |
| Card count | ≤ 30 cards in the DOM | windowing |
| JS | ≤ 200 KB gzip of JS transferred on a cold load of `/following` | Lighthouse (Next 16 build output no longer prints First Load JS) |

### 6. Artist recommendations (Artists › Suggested, the Following card)

For each artist tag in the favorites profile (`profile.tags[x].n`, artist category) that you don't follow
and haven't hidden:

```
affinity = (favs + 1) / (postCount + 20)          // smoothed share of their work you've favorited
recency  = max(0.2, exp(-daysSinceLastPost / 45)) // still active?
learned  = sigmoid(model weight of the artist tag) // Recommended's learned weight, 0.5 when unknown
score    = affinity × recency × (0.5 + learned)
```

- Require `favs ≥ 3`.
- `postCount` comes from the tag cache (batched `getTags`, 100 names per request).
- Two passes, so the list doesn't reorder while you read it: rank all candidates by
  `affinity × (0.5 + learned)`, fetch `lastPostAt` + tiles for the top 24 (batched `~a ~b … order:id_desc`,
  8 artists per request, `limit=320`, filtered by ratings and the blacklist on our side), then re-rank
  once with recency and only then show. An artist the batch left without 3 tiles (a prolific neighbour
  filled the page) gets its own `limit=3` request at `bg` priority.
- Cached 1 h per user.
- "Follow from favorites" uses the same score: top 30, top 10 pre-checked.
- Unit tests: ordering, smoothing (1 fave of 2 posts must not beat 40 of 300), exclusions.
- `scripts/rec-backtest.ts` gets an `--artists` mode: hide 20% of each fixture's favorites, rank artists
  from the rest, report recall@10 of the hidden favorites' artists.

### 7. PWA and service worker

- `app/manifest.ts`, `app/icon.png`, `app/apple-icon.png`, `viewport.viewportFit = 'cover'`, and
  `appleWebApp` with `statusBarStyle: 'black-translucent'`.
- **Hand-rolled `public/sw.js`** (about 80 lines). Serwist was rejected: a build plugin for a small surface,
  and Turbopack support is still young.
- **What it caches:**
  - `/_next/static/*`: cache-first (immutable).
  - Navigations: network-first with a 3 s timeout, falling back to the cached shell, because every route
    serves the same shell.
  - The shell (`/following`) and the icons are precached at install. On first activation the worker
    calls `clients.claim()` and caches the page's already-loaded resources (`performance` resource
    entries for same-origin `/_next/static/*`), so an offline launch after the first visit still has its
    chunks. Registered with `updateViaCache: 'none'`; the page reloads on `controllerchange` only after
    the user taps "Reload".
- **What it never touches:** any cross-origin request. e621 API calls and e621 media pass straight
  through, so no `Authorization` header and no authenticated response is ever stored by us. e621 images
  rely on the browser's HTTP cache in v1, because `<img>` without CORS gives opaque responses that inflate
  the cache quota. If the live check shows `static1.e621.net` sends `Access-Control-Allow-Origin`, slice 8
  adds a capped (300 entries) cache of **preview thumbnails only**, loaded with `crossorigin="anonymous"`
  (DECISIONS).
- **Tests:** Playwright runs with `serviceWorkers: 'block'` (so `page.route` mocks see every request),
  except in the one SW test.
- **Versioning:** registered as `/sw.js?v=<build id>`, where the build id is `VERCEL_GIT_COMMIT_SHA` exposed
  as `NEXT_PUBLIC_BUILD_ID`. The cache names include the version, and `activate` deletes old caches.
- **Updates:** the new worker waits. The page shows a toast "Update ready · Reload", which posts
  `skipWaiting` and reloads.
- `next.config.ts` `headers()` serves `/sw.js` with `Cache-Control: no-cache` and the correct type.

### 8. Migration

- localStorage keys under `e6ss:v1:` keep their meaning. New keys use the same prefix with new names.
- A one-time `migrate.ts` maps the old `search` settings:
  - ratings → `prefs.ratings`
  - blacklist → `prefs.blacklist`
  - order, media, date and score → the Results default filters
  - saved and recent searches as they are
- Old keys are left in place for one release (rollback stays possible).
- The UX §2 link table is covered row by row by `routes.ts` unit tests and e2e tests (share, share with
  sign-in, userscript launch, pasted artist URL, `/`).

### 9. Dependencies (each logged in DECISIONS.md)

- **Add `sonner`** for toasts. It gives Undo actions, pause on hover/focus, a `role="status"` live region
  and swipe-dismiss, matching UX §9.6. About 10 KB.
- **Fredoka via `next/font/google`** (500, 600; latin subset; DESIGN.md v6, replacing Nunito). It downloads at build time and serves the
  files from our own domain, so there is no runtime Google request and no extra dependency.
- **A CSP** in `next.config.ts` `headers()`: `connect-src 'self' https://e621.net`;
  `img-src 'self' data: blob: https://static1.e621.net`; `media-src https://static1.e621.net`;
  `frame-ancestors 'none'`. So an injected script can't send the key anywhere but e621. `script-src`
  needs `'unsafe-inline'` for Next's inline bootstrap unless nonces are wired up (decide in slice 8).
- **No** state library, virtualization library, Motion, Vaul or Serwist for now. Sheets are hand-rolled
  (history-integrated, drag to dismiss); motion is CSS and the Web Animations API.

### 10. Testing

- **Unit** (`src/lib/__tests__`, `src/nav/__tests__`, `src/state/__tests__`):
  - routes parse/build and the link table
  - the back helper as a pure state machine over a fake history
  - registry eviction
  - store selectors
  - feed layout
  - bursts and the marker rules
  - artist score
  - migration
  - the request lane's priority and abort
- **e2e:** `e2e/mock.ts` gains `tag_subscriptions` (index/create/destroy with 500 and skip reasons),
  `saved_searches` (anchor row) and `visit.json` (302). The 70 existing tests are rewritten by slice as the
  settings-panel flows move to screens. Hidden Activity screens stay in the DOM, so locators use visible
  roles (`getByRole`) only.
- **Gates per slice:** `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`; the `code-review` skill
  (high); and for the state, routing and caching slices, a fresh reviewer given only the diff and this
  section.

### 11. Slices (Phase 5 order)

| # | Slice | Done when |
|---|---|---|
| 1 | Spike (§1) → stores + `nav` + shell with the tab bar and screen stack, edge swipe, focus handling, `migrate.ts` (the new `prefs` keys arrive here, so migration must too). **Interim home:** until slice 3 the Following tab slot hosts today's settings-panel home, so the existing e2e flows keep a place to start. Today's feed, grid, player and settings run inside the shell with no feature change. Tokens from DESIGN.md into `globals.css` `@theme`, Nunito via next/font. | Every URL in the UX §2 table opens the right screen; Back works per §3; reload keeps the place; an old localStorage profile migrates (e2e); existing e2e flows green after the port. |
| 2 | Feed screens: Results, Favorites, For You (+ Tune) as screens, with the chips row, windowed feed, grid toggle, the new post card, and the player as `?play=` with the quick-settings and info sheets. | Feed parity with today; player opens and closes onto the right post; budgets measured once. |
| 3 | Following: subscriptions feed, threshold, dots, divider, bursts, pull to refresh, new-posts pill, round Play button, mark seen. Replaces the interim home. | UX §5 Following rules covered by unit and e2e tests; live marker check done with the owner (also checks `tag_subscriptions` POST output and `static1` CORS). |
| 4 | Follow everywhere: the `follows` store, Follow pills on cards/player/artist, the 500 limit, undo toasts. | Optimistic follow with rollback under a failing mock. |
| 5 | Artists tab: Following list, Suggested, artist score, follow-from-favorites (bulk). | Score unit tests + backtest run; bulk follow is one request. |
| 6 | Artist page: hero, stats, compact bar, chips, share. | Pasted `/artist/x` works signed in and out. |
| 7 | Settings sub-pages, sign-in sheet, signed-out landing; the interim home's last pieces move into Settings. | Sign-in sheet flow and every Settings group covered by e2e. |
| 8 | PWA: manifest, icons, service worker, update toast, CSP. | Lighthouse installable; SW never stores cross-origin responses (test). |
| 9 | Polish and motion pass (Emil skills), peripheral extras (P1–P8 left over). | Owner-visible checklist in TESTING.md. |

### 12. Risks

| Risk | Mitigation |
|---|---|
| Next's patched `pushState` drops or rewrites our `state.e6` | Slice 1 spike; catch-all fallback with our own `popstate` ownership |
| Document scroll + several Activity screens: scroll offsets bleed between screens | Swap offsets in `scroll.ts` on every visibility change. Fallback (UX §4): one inner scroll container per screen |
| e621 marker calls behave differently live | Live check in slice 3 with the owner signed in; local-marker fallback |
| Windowing jank on iOS Safari (absolute positioning + image decode) | Measure in slice 2 on device; `@tanstack/virtual` as plan B |
| iOS kills the backgrounded PWA and wipes sessionStorage | Anchors, the ranked list and the threshold live in localStorage (UX §3) |
| 70 e2e tests drive the old settings panel | Port per slice; don't delete a test until its flow has a new test |
