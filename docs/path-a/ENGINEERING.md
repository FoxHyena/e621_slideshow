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
