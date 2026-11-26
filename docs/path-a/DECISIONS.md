# Decisions (append-only)

Format: date — decision. Why. Rejected alternatives.

## 2026-11-25 — Inherited from the owner (GOAL.md §2)
- Following is the signed-in home tab; signed-out gets a landing that still allows search.
- Share e621's "new since last visit" marker if clean, else a local marker per account.
- Phone first; desktop is a sidebar version plus existing keyboard shortcuts.
- Extras in scope: artist profile pages, PWA, pull to refresh + new-posts pill, bulk-subscribe from favorites.

## 2026-11-25 — Phase 1 scope frozen (owner answers in QUESTIONS.md Q1–Q7)
- **Tabs:** Following · For You · Artists · Settings. Search is a header button on every tab opening a
  search screen (saved + recent + Favorites shortcut); results open as their own feed. Favorites is also
  reachable from For You. Rejected: 5th tab (tight on phones), Explore switch.
- **Player settings:** quick sheet in the player (style, speed, fit, mute) + full list in Settings.
- **Launch links** (`?tags=`) start the slideshow straight away; closing the player lands on a feed of
  that search, not the home tab. Share links (`?v=1…`) likewise.
- **New-post marker: share e621's.** Read `last_seen_post_id` of the `is_subscription` row from
  `GET /saved_searches.json`; advance with `GET /saved_searches/:id/visit.json` (fetch with
  `redirect: "manual"`; the 302 is the success signal, opaque cross-origin). It touches only that row,
  so the user's other tracked searches are safe. Known trade-offs: the marker jumps to the site's max
  post id at visit time (posts uploaded between load and visit lose "new"), `new_count` caps at 100, the
  anchor doesn't exist until the first subscription. Rejected: `mark_all_seen` (clears every tracked
  search), `/tag_subscriptions/visit` (HTML, and only safe without custom tracked searches). Not yet
  verified against live e621 (needs the owner's key): fallback is a local marker if visit.json misbehaves.
- **Extras in scope:** P1 scroll per tab, P2 caught-up divider, P3 heart burst, P4 group artist bursts,
  P5 feed chips (Images/Videos, Hide favorited, Sort New/Top/Hot, Date Today/Week/Month, Score > N; no
  rating chip), P6 new dots on Artists, P7 offline state, P8 share an artist. Plus a microinteraction
  pass trialled with the Emil animation skills (owner asked). Out: P9 snooze, P10 haptics, P11 badge.
- **Hosting:** stay on Vercel (not static export), so `/artist/[name]` works without
  `generateStaticParams`. One persistent client shell in the root layout keeps queues and scroll alive;
  don't rely on `cacheComponents` (keeps only 3 hidden routes). Details in ENGINEERING.md target (Phase 4).

## 2026-11-25 — UX sign-off round
- Seen marker moves automatically (owner, Q8): after scrolling a screen past the divider with no filters,
  dwell 1.5 s, toast "Marked as seen on e621". Manual ⋯ › Mark all as seen too.
- UX not yet signed off (Q9): spacing/hierarchy research first, all wireframe values tokenized, fix card
  header alignment and suggestion tiles. Research lives in `docs/path-a/research/`.

## 2026-11-25 — UX signed off (Phase 2 gate)
- Owner: UX okay; spacing/hierarchy work continues as visual design (Phase 3), informed by the three
  research files in `docs/path-a/research/`.
- Suggestions (Following card and Artists › Suggested) show one artist per section with 3 tiled recent
  posts, filtered by ratings + blacklist, fetched in one batched `~a ~b …` request. Rejected: a
  horizontal row of small avatar tiles (owner found it janky).

## 2026-11-25 — Visual direction (Phase 3)
- Owner picked **A, e621 colours refined** (navy + #fcb328 gold), with a condition: "it should not tint
  every picture. The idea behind this is seeing the art." So the ground around art is a neutral
  near-black; navy is kept for chrome surfaces (cards, chips, sheets, tab bar) that don't frame art,
  and gold for accents. Nothing is overlaid on art except what the medium needs (video play, mute).
  Rejected: B plush hang tag (my recommendation), C reference sheet. impeccable telemetry: kind canon.
- Owner: spacing fixes "a little better", but "overall our visual information architecture and sizes of
  things all feels kind of off and inconsistent". Response: a closed size system (5 type sizes, 2
  control heights, 1 row height, 2 icon sizes, 3 avatar sizes, 5 spacing steps, 3 radii) that every
  screen must use, shown on the next comparison page.
- Process fix: the first comparison shipped with chips, Play and Follow unstyled (a `.phone button`
  reset beat the component classes). Every mock now gets a Playwright screenshot before it's shown.

## 2026-11-25 — Direction A v3 (owner feedback on v2)
- Owner: v2 "too close to an Instagram clone": single full-width feed, post header + heart row, flat
  minimal dark look, icon tab bar all contributed. "Definitely want to stick with e621 theming (navy)."
- Owner chose: **navy post panels** (art inside, navy frames are fine), **tag category colours**, **post
  numbers and scores**, **navy panels and borders**. Not chosen: hexagon motif.
- v3 uses e621ng's Hexagon theme values (background #020F23, foreground #152F56, section #1F3C67, link
  #B4C7D9, active gold #E8C446, tag/rating/score colours). Six small-text colours fail 4.5:1 on panels in
  e621 itself; v3 keeps each hue and lightens it to pass. Verdana stack for type. Text tabs with a gold
  marker replace the icon tab bar. Play is a squared gold button bottom-right.
- Gold changes from the app's #FCB328 to e621's own active colour #E8C446.

## 2026-11-25 — Direction A v4 (owner references)
- Owner: bottom bar should float, "mimicking iOS standards and approach to clean ui". Shared AllTrails iOS
  screens as a reference for organised visual architecture, buttons and structure.
- Owner: "I don't want to rip it directly. It should be treated as a study for things like spacing,
  component design ... take those learnings into our own design as a designer would, not directly
  copying." Study recorded in research/alltrails-study.md (principles → ours, plus a Not taken list).
- v4: e621 Hexagon colours (v3) + iOS structure: large titles, round toolbar buttons, floating navy glass
  tab bar (icon + label, selected tab in its own capsule, gold), Play pill floating above it, posts with
  rounded art and three fixed lines under it (artist / e621 stats with favourite pill / coloured tags), no
  card boxes, nothing on top of art except video controls. System font (SF Pro) replaces Verdana; the
  owner didn't answer the font question, so this follows "iOS standards".

## 2026-11-25 — Duolingo study (owner)
- Owner: "study and pull on duolingo design for a more playful feel and do research about their design."
  Same rule as AllTrails: a study, not a copy. Observations from owner-shared screens are in
  research/duolingo-study.md. Published-source research is in research/duolingo-research.md (agent).
  v5 mocks will apply: tactile lips on pressables, rounded type (ui-rounded), coloured stat icons, meaning
  colours on navy, chunky progress, celebration moments off the art, our own mascot.

## 2026-11-25 — Visual direction signed off (v5.2)

- Owner on v5.1: "Yes, want artist name/info at top of card tho, with faving and other things below. Maybe
  play button is a circle with play logo inside on bottom right of screen instead of center".
- v5.2 applies both: the artist line (avatar, name, New · time, ⋯) heads each navy post panel, as UX.md's
  card sketch already showed; favourite, score, post number and tags sit under the picture. Play is a
  56 px gold circle at the bottom right above the tab bar, with a small count badge. UX.md bottom stack
  updated to match.
- Kept from review round 2 (owner didn't object): e621 tag category colours, "Media" / "Hide favorited"
  labels.
- Phase 3 gate: two design review rounds done (REVIEWS.md) + owner OK. Archived: mocks/direction-a-v5-2.html.

## 2026-11-25 — Post panel spacing (v5.3)

- Owner on v5.2: "I still think that the spacing here is a little jank". Causes: the header collapsed to 24 px
  (a `.line1` rule overrode its 44 px height), so the avatar sat 4 px under the border; the picture was inset 8
  while text was inset 16; top and bottom padding differed (4 vs 12).
- Fix (owner: "let's do it"): one 12 px inner edge for everything in the panel; 44 header flush to the top;
  12 picture → stats, 12 stats → tags (kept at 12, not 8, so the 44 hit areas don't overlap), 12 bottom.
  Rejected: full-bleed picture inside the panel (bigger art, but reads as a generic social card).

## 2026-11-25 — Engineering plan (Phase 4)

- **Navigation:** native `pushState`/`replaceState` inside one persistent client shell (route files return
  null). Why: no RSC round-trips, the shell never remounts, history entries carry our depth. Rejected:
  `router.push` per screen (remounts, no custom state); `cacheComponents` Activity (3 routes).
- **State:** plain `useSyncExternalStore` stores. Rejected: Zustand/Jotai (not needed for ~9 small stores).
- **Windowing:** hand-rolled from known post aspect ratios. Rejected for now: `@tanstack/virtual` (plan B if
  device measurement shows jank).
- **Feed images** keep their own aspect ratio; only images taller than 1:2 are capped at 1:2 and shown
  whole on the panel colour. Why: the art is the star; a 1:6 comic strip would otherwise fill five screens.
- **Signed-in data at rest:** per-user caches (subscriptions, marker anchor, first feed page, For You ranked
  ids, artist stats, favorites profile) persist to IDB/localStorage only with Remember on; this-tab-only
  sign-ins keep them in memory; sign-out purges them. They never contain the API key.
- **Service worker:** hand-rolled; never handles cross-origin requests, so it can't store the key or an
  authenticated response. e621 thumbnails are not SW-cached in v1 (opaque responses inflate quota);
  revisit with `crossorigin` previews if `static1.e621.net` sends CORS headers. Rejected: Serwist.
- **Dependencies:** add `sonner` (toasts with Undo, `role="status"`, pause on hover/focus). Nunito through
  `next/font/google` (self-served, build-time download). No Motion, Vaul, Serwist or state library.
- **CSP** limiting `connect-src` to self + e621 (slice 8).

## 2026-11-25 — Slice 1 build (scope adjustments)

- **Spike passed, no fallback needed.** On Next 16.3.8: every entry we push carries `__NA`; tab and
  pushed-screen moves and Back/Forward make no RSC request; boot's same-tick replace + push and a quick
  double Back leave the right URL on each entry; an unknown URL and a reload on every route file serve the
  shell (`e2e/nav.spec.ts`). The catch-all fallback route stays unused.
- **Boot runs in a layout effect**, not during render: it writes history, and Next's patched `pushState`
  updates Next's Router, which React forbids while another component renders.
- **Boot walks parents** with `parentOf` (a pasted `/settings/content` gets `/following`, `/settings` under
  it; `/for-you/tune` gets For You), so browser Back and in-app Back agree.
- **The legacy home is not in `<Activity>`.** Hiding runs effect cleanups, and the legacy App disposes its
  show's queue in one. It stays mounted and is hidden with `hidden`. Real screens use Activity as planned.
- **Screens scroll in their own box** (`.screen`, fixed, `overflow-y: auto`) until slice 2 moves feeds to
  document scroll; offsets and tab re-tap scroll-to-top act on that box. Post-anchored restore with the
  1-day localStorage copy lands with the feeds in slice 2.
- **Moved to slice 2:** the `session` and `prefs` stores (the legacy App still owns that state, and the
  prefs keys don't change meaning yet), and `sonner`. `migrate.ts` ships now as a schema-versioned step
  runner (`e6ss:schema`) with a no-op 0 → 1 step; each slice that changes what a key means adds its step.
- **Legacy palette kept beside the new tokens.** DESIGN.md's `--color-panel` (#152F56) took the name, so
  the legacy panel colour is `--color-panel-old` (5 class names changed, no visual change).
- **Legacy link params:** boot moves `/?…` to `/following?…` only when the legacy decoders recognise a share
  or launch link; other params are dropped.
- **Gestures:** a Back from the edge swipe or from the browser (popstate we didn't start) never animates;
  only our own push and Back buttons do. Tab switches cross-fade 120 ms.
- **Desktop rail** is 88 px (16 + 56 + 16), not in the mock; logged as a spec value.

## 2026-11-25 — Slice 2a build (Results, Favorites, Search, player, links)

- **Slice 2 ships in two commits:** 2a (stores, document scroll, post card, windowed feed and grid, chips
  and sheets, Search, Results, Favorites, interim Artist, the player as `?play=`, links) and 2b (For You,
  Tune). Same tests and reviews per commit.
- **Results' default filters come from the legacy saved search** (`prefs.search`: media, order, date, min
  score) while the legacy panel exists. Slice 3 moves them to per-feed filters.
- **Hide favorited** adds `-fav:<you>` to the e621 query (no client-side pass, so counts and paging stay right).
- **The blacklist is not part of a feed's key.** A new line hides matching posts in place in every live
  feed; taking a line away starts the feeds over (hidden posts can't come back otherwise).
- **Share and launch links** become three entries at boot: Following, the link's Results (`v=1` or `l=1`
  in its URL, so a reload keeps the link's settings for the visit), then the player from the first post.
  The legacy home no longer reads links.
- **Quick settings during a link visit save as yours** (no "this visit only" switch in the sheet).
- **Saved searches** from Results keep tags, order and date; ratings are the account-wide ones (no
  per-search ratings).
- **Interim Artist screen** (`/artist/<name>`): the artist tag's posts with your ratings and blacklist, no
  chips (the route has no filter params until the artist page, slice 6). Card names open it.
- **Favorites "Sign in"** goes to the Following tab (the interim home has the sign-in form) until the
  sign-in sheet lands in slice 7.
- **Later slices:** pull to refresh, new-posts pill and Follow pills (3–4); signed-out ♥ → sign-in sheet (7).
- **Toasts:** sonner, bottom centre above the tab bar, 6 s, dark theme.
- **Budgets:** the card-count budget is covered by e2e (windowing); scroll fps, first content and JS size
  are measured at the end of slice 2b.
- **Request lanes** (ENGINEERING.md §3 priority and aging) are deferred to slice 3, when Following's
  background reads first compete with a screen's feed. Slice 2 feeds fetch directly.

## 2026-11-25 — Slice 2b build (For You, Tune)

- **The favorites profile is a shared store** (`src/state/rec.ts`): one sync per sign-in, read by For You,
  Tune and the legacy home. It follows the session and never reads a share link's borrowed sign-in.
- **For You's Date chip unset means the last 7 days** (the engine's `recommendedWindow`), and the chip and
  its sheet say "Last 7 days" instead of "Any time". UX §5's "default This week" is the same window in
  practice; keeping the engine's default leaves the backtested numbers (stream.ts) valid.
- **The ranked list is saved only with Remember on** (per-account caches persist only with Remember,
  ENGINEERING §2), under `ranked:<user>`, for 30 minutes, at most 3,000 ids. Sign-out removes it.
  A reload replays it with `id:a,b,…` searches, 100 ids a request, in the saved order; posts deleted or
  newly blacklisted since drop out; nothing re-ranks.
- **Restoring ignores profile changes; the pill reports them.** A saved list is shown when its filters
  and account match; if the profile has changed since (a sync, Tune), **Update ranking** shows at once.
- **Nothing re-ranks on its own.** A changed profile shows the pill; a tap ranks now (progress loader).
  **⋯ › Refresh** ranks in the background with the old list still shown ("Ranking again…"); the pill
  appears when the new list is ready, and a tap swaps it in. Pull to refresh is slice 3.
- **The first ranking waits for a first-ever sync to finish learning**, so the first list isn't stale the
  moment it shows. Later loads rank (or restore) at once with the stored fit.
- **Holding a tag on For You offers Pin** (as the legacy Recommended feed did), with a toast that says to
  update the ranking.
- **Rec warnings go through sonner**, not the legacy toast (which hides behind the other screens).
- **Screens load lazily.** Search, Results, Favorites, Artist, For You, Tune and the player are their own
  chunks, fetched on idle after boot; a pushed screen's heading takes focus when its code lands.

## 2026-11-25 — Slice 3a build (Following)

- **Slice 3 splits like slice 2.** 3a: the Following screen (feed, threshold, New, divider, folded runs,
  Play count, marking seen, the e621 marker calls) and the legacy home's move. 3b: pull to refresh, the
  new-posts pill's own checks and count, request-lane priorities and back-off, `feedHead` instant paint.
- **The legacy home moved to Settings › Account** (`/settings/account`) until slice 7. It's one screen
  however many entries show it, mounted on first visit outside `<Activity>` (hiding there would dispose a
  running show) and hidden when not on show. Every "Sign in" button goes there (`openSignIn`).
- **Following is part of the first-load bundle** (not a lazy chunk): it's the home tab, so a lazy chunk
  would only add a round trip before first content.
- **Following ignores a share link's borrowed sign-in**, like For You: it shows the signed-out landing,
  so a visitor never reads or moves the link owner's marker.
- **The "anything newer?" check runs the feed's own search** with `id:>N` in its tag box (ratings,
  Media) instead of a bare `search:subscriptions id:>N`. With ratings off for some posts the bare check
  would keep finding posts the feed never shows, and the marker would never move. `N` is the highest id
  e621 sent the feed before the blacklist and filters (`PostQueue.rawMax`).
- **The session's threshold** is kept 12 h under `marker:<user>` (localStorage with Remember, this tab's
  sessionStorage without), so a reload shows the same dots. **After a mark, the next load starts a new
  session** from e621's new marker; otherwise a reload hours later would show the same posts as New again.
- **Local marker fallback:** when `visit.json` fails or the marker doesn't move on a re-read, the app
  keeps `seen:<user>` (the highest id loaded) and the next session's threshold is the larger of e621's
  marker and it. The toast says "Marked as seen on this device. e621 didn't take it." Sign-out (and a
  sign-in without Remember) purges `ranked:`, `marker:` and `seen:` for the account.
- **Mark all as seen still runs the newer check** (it skips rules 1 and 2, as UX §5 says). If newer
  posts came in, the pill shows and nothing is marked.
- **Following's chips (Media, Hide favorited) are kept** across visits, like For You's (`following` in
  prefs). Follows-nobody shows a short note over **Popular today** until Follow from favorites (slice 5).
- **New is a gold "New" in the card's time line** (the approved mock), and a gold dot on grid tiles. A
  folded run's row reads "4 more from otter artist ▾"; the divider is the kaleidoscope mark, "You're
  caught up" and, once marked, "Marked as seen on e621".
- **The empty feed says "Nothing yet from the N tags you follow."** (UX: "artists"): e621 follows are tags,
  and someone may follow general tags on e621.net.
- **"A screen past the divider" means the divider has reached the top of the view**: the whole screen
  is then older posts. Near the end of the list, where it can't reach the top, reaching the bottom with
  the divider on screen counts too. In the grid the divider is the top of the tile row holding the first
  old post, so grid scrolling marks seen as well.
- **The newer check uses every filter, Hide favorited too** (review): a check without `-fav:` kept
  finding a faved post the feed hid, and the mark never moved.
- **Playing past the new posts needs a new post first**: the player must have shown a post above the
  threshold before an old one marks seen. Opening an old post straight from its card, a link or a reload
  marks nothing.
- **A failed mark backs off**: automatic tries wait a minute after a failure and toast only the first
  one; Mark all as seen always says why. Mark all that finds newer posts says "New posts came in, so
  nothing was marked."
- **A visit that went through but couldn't be read back** keeps the local marker too and says "Marked as
  seen. Couldn't confirm it with e621." (not "e621 didn't take it").
- **Expanded runs last the session** (sessionStorage, by first post id). A run counts as open if any of
  its posts opened one, so newer posts by the same artist joining its head don't fold it again. A saved
  place on a post that has folded since lands on its "+N more" row.
- **Esc on Settings › Account stays with the legacy app** (it opens and closes its own panel with Esc);
  back is the browser's Back or the tab bar. Interim until slice 7 replaces the account screen.
