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

## 2026-11-25 — Slice 3b build (refresh, pill, lanes, instant paint)

- **The request lane is a priority scheduler**, still strictly one request at a time, 550 ms apart:
  `user` (the screen on show, a tap, a feed's first page) > `page` (later pages read ahead) > `bg`
  (marker checks and visits, the favorites sync and its negatives). A waiting task gains a level every
  3 s. A 429 or 503 pauses the whole lane 5 s. A waiting task whose signal aborts leaves the line.
- **Evicting a feed cancels its waiting requests** (`PostQueue.cancel`), but doesn't end the queue: a
  hidden screen may still hold it, and its next `ensure` asks again. A cancel is never an error.
- **The new-posts count runs as `user`**: it's asked for the screen on show, and as `bg` it waited
  behind a hidden For You's ranking until aging let it through (about 6 s). It counts up to 30
  ("30+ new posts") with the feed's own query and today's blacklist and media.
- **Coming back is detected by effects re-attaching**: a hidden `<Activity>` runs no effects, so a
  `visible` flip is never seen. Plus `visibilitychange` (app foreground). At most once every 15 s,
  counted from a request actually sent.
- **The pill never inserts on its own** (UX "Nothing jumps"). A tap smooth-scrolls to the top (instant
  with reduced motion), then starts the feed over. No slide-down animation yet (Phase 6 polish).
- **Instant paint covers Following only.** Its first 24 posts are saved per user (`feedHead:<user>`,
  localStorage, Remember on only, 10 min, keyed by feed key; refresh and sign-out remove it). A reload
  seeds the queue from them, pages on below the last one, and asks for newer posts behind the pill. For
  You already restores its saved ranked list in one request, so it has no head of its own.
- **A same-session reload skips the anchor round trip**: the marker record keeps the anchor row, so
  Following is ready at once with the session's threshold and re-reads the row in the background (`bg`).
  After a mark the next load waits for e621, as before.
- **Pull to refresh** follows UX §4 (10 px axis lock, half travel, 144 px arms, 48 px hold ≥ 400 ms;
  touchmove listened to passively and only during a pull). Following re-reads the anchor row and starts
  the feed over; the spinner waits for the first page. For You says "Already fresh, ranked N min ago"
  under 10 minutes, otherwise ranks again behind the Update ranking pill. Results and Favorites get it
  with their own slices.

## 2026-11-25 — Signed in from the first paint (live check follow-up)

- **With Remember on, the account e621 last confirmed is kept** (`account:<user>`: id, name, blacklist,
  tag limit; never the key). A reload with that and the remembered key is signed in and `ready` at once,
  so feeds (and Following's saved first page) paint before `/users/me` answers; the check runs behind.
  The live check showed why: e621 took 4.5 s for `/users/me`, and nothing painted until then.
- **A refused key (anonymous answer, 401, 403) signs the saved account out** and drops the record, with
  the "e621 sign-in failed" toast. Offline or busy keeps the account; the next load checks again.
- Sign-out and a sign-in without Remember remove the record (`purgeAccount`).

## 2026-11-25 — Slice 4 build (follow everywhere)

- **`follows` store** (`src/state/follows.ts`): `name → subscription id` from `GET /tag_subscriptions.json`,
  read once per account and kept 10 min, refreshed behind what's shown (`bg`). What shows is your latest
  tap over what e621 has. Taps on one tag run one at a time and each run sends the latest intent, so an
  Undo waits for its follow and quick taps settle on the last one. A failure rolls back that tag (only if
  no newer tap replaced it) and toasts e621's reason.
- **A list read that a write overtook is dropped** (a counter bumped when a write starts and ends) and
  asked again once the writes settle. A follow that e621 answers "already subscribed" has no id; its
  unfollow reads the list first. A 404 on unfollow counts as done. With one tag asked for, the one added
  row counts as it (e621 follows aliases under the new name), and is kept under both names. A run or an
  Undo from before an account switch does nothing for the new account. A failure that a later tap
  already replaced rolls nothing back and says nothing (the later tap speaks). Names with whitespace
  are refused (e621 would follow each word).
- **Kept on disk as `subs:<user>` in localStorage, Remember on only** (≤ 500 short rows, ~20 KB), not
  IDB as ENGINEERING §2 said: one small synchronous read lets cards know at first paint which artists
  you follow. Only a list e621 sent is saved (a write before any read isn't), and only a remembered
  sign-in reads it back. Sign-out removes it (`purgeAccount`). Every follow write also drops
  Following's saved first page, even if Following hasn't opened yet.
- **The 500 limit is checked here first**: at 500 a Follow toasts "e621 allows 500 follows" without a
  request. e621's own "over the limit" skip rolls back with the same words; "does not exist" says so.
- **Card pill**: For You (ranked), Results and Favorites cards; not Following, the artist page's cards
  or the signed-out Popular lists. Hidden for artists you follow, and until your list is read (no flash
  of Follow). Tapped, it wiggles into a ✓ of the same width (nothing beside it moves) that stays on that
  card while it's rendered, and unfollows on tap. UX's "small ✓" wins over DESIGN's "✓ Following" text
  on cards, for the no-reflow rule; the artist page uses the full tonal "✓ Following".
- **Player pill** sits after the artist and time, on chrome glass with no lip (DESIGN: no lip over art).
- **Interim artist page** gets the tonal Follow / ✓ Following button under the title until slice 6. At
  500 it's disabled with a note. Unfollowing is never blocked.
- **Signed out, or on someone's share link**, Follow opens Settings › Account; the tapped tag is followed
  after your own sign-in if that comes within 5 min (if the list can't be read then, a toast says to tap
  Follow again). A borrowed sign-in never reads or writes follows. While a remembered sign-in is still
  being checked, pills wait and the artist page's button shows its waiting state (not signed out).
- **Accessible names**: the pill is "Follow <artist>" with `aria-pressed` carrying the state; the artist
  page's button changes its label instead (no `aria-pressed`), and at 500 points to its note
  (`aria-describedby`).
- **Following after a follow or unfollow**: the saved first page goes, the anchor row is read again
  (`bg`), and a feed on show gets the "New posts" pill (never reordered in place). A first follow ever
  brings the feed in, with New starting at the new anchor's marker.
- **Not yet**: "Suggestions drop that artist" waits for suggestions (slice 6). The live
  `tag_subscriptions` POST check needs the owner's approval for a write to their account.

## 2026-11-25 — Feed components v6 (materials, sizes, voice, tab bar, goo)

- Owner on v5.3's feed: "Currently it feels very cheap and like it has not a lot of design care or personality
  in it". v6 (mocks/feed-v6.html, artifact https://claude.ai/artifact/41mUVNmCov6mLaFabE5AY8) was iterated by
  showing switches and locking each pick. Owner: "Yes, write it" (into DESIGN.md).
- **Voice face: Fredoka** (owner pick over the rounded system face), 600 / 500 only. Self-hosted. Replaces
  Nunito in the plan's dependency list.
- **Surfaces: "Flat + top light"** (owner pick over gradients): three materials (raised with a lip, panel,
  sunk wells), no hairline outlines.
- **Sizes:** heights 44 / 36 / 28, gaps 4 / 8 / 12 / 16 / 24, one 8 edge inside a panel, radii 24 with 16
  nested, 16 between posts. Owner approved after a last pass.
- **Post:** post number moves to the header line; heart at the right end of the footer with the score left of
  it; names and tags shown with spaces; video length chip allowed on the picture (with play and mute).
- **Play: bottom left**, soft shadow (owner: "Play to the left", "Play shadow: soft").
- **Tab bar:** one tube bent 10 px with a capsule that slides along the curve (owner: "Love the slight bend").
  It scrolls along its curve to a **secret fifth "Goo" tab** that adds ten to the goo count.
- **Goo:** favouriting drips white goo under the heart and builds it up on the tab bar; thick and slow, runs
  over the tabs with navy show-through, yellows as it grows (owner: "It feels runnier instead of thicker",
  "the more it grows the more off-white with a tinge of yellow"). Wipe clean is in Settings only; a secret
  clean button was proposed and dropped (owner: "we'll leave it in settings").
- **Avatars: "Bends"** for artists (owner pick); the kaleidoscope stays as the app mark.
- **Scroll physics: "Tuck"** (owner pick).
- **Dot burst lives on Follow only**, centred on the artist's mark and subtle (owner: "need to make sure
  burst is properly centered on icon, and make it a little more subtle"). Double tap shows a big heart only.
- Not redrawn in v6: artist page, player, Settings groups, sign-in sheet. DESIGN.md carries them over from
  v5.3 in v6 tokens; check each by eye when built. Open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md, .impeccable/design.json, the surface brief, docs/path-a/DESIGN.md, and the
  Play / avatar / double-tap lines in UX.md.

## 2026-11-25 — The other screens in v6 (mocks/screens-v6.html)

- Owner: "Yes, mock them" (artist page, grid view, Artists, Search, Tune, Settings, a Settings sub-page,
  sign-in sheet, player), then picked each open choice from a switch, and "Yes, write it" (into DESIGN.md).
  Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- **Artist stats: three wells** in one panel (owner pick over one line of text).
- **Grid tiles: score and favs under each tile** (owner pick over no numbers). Nothing sits on the picture
  except a video's play disc; the new dot hangs outside the corner.
- **Settings row icons: in round wells** (owner pick over bare icons). Sunk, not raised: the row is the
  button. Saved searches and "Your favorites" use the same wells.
- Owner asked for the welled items to be centred ("they look like they might be a little off"): stat wells
  got even padding, and a glyph in a round well sits 0.5 px below its box's centre (the rim shading makes
  the hole read lower). Owner: "Slideshow selection is a little cut off": the style row leaves room for the
  selected ring.
- Decided by the designer, shown to the owner in the mock's table, not objected to: no gold "Play all" on
  the artist page (one gold fill per screen; Play is the floating button); fields are sunk capsules (was 12
  radius); a search shown as text separates tags with a middle dot ("wolf · solo") while the field keeps
  e621 syntax; the goo row is a normal list row with a raised "Wipe clean"; the segmented control is a sunk
  track with a sliding capsule.
- Closed-system clean-up: the 32 gap, the 8 thumbnail radius and the 12 field radius are gone.
- Not drawn yet: landing, empty and error states (need the mascot), the player's sheets, filter menus,
  hold-a-tag targets, "Follow from favorites", desktop. Still open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md (the "carried over" section is replaced by real specs), .impeccable/design.json
  (Field, List Row, Segmented Control, Switch, Stat Wells), the surface brief, docs/path-a/DESIGN.md, UX.md
  (artist page note, dot-separated searches).

## 2026-11-25 — Slice R1 build (v6 feed chrome)

- Slice R split into R1 (feed chrome, mocks/feed-v6.html) and R2 (the other screens,
  mocks/screens-v6.html) after the second design merge (11cfef5). STATE.md has both scopes.
- **No rating badge yet**: DESIGN.md shows it only when a post's rating differs from the user's default,
  and there is no user default rating yet. Arrives with the rating setting.
- **Deferred to R2 or later**: the compact header bar and the Following tab badge (neither is in R1's list).
- **Goo is kept like signed-in data** (owner: "Clear on sign-out", 2026-11-25): `e6ss:v1:goo` is in
  localStorage only with Remember (a saved key), in this tab's sessionStorage otherwise, and signing out
  (not leaving a share link's sign-in) wipes it with the blade. Was a device count that survived sign-out.
- **Goo counts a post once per page session** (`addFav`): un-favouriting and favouriting again drips but
  adds nothing. A favourite e621 refuses keeps its goo (it's counted on the tap, so the drop can fall).
- **On desktop (900 px and up) the rail has no goo and no secret tab**: desktop isn't drawn yet (R2 shows
  it to the owner). Settings still counts favourites there.
- **Tuck** constants: the top edge is 48 px, the bar's top is 86 px above the bottom (from the mock).
- **JS budget**: the goo bar's drawing code and the drip and Follow burst load when the page is idle
  (`gooBar.ts`, `motionFx.ts`); the count is kept meanwhile and drawn when the code arrives. A tap on the
  secret tab before then still adds ten.
- Desktop Play sits bottom-left just past the rail (it was covering the rail at left 16).

## 2026-11-25 — Filter menus, player sheets and tag targets in v6 (mocks/screens-v6.html)

- Owner: "Yes, mock them" (the player's quick-settings and post-info sheets, the filter menus), picked
  "Sliding capsule" from a switch, and "Yes, write it" (into DESIGN.md).
  Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- **A one-of menu is a vertical segmented control** (owner pick over rows with a gold check): a sunk track
  of 44 rows; the chosen row rides a Raised Highlight capsule that slides to it. No check mark, no checkbox.
- Owner, on the Date menu: "should we consider aligning the border radius here? Should do another review
  pass?" The track is now 26 (its 22 capsule plus the 4 gap), and the rule is written down: outer radius =
  inner radius + gap. The review pass (two measuring scripts: nested corners, and left and right edges)
  also put every sheet's ✕ well on the 16 inset (it sat 6 outside; this moves the approved sign-in sheet's
  too) and gave the Reset chip's ✕ a normal gap.
- Owner, on the two approved parts the pass had left alone: "Maybe we fix those two things too".
  - **List rows:** whatever ends a row now stops 16 from the panel's edge, like the text's left edge (controls
    sat at 12, so a switch in a group's first row looked tucked into the corner but was not concentric). A
    chevron is pulled 5 and a ⋯ 10 so their ink sits on the same line; a group label's action ends there too.
  - **The artist mark in a post's corner: left as it is.** A 36 circle 8 inside a 24 corner is 0.8 px looser
    on the diagonal than at the sides. Making it exact means a 32 mark, or moving it 2 px off the picture's
    left edge; both cost more than they fix. The owner has been told and can ask for either.
- Decided by the designer, shown to the owner in the mock's table, not objected to: the Media menu is three
  switches (UX.md said checkboxes; v6 has none); sheets in the player are the app's navy Panel sheet, not
  glass; the tag menu in Post info is the hold-a-tag targets, never more than three (UX.md listed up to
  four; Mute stays in Tune); quick-settings rows sit straight on the sheet with no group around them.
- Decided by the designer and NOT yet shown to the owner (written as "spec, not in mock"): in Post info an
  "Artists" tag group appears only when a post has more than one artist tag; an artist tag's first target is
  "Open". Tag targets use the new-posts pill's shadow, so there are now four blurred shadows, not three.
- Not drawn yet: landing, empty and error states (need the mascot), the "From a link" chip, the hold menu on
  a grid tile, "Follow from favorites", desktop. Still open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md (Sheets with a title, Menu, Media menu, Player sheets, Tag targets; `menu`
  radius; list-row padding 8 / 16), .impeccable/design.json (Menu, Tag Targets; List Row), the surface brief,
  docs/path-a/DESIGN.md, UX.md ("as drawn" notes), STATE.md.

## 2026-11-25 — Slice R2a build (v6 lists, Search, Tune, Settings, grid)
- **R2 splits into R2a and R2b**, each a full slice (tests, code-review high + fresh reviewer, docs,
  budgets, commit). R2a: the shared parts (list group and row, icon well, field, segmented control,
  switch, stepper, slider, toggle), Settings home, Search and its suggestions, the Results header, Tune,
  the grid. R2b: the player chrome, Quick settings and Post info sheets, Menu (vertical segmented), the
  Media menu, titled sheets, the ⋯ sheet, tag targets, and the old `.segments` / `.sheet-panel` uses.
- **Artists, the artist hero and stats, the Settings sub-pages and the sign-in sheet stay with slices 5–7**,
  which build those screens for real; they use the v6 parts from R2a rather than restyling interim pages
  that get replaced. The Follow button on the interim artist page got the v6 shape now (one wide tonal
  button, a constant name with `aria-pressed`).
- `Seg` and `Stepper` are built and styled in R2a but have no callers until R2b (Menu, Quick settings) and
  slice 6 (Settings › Slideshow).
- **Search keeps a compact gold Search button**, shown beside the field only once there is text (the mock
  has none; Enter alone is hard to find on desktop and with some phone keyboards).
- **A saved search's trailing button is a Trash delete, not ⋯**: it is the row's only action. When the ⋯
  sheet lands (R2b) it can move there if a second action appears. A search named after its tags shows them
  once (as the name); the line under it carries only the sort and "Dated", or nothing.
- **Tune**: the title is "Tune" (the lede says what it tunes). A tag row's line keeps "· weight 1.2" after
  the favourite count (spec: count only): the weight is what orders the list and dims the cut-off, and a
  pinned tag with no favourites has nothing else to show. The Breadth card's value stays "N tags" (spec: a
  named step) because breadth is a number of tags, not a set of named levels.
- **Grid**: 8 between columns, 12 between rows, a 4 + 18 foot under each square for score and favourites.
  The caught-up moment in the grid is still the divider position the screen draws; a full-width row of its
  own (DESIGN.md "Grid view") waits for slice 5 with the rest of Following's grid.
- The app version in Settings comes from package.json through `next.config.ts` `env` (inlined at build).
- **First-load split** (budget): `SearchForm` (src/screens/SearchForm.tsx) and `TagText`
  (src/components/TagText.tsx) are their own modules, and the Settings home (src/screens/SettingsHome.tsx)
  is a lazy chunk prefetched at idle. Rule going forward: the feed screens module is in the first load
  (Following imports it), so it imports only small, single-purpose modules.

## 2026-11-25 — Slice R2b build (player, sheets, menus, tag targets)
- **The filter menus are their own lazy chunk** (src/feed/FilterSheets.tsx), prefetched at idle with the
  screens; Chips only imports their types. A failed download closes the sheet with a toast and retries on
  the next tap.
- **Menus** (Sort, Date, Score, Quality): tapping a row applies it and closes the sheet; only Custom…
  needs Apply. Arrow keys move focus only, since choosing a row closes the sheet. Score's first row is
  "Any". Date's Custom… adds "Last N days / weeks / months / years" (years too: e621 takes it).
- **Media stays three switches with Done** (one reload for any mix); Done says "Pick at least one" when
  all are off.
- **Quick settings**: Fit shows only for Classic (the other styles fill the screen themselves); Quality
  is a row that opens a Quality menu over the sheet; the style previews are drawn in CSS (no posts).
- **Share links: per-visit playback.** On a link the link's playback plays; Quick settings changes "This
  visit only" (default) or also "Save as default". Visit changes live in memory by the link screen's
  history key (src/player/visit.ts) and end with the page.
- **Tag targets**: up to three raised capsules 8 above the held tag (below when there's no room), kept 8
  inside the screen, no dim behind them. An artist's tag gets Open, Search, Blacklist; For You (signed in,
  your own account) pins instead of searching; Post info in For You offers Search and Pin both.
- **Post info**: the artist is the head (tap opens their page); an Artists group only when a post credits
  more than one artist (warning tags such as `conditional_dnp` don't count). Blacklisting a single artist
  is in the card's ⋯ ("Blacklist this artist"), not Post info.
- **The ⋯ sheet** has a context line (avatar, artist, #id) instead of a title row and no ✕; dim, Esc,
  Back and swipe close it.

## 2026-11-25 — Goo the mascot; landing, empty, error and offline states in v6 (mocks/screens-v6.html)

- Owner: "Yes, draw them" (the signed-out landing, empty and error states, which needed a mascot that did
  not exist). Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- **The mascot is Goo**, a drop of the tab bar's goo with a face. Owner, from three candidates (Goo, a pup,
  a flower): "Goo, but I'd like to take a couple rounds at refining it further". The pup and the flower are
  dropped.
- Round 1 (switches: shape Drop / Wisp / Blob; face Sweet / :3 / Big eyes; finish Flat / Shaded), owner:
  ":3" and "flat", then "I think I desire it to look maybe more
  goo-drop like? And the part that's under it looks more like snow than goo". Goo was rebuilt from plain
  shapes under the app's own blur-and-threshold filter, so body, spill and arm are one liquid; the spill
  became thin, with a lobe and a stray drop.
- Round 2 (switches: shape Dewdrop / Dollop / Pinch; base Splat / Small / None), owner: "Dewdrop, Small".
  Then "Yes, write it".
- Four moods are the whole vocabulary: wave (hello, sign in), snooze (nothing yet, waiting), look (nothing
  found), oops (something failed).
- Decided by the designer, shown to the owner in the mock's table, not objected to:
  - On the landing "Sign in with e621" is the one gold fill; Play hides until the card has scrolled away.
  - Empty states sit on the ground; errors sit in a panel where the first post would be.
  - The offline banner is a sunk capsule, not a button.
  - The end of a feed reuses the caught-up moment with the app's mark; no typed "✿".
  - The landing's one UX.md sentence is split into a headline and a sentence. With filters on, the empty
    state says "No posts match" and counts the filters, in place of "Filters are on".
- Decided by the designer and NOT yet shown to the owner as a decision:
  - Goo has a pale blue underside (#9FB3CC, "Goo Shade") that does not close when pressed.
    DESIGN.md calls it thickness, not a lip, and says so under "The Lip Is a Promise". It is in every
    drawing the owner approved, but the exception was never pointed out.
  - Goo never appears under 72, and only on the landing, needs sign-in, empty states and errors.
  - The sentences for Artists and Favorites signed out, and the action for "No posts match" with no filter
    on ("Edit search"), are proposed in DESIGN.md and marked there as not drawn.
  - While writing this up, the gap between e621's message and "Try again" in the error panel went from 20
    to 16, to sit on the spacing scale. The mock was rebuilt with it.
- Owner, after the write-up: "Tapping the goo should make him spurt between 1-3 drops on the bar". Drawn in the
  mock and written into DESIGN.md: Goo squashes under the finger, springs back, and 1 to 3 drops leave its tip
  for the tab bar. Decided by the designer around that ask, shown in the mock's table, not yet answered:
  - Each drop that lands is one more on the goo count, like a drop from the secret Goo tab (so Settings'
    "N favorites" counts them). They land on the goo already on the bar, or 90% along a clean one.
  - Signed out the bar is clean, so the landing's bar gets goo only from Goo.
  - Goo is pointer-only (not focusable, no label). With reduced motion the drops are added in place.
  - With no tab bar on screen the drops land beside Goo and soak away.
  - In the mock the goo engine is patched at build time (a bar can keep its own count); feed-v6.html is untouched.
- Not drawn: Popular today under For You's signed-out block (UX.md has it); the first run after sign-in
  (the "Finding artists you love" loader and "Follow from favorites"); the "From a link" chip; the hold
  menu on a grid tile; desktop. Still open: whether un-favouriting removes goo.
- Updated to match: DESIGN.md (Goo the mascot; States; Quiet button; the end of a feed; Goo Shade; One Gold
  and Lip rules; motion rows; build ruling 10), .impeccable/design.json (Goo, State, Error Panel, Landing
  Card, Offline Banner), the surface brief, docs/path-a/DESIGN.md, UX.md ("as drawn" notes), STATE.md.
## 2026-11-26 — Slice R3 build (Goo the mascot; landing, empty, error, offline)
- **Goo is one inline SVG** (src/components/Goo.tsx) with the shared blur 2.4 / alpha ×22 −9 filter; each
  instance has its own filter id (`useId`), since two Goos can share a screen. Pointer-only, `aria-hidden`.
- **Tapping Goo counts toward the goo** (and so the "N favorites" line): 1–3 drops are added up front and
  each landing draws one more; with reduced motion they're added in place; with no bar in sight they fall
  beside Goo and nothing is counted. **Show the owner.**
- **Try now really is now**: it lifts the request lane's back-off once (`skipBackOff`), keeping the 550 ms
  gap. The automatic retry still waits the full 5 s. Each tap is one request, so a stuck 429 can't be
  hammered faster than the person taps.
- **Wrong sign-in** reads "e621 didn't accept your sign-in" / "Check your username and API key in
  Settings › Account." in the same Oops panel, with what e621 said in the capsule.
- **Copy proposed here (show the owner):** "You don't follow anyone yet" / "Tap Follow on an artist, and
  their new posts show up here first."; "No favorites yet" / "Tap the heart on a post and it shows up
  here."; "Nothing new for you" / "Nothing in this date window yet. A wider Date finds more."; "No posts
  by X" / "e621 has no posts under this name yet."; "Nothing popular right now" / "Popular fills up
  through the day. Check back soon."; "For You needs a little more"; the Favorites signed-out sentence.
- **Empty means empty**: when the blacklist or sign-in took what was there, the state counts it ("No posts
  match") instead of saying nothing exists; Reset filters shows only when a filter is on.
- **Play waits on signed-out For You too** (under the sign-in block, like the landing card), and Popular
  under it has Follow pills (signed out they open sign-in).
- **Artists signed out** waits for slice 5: the Artists tab is still the "Soon" placeholder.
- **First load:** the parts every feed screen shares live in `screens/feedParts.tsx`, so Results,
  Favorites and the artist page are finally out of the first load. The error and slow-down panels are a
  lazy chunk prefetched at idle; if it can't download (offline), a plain panel says the same thing with
  its way out. The offline banner stays in the first load (offline, nothing more can download). The
  placeholder and Not found screens are lazy; pull to refresh loads only on the signed-in Following feed.

## 2026-11-26 — First run after sign-in in v6 (mocks/screens-v6.html)

- Owner: "Yes" (draw the first run after sign-in: the "Finding artists you love" loader and "Follow from
  favorites"). Artifact: https://claude.ai/artifact/WpoUngWRfjhDHcdGScuup1.
- Two switches (loader Goo / Ring; pick with Check / Switch). Owner: "Good, check. Sounds good otherwise".
  Read as Goo and Check: "Good" taken as "Goo", the first of the two answers offered ("Goo, Check"). The
  owner has been told how it was read. The ring loader and a switch on every row are dropped.
- **Goo has a fifth mood, busy** (it looks about while three dots take turns), used for the first read of
  your favorites. The 2026-11-25 entry said four moods were the whole vocabulary; it is five now.
- **The app's one checkbox is the check well:** a 28 well that turns Score Green with a navy check. The
  whole row is the target.
- Decided by the designer, shown in the mock's table, covered by "Sounds good otherwise":
  - The checklist has three steps, wording proposed: Read your favorites, Count your artists, See who
    still posts.
  - "Follow N artists" is one gold button that floats where Play stands, 16 above the tab bar, with Play's
    shadow. With nothing picked, or past e621's 500 follows, it is disabled and says why. A disabled
    button is Panel fill, muted label, no lip.
  - "Skip for now" is a quiet button in the title row (UX.md had it under the button).
  - After skipping, the banner is a pressable list row in a panel, worded "Follow from your favorites" /
    "30 artists you favorite a lot" (UX.md: "Follow artists from your favorites ›", which did not fit).
  - If the read fails: the error panel, "Couldn't read your favorites", Try again, Skip for now.
  - No favorites at all: Goo looking, "Find artists to follow", a tonal Search.
- Fixed while writing up: two gaps were off the spacing scale (20 under the sentence, now 16; the button
  17 above the bar, now 16).
- Not drawn: Follow from favorites as a sheet from Artists › Suggested, the "2 skipped" toast, the
  "Popular artists" list, the "From a link" chip, the hold menu on a grid tile, desktop.
- Updated to match: DESIGN.md ("First run after sign-in"; Goo's busy mood; Disabled button; motion rows),
  .impeccable/design.json (Checklist, Pick Row, Disabled Button; Goo with five moods), the surface brief,
  docs/path-a/DESIGN.md, UX.md ("as drawn" notes), STATE.md.

## 2026-11-26 — Slice 5 build (Artists tab, artist score, first run after sign-in)

Built overnight without the owner; every item below is on MORNING.md to approve or change.

- **Two passes, kept an hour per user in memory** (state/artists.ts). The first pass ranks every artist
  tag with 3+ favorites by `affinity × (0.5 + learned)`; the top 32 (24 in ENGINEERING.md; 32 fills four
  batches of 8) get their newest posts in 4 batched `~a … order:id_desc` searches of 320, plus up to 8
  single `limit=3` looks at `bg` for those a prolific neighbour crowded out. Then recency, then show.
  The looked-up set is kept for the hour, so a later learned fit doesn't reorder a list being read.
- **It waits for two things before ranking:** the tag counts (a first read gets the profile before the
  counts, and ranking then would favour artists with unknown counts) and the follow list (a list cut before
  it loads would offer artists you already follow).
- **`all` beside `list`:** Suggested keeps a card you just followed in place, showing ✓ Following, until
  you leave the tab; the first run and the Follow-from-favorites list only ever show unfollowed artists.
- **Follow from favorites is one `followMany` POST** (follows.ts): optimistic, rolled back on failure, the
  limit checked before sending, "already followed" counted as followed, aliases kept under the asked name.
- **The first run is its own chunk**, loaded only when you follow no one; offline it falls back to the
  plain "You don't follow anyone yet" state and Popular today. Skip is kept with `writeAccount` (Remember
  on: on disk; off: this tab), and sign-out purges it.
- **Artists › Following** reads one page of `search:subscriptions` (320) when the tab opens, kept 10 min
  (state/artistList.ts, memory only). New is Following's threshold; opening Artists first reads it.
  The dot clears when you open the artist's page from the row.
- **Hidden suggestions** are stored like Tune's overrides (`hiddenArtists:<user>`, plain write).
- **follows.ensure re-entrancy fix:** it now sets "loading" after it records the request. Before, a
  listener that called `ensure()` again on that change started a second read, endlessly (found when
  the artists store began asking for the follow list).
- **The backtest:** `scripts/rec-backtest.ts --artists` (live, read-only, needs an account: on MORNING
  "Needs you") and a synthetic run in the unit tests. Synthetic: 115 hidden favorites; the score's top 10
  holds 49, the raw favorite count's 50. Even, as expected: hidden favorites follow volume, and the score
  deliberately trades volume for share of an artist's work.
- **Budget:** first load 197.1 KB (R3 194.5); the first run and Artists are lazy.

## 2026-11-26 (night) — Overnight proposals, batch 1: toasts and the Artists tab

- No owner decision in this entry. Everything here is **proposed, not owner-approved**.
- How it started: the owner answered "Yes" to drawing the three leftover first-run pieces (the list as a
  sheet, the "2 skipped" toast, Popular artists). They were published with two switches (Undo timer: Ring /
  None; toast width: Hug / Full) and the owner had not picked when a message arrived from the session "App
  architecture and feature roadmap" saying the owner had gone to bed and wanted the design work to go on
  without waiting, each batch marked proposed, committed to this branch, and sent to the builder. That
  message is a relayed instruction, not the owner's own words in this session.
- Working picks, for the owner to confirm: Ring and Hug.
- Proposed in this batch (DESIGN.md "Toast" and "Artists: Suggested, the sheet, the row menus, Popular
  artists"; mocks/screens-v6.html "Artists, toasts and Popular artists"):
  - The toast component for the whole app (it had never been drawn): floating Raised Highlight capsule, a
    28 mark, callout message, a sunk Undo with a 6 s ring. 4 s for a toast without Undo is new.
  - Artists › Suggested as a screen, its two states, and a ⋯ on the suggestion card (Suggested only).
  - Follow from favorites as a tall sheet with the gold button at its foot.
  - The row ⋯ on Following (Share artist, Open on e621, Unfollow not red), Sort, the filter.
  - Popular artists under "Find artists to follow".
- The full list for the owner, with the alternatives: docs/path-a/MORNING-DESIGN.md.

## 2026-11-26 (night) — Overnight proposals, batch 2: links, the grid menu, the artist page's edges

- No owner decision in this entry. **Proposed, not owner-approved.**
- DESIGN.md "Links, the grid tile's menu, the artist page's edges"; mocks/screens-v6.html "Links, the grid
  menu and the artist page's edges".
- Choices: the "From a link" chip is an on chip (gold ring) that opens a sheet of name / value rows and a
  tonal "Use my settings"; the not-signed-in notice is the sunk banner at two lines on Results and the
  player's glass over the player; holding a tile opens the app's ⋯ sheet (no new menu); a non-artist tag
  keeps the hero with a tag glyph in the well; ⋯ on the artist page gains "Copy link".
- Copy written here: "This link came with its own settings.", "For this visit only. Nothing of yours is
  changed.", "Use my settings", "Not signed in on this browser" / "Your blacklist isn't applied",
  No artist called "X" / "e621 has no tag with this name. Check the spelling, or search for it.",
  "Follow tag", "Unfollow an artist in Artists to follow another.", "Link copied", "Unfavorite".

## 2026-11-26 (night) — Overnight proposals, batch 3: Settings sub-pages

- No owner decision in this entry. **Proposed, not owner-approved.**
- DESIGN.md "Settings: Account, Content, For You, App"; mocks/screens-v6.html, the section of that name.
- Choices: Sign out is a tonal button at the end of Account, not red; the share-sign-in switch is named
  "Sign-in links" with its warning always visible; ratings are three switches wearing e621's letters and
  the last one cannot be turned off; the blacklist is a field plus rows, one per line, each removable;
  Hidden artists rows end in "Show"; Install is a row that opens the steps.
- Added beyond UX.md (drop on the owner's word): an "API key · Change" row on Account; "What's new" and
  "Source code" rows and the line "Not run by e621…" on App.
- Corrected from batch 1: the Follow pill in Popular artists stops 16 from the panel's edge like every
  row end (it was drawn at 12). The reason Unfollow is not red is that Danger stays for Blacklist and
  failures, not that it can be undone (Blacklist can be undone too).

## 2026-11-26 (night) — Overnight proposals, batch 4: install, update, the app icon

- No owner decision in this entry. **Proposed, not owner-approved.**
- DESIGN.md "Install, update and the app icon"; mocks/screens-v6.html, the section of that name.
- Choices: iPhone gets a titled sheet with three numbered steps; where the browser can install by itself
  the row ends in "Install" and there is no sheet; nothing asks you to install unprompted; the update
  toast lasts 6 s like every action toast and then lives on Settings › App's Version row; the icon is the
  app mark on a Panel Navy to Ground gradient, one drawing for every mask; the short name is "Slideshow".
- Decided by rules already approved, not by me: the kaleidoscope is the app mark and Goo is never the icon.
- Added beyond UX.md (drop on the owner's word): the "Updated to 2.1" toast; the sheet for in-app browsers.
- Drawn but NOT to be built without the owner's yes: the one-time "Install the app" row on Settings.
- Not checked on a device: where Share sits in the owner's Safari (the "under •••" hint).

## 2026-11-26 (night) — Overnight proposals, batch 5: on a computer

- No owner decision in this entry. **Proposed, not owner-approved.**
- DESIGN.md "On a computer (900 px and wider)"; mocks/screens-v6.html, the section of that name.
- Choices: the sidebar is a floating 232 panel with names and the tab bar's sliding capsule (68 with
  icons only from 900 to 1099); Search is a field in the sidebar and leaves the header; Play keeps its
  disc at the content's bottom left; a sheet opened from a thing on screen is a 300 popover, a titled
  sheet with a job of its own is a 420 dialog; a tile's menu is right-click, never a hover button;
  Post info is a 360 panel and the picture moves over; Settings is one page; two hover rules.
- Added beyond UX.md: the feed's cap on tall pictures (the window less 160); the full-screen button's
  place; the two hover rules.
- Not designed, left for the owner: the goo and the secret tab on a computer.

## 2026-11-26 (night) — Slice 6 build: the artist page

- No owner decision in this entry. Built from DESIGN.md "Artist page" (approved) and the proposed "artist
  page's edges" (batch 2).
- The artist route takes the chips as params (`/artist/x?…`, Favorites' filter params), so a reload and a
  pasted link keep them.
- The name in the URL is folded to e621's form (lower case, `_` for spaces) before anything uses it.
- The tag lookup asks for empty tags too, so "No artist called x" means e621 has no such tag.
- "last post" is its own one-post search (newest first, bg lane), not the feed's first page, so the chips
  don't change it.
- "you faved" reads the For You profile when it's there; the page doesn't read favorites for it.
- Chips: Results' five. The mock's row shows "New" where UX.md has Sort; UX.md wins.


## 2026-11-26 (night) — Slice 7 build: Settings' pages and the sign-in sheet

- No owner decision in this entry. Built from UX.md "Settings" and "Sign-in sheet", DESIGN.md "Sign-in
  sheet" (approved) and the proposed "Settings: Account, Content, For You, App" (batch 3).
- Sign-in is a sheet (`sign-in`) over whatever asked, not a screen: a signed-out Follow, heart or
  Settings opens it, and the Follow you tapped goes through once you're in. Closing it without signing in
  drops that Follow.
- The old one-page app moved from `/settings/account` to `/settings/classic`, reached from Settings › App ›
  "Classic slideshow", until its 66 e2e flows are ported. Account is now the new page.
- Remember starts on (as drawn); changing the key of a session kept without Remember starts from off.
- Content's "Your e621 blacklist" is a Sync button, not the mock's "Use my e621 blacklist" switch: the
  app already merges e621's list at every sign-in, so a switch would have nothing to turn off.
- "Your favorites" shows a count only once your favorites have been read (by For You or Artists); e621's
  /users/me has no favorite count.
- Slideshow's choices (Transition, Quality, Longest video, Load ahead) open a titled sheet with a Menu;
  Fit and Transition show only for Classic, as in Quick settings.
- Not built: "What's new" (no changelog to show yet); the one-time "Install the app" row (batch 4, held
  for the owner's yes).

## 2026-11-26 (night) — Slice 8 build: the installed app

- No owner decision in this entry. Built from ENGINEERING.md §7 and §9 and the proposed DESIGN.md
  "Install, update and the app icon" (batch 4).
- **The app mark now follows DESIGN.md everywhere:** 8-fold, mirrored, three rings, e621's gold, cream
  and link blues, one seed (`APP_MARK_PARAMS` in src/lib/avatar.ts). Before, Settings and the caught-up
  divider drew two different random kaleidoscopes. The icons are drawn from it by
  `scripts/make-icons.ts` (Playwright renders the SVG), so the icon and the in-app mark are one drawing.
- One 512 file serves "any" and "maskable" (the mark and glow stay inside the 80% circle, as designed);
  `mono-512.png` is Android's themed icon. The tab icon is 32/16 with 22% corners. Next's default
  `favicon.ico` is gone.
- `theme-color` is Ground (#020F23), as designed, not the old black.
- **CSP without nonces:** `script-src 'self' 'unsafe-inline'`. Nonces would make every page dynamic, and
  the protection that matters, `connect-src 'self' https://e621.net`, holds either way: an injected
  script can't send the key anywhere but e621.
- **The worker registers only in production builds** (dev serves changing chunks under one name).
  Navigations are network-first with a 3 s timeout, falling back to the last good shell; every route
  serves the same shell, so one cached copy opens any route offline.
- The build id is `VERCEL_GIT_COMMIT_SHA`, or the version plus build time elsewhere, so every deploy is
  a new worker. "Updated to x" shows after a Reload into a new build.
- **Settings › App's update row** reads "A new version is ready" with Reload. The design's "2.1 is ready"
  needs the new version's number, which the old page doesn't know.
- The browser's own install offer is held back (`beforeinstallprompt` is kept), so Settings › App's row
  is the only way in, as designed. Not built: the one-time "Install the app" row on Settings (held for
  the owner's yes).
- The install sheet reuses the sign-in sheet's numbered steps (the same 28 number wells).
- Found while testing: a skipped View Transition left an unhandled `ready` rejection (the dev "1 Issue"
  badge). Caught in src/nav/transition.ts.
- **What the CSP does and doesn't stop** (fresh reviewer): with `'unsafe-inline'` scripts it blocks
  fetch, XHR, WebSocket and beacon to anywhere but e621, and images or media from other hosts; it does
  not stop an injected script from navigating the page away with the key in the URL. Nonces would close
  that only for injected `<script>` tags, not for code already running. The real guard stays: no
  third-party scripts at all.
- The install offer is caught by a tiny inline script in `<head>` (it can fire before the app's code
  loads); the worker registers once the page is idle, off the first load.
- The build id is the commit (Vercel's or git's), plus a hash of the diff for an uncommitted local build.

## 2026-11-26 — Slice 9a (toast restyle, overnight)

- Toasts follow the proposed batch 1 "Toast": a capsule, always a 28 mark (the artist's mark for one
  artist, an icon otherwise, an info mark when none), at most one way back, one at a time, 4 s or 6 s
  with an action. Undo wears a ring that drains over the 6 s (paused on hover, as sonner's timer is).
- Placement: 12 above Play when Play shows, else just above the tab bar.
- Failures (anything that says it couldn't) use the danger mark.
- The Following suggestion card (UX.md) is **not built**: the first run and Artists › Suggested cover the
  same need. MORNING Decide 3.
- Dead `PlaceholderScreen`/`Soon` removed; the Settings tab renders Settings home directly.

## 2026-11-26 — Slice 9b (on a computer, overnight)

- Built from DESIGN.md "On a computer (900 px and wider)" (proposed, batch 5): the floating sidebar (232
  with names from 1100 px, 68 with icons and tooltips from 900), the tab bar's sliding capsule, Following's
  count badge (hidden while Following is current), Search with the "/" key, the account at the bottom;
  the 600 column, the grid at full width (columns at 176 or wider), Play beside the column, toasts centred
  on the column 24 from the bottom, tall pictures capped at the window less 160, Settings on one page with
  Sign out on the account row, the player's one-row controls and Post info as a 360 panel.
- The sidebar is its own chunk: a phone never loads it (the old rail's code left the first load).
- **Every sheet is a 420 dialog on a computer.** Popovers (a sheet opened from a chip, ⋯, tile or tag,
  shown at that thing) are not built: they need each opener's position. MORNING Decide.
- **Not built, as the design says:** the goo and the secret tab on a computer (the sidebar is drawn
  clean, so the goo isn't shown there at all).
- The account row opens Settings (Account is its first section on one page). `/settings/account` and the
  other sub-page URLs still open the single sub-page on a computer.
- Settings › Goo's row isn't on the one page (the goo isn't on a computer).

## 2026-11-26 — Phase 7 (final review)

- **The storage rule now covers every per-account record.** For You's favorites profile, the learned
  weights, feed scroll anchors and the goo are kept only with Remember (sessionStorage otherwise),
  never written from a link's tab, and cleared on sign-out. Tune's pins and mutes and hidden suggestions
  stay device-wide (MORNING Decide 5).
- **A refused saved key is dropped**, not kept and resent: e621 answers a bad key with 401 even where
  none is needed. The username stays in the sign-in sheet for this tab.
- **A key that couldn't be checked is checked again** on `online` and when the tab is shown again.
- **A sheet over the player stays open when the player moves to another post**; closing it lands on that
  post (history.ts carries the route down).

## 2026-11-26 (morning) — the owner's notes on the morning list

- **Approved:** MORNING "Approve" 1–15, so the work built from the proposed design batches 1–5 as listed
  there stands. The "Decide" items weren't answered: their defaults stay.
- **A grid tile opens the feed at that post** (owner's idea), not the player. The screen's grid switch
  reaches the feed through a `GridSet` context; the feed scrolls the post 12 below the top once it has
  its own column width. "Play from here" stays in the tile's menu.
- **No wash on Follow from favorites' rows** (owner's screenshot): rows with no side padding don't wash,
  as in every sheet; the empty check well lifts under the pointer.
- **"Back reloads the picture"** was ← in the slideshow. The stages faded or slid out `trail[0]`, which is
  the post you left only going forward; going back it's the one before the post you return to. The player
  now passes the post it left (`leaving`) and the direction (`back`); Classic, Ken Burns and Reflections
  use it, and Reflections slides the other way going back. The old one-page app still uses `trail[0]`.

## 2026-11-26 — Toast: the ring and the width picked

- Owner, after seeing the four mixes side by side again: "Ring, hug".
- Locked: a ring around Undo that empties in the 6 s the toast stays; the toast hugs its words, centred.
- Dropped: no ring; a toast that spans the screen. The switches are out of the mock.
- Not covered by this pick, still proposed: the rest of the Toast section (4 s without Undo, the
  two-line skipped toast, the copy).
- Same message, a new request: "we may want to do a pass at potential hover state as the spacing looks
  not ideal", with a picture of the built tools capsule where the highlight touches the capsule's edge.

## 2026-11-26 — Top bar and hover picked; one head; chip dropdowns asked

- Owner's words: "1. Capsule 2. Lift", then "we should aim to keep the area above the grid/scroll views
  consistently sized" and "Should we consider a dropdown menu instead of a popup? the arrow makes me
  think that it'll pop down instead of a new popup".
- **Locked: the top bar is a floating capsule** on a phone and on a computer. The edge-to-edge glass
  band is dropped. The Shelf option is dropped.
- **Locked: a button with a lip rises 1 px under the pointer.** Lighten and Both are dropped.
- **The owner's rule, written into DESIGN.md:** on a computer the head stays in the 600 column in feed
  view and in grid view. My first desktop drawing stretched the head with the grid; that was my
  mistake, and the builder built it as drawn.
- **Still proposed, not owner-approved:** the rest of the hover pass (washes, the one-step-lighter
  rule, glass), the wash shape for rows that sit straight on a sheet, the grid loading skeleton, the
  chip dropdown on a computer, and the chip dropdown on a phone (the sheet is what is approved).
- The square hover block on the "Follow from favorites" list was my drawing's fault, not the
  builder's: those rows had no side padding, so the wash had no room for a rounded shape.
- Not done: Date and Score as dropdowns are not drawn. `.impeccable/design.json` has only the motion
  entry renamed by hand; the script that regenerates it was lost and it was not rebuilt.

## 2026-11-26 — Chips open a dropdown, on a phone too

- I asked: "On a phone, should a chip open the dropdown (my pick) or keep the sheet". Owner's word:
  "Dropdown".
- **Locked: a chip with an arrow drops its panel under itself, on a phone and on a computer.** The
  titled sheet for a chip is dropped (Sort, Media, Date, Score, the Artists sort, "From a link").
- Follows from it, decided by me and shown to the owner: no title, no close button, no Done; Custom's
  "Apply" is tonal instead of gold, because Play is still on screen under a dropdown and the screen
  keeps one gold fill.
- Not changed: sheets that a chip does not open (Quick settings, Post info, the ⋯ sheets, Follow from
  favorites, sign-in).


## 2026-11-26 — Building the owner's picks (dropdowns, one head, Lift, Capsule, toast)

- **Dropdown:** `src/shell/Dropdown.tsx`, still a history entry (`openSheet`), so Back, Esc and a tap
  outside close it the same way. It hangs under the chip's `data-menu`, measured at open and once more a
  frame later (the scroll lock can drop the scrollbar and move the chip). Media applies what changed on
  any of the three; a late apply after Back checks the live entry (`openSheetName()`) so it never goes
  back a second time. The last Media switch that's on is disabled, with a hidden hint for screen readers.
- **Capsule:** `src/shell/TitleRow.tsx`. The capsule is the title row itself, not a copy (no button
  twice, no duplicated test ids); the row keeps its 52 in the page. The artist page's bar stays its own
  element (its contents differ) with the same look. Settings on a phone has no screen context, so the
  hook treats a missing one as shown.
- **One head:** CSS only: in grid view on a computer every child of the frame but the tiles and the
  overlays keeps the 600 column (the chips keep their bleed to its sides).
- **Lift** replaces the tonal button's lighter hover. Raised-without-lip hovers that were already built
  (chips that are off, round Back) are left as they were; the rest of the proposed hover table isn't built.
- **Toast "Ring, hug":** already built in slice 9a; checked at 375 and 1280, no change.
- **The tools hover wash, 40 by 36** (proposed, not picked) is built because it fixes the owner's own
  screenshot; MORNING asks.
- **Budget:** these pushed the first load to 200.2 KB. Following's ⋯ menu and its "Mark all as seen"
  check moved to their own chunk (`FollowingSheets.tsx`): 199.9 KB.

## 2026-11-26 — ← in Vintage Prints (and Collage)

- Owner: "Still noticing the backwards nav issue in the vintage prints slideshow."
- **Cause:** Prints keyed its scene layers by post id. ← to the post still fading out gave the new
  scene the old layer's key, so React kept that layer; its picture had loaded already and never said
  ready again, so the show sat on the post you left. Collage had the same trap: ← to a post that is
  still a tile reuses that tile.
- **Fix:** Prints keys scenes by a counter. Media: a still that becomes the slide with its picture
  already loaded says ready two frames on (so its layer is painted hidden first and the fade still runs).
  Now ← looks like →: the post you left fades to black, the earlier one fades up.

## 2026-11-26 — "+N" on a post's tags

- Owner: "clicking this doesn't expand it out" (the "+29"). It was a label, never a control.
- **Now a button:** it shows the rest of the tags in the same row (the row scrolls sideways) and gives
  focus to the first new tag. Not a second line: every card's height is measured up front for the
  windowed feed, so a taller card would move everything under it.
- Budget: the tag targets (shown when a tag is held) moved to their own chunk, fetched on the first hold
  and at idle with the screens.

## 2026-11-26 — The rest of the hover pass and the grid loading skeleton approved

- I asked: "Approve the rest of the hover pass and the grid loading skeleton?" Owner's words:
  "Approve both".
- **Approved: the whole "Under the pointer" table in DESIGN.md.** Lift was already picked. Now also:
  one step lighter for raised things with no lip; the 6% wash for icons, words and wells; the 40 by 36
  wash in the tools capsule (4 to the capsule on every side); the 4% wash for rows, 8 wider with a 16
  radius on a row that sits straight on a sheet; white words with no wash for one-of-several; the
  glass rim from 16% to 32%; nothing on pictures.
- **Approved: the grid loading skeleton.** Twelve skeleton tiles on a phone's first load (three full
  rows on a computer), one row of them when loading more.
- Not covered by this approval, still proposed: my drawing of the one-head rule (the rule itself is
  the owner's), and the other sections headed *Proposed* in DESIGN.md.
- Not verified: the lift is 1 px and hard to see in a still picture; live hover was tested by script
  on the tools capsule only.

## 2026-11-26 — Row hover opened again

- Owner, right after "Approve both", with a picture of the approved sheet rows: "Actually, should we
  give the rows hover a pass?"
- What the picture shows: the rounded wash is as tall as the row, so its corners sit on the line
  between rows, and two washes next to each other touch.
- Drawn behind a switch in the mock ("Under the pointer", top of the section), for rows on a sheet,
  in a panel and in a well:
  - **Inset** (my pick): the wash floats 4 inside the row, rounded to follow its container (20 in a
    panel, 12 in a well, 16 and 8 wider than the words on a sheet); the lines above and below it fade.
  - **Band**: straight edges, to the container's edges; on a sheet it reaches the sheet's edges. Lines
    stay.
  - **Quiet**: no wash; the chevron turns white and moves 2, the check well gets a rim, a menu row's
    icon turns white.
- Owner's pick: "Inset, just gotta make sure the corner radius matches the outer container as well".
- **Locked: Inset**, for the pointer and for a press. Band and Quiet are dropped; the switch is out of
  the mock.
- **Locked, the owner's rule: the wash's corner radius is the container's radius less the gap between
  them.** Measured by script on every row in the mock: 20 in a panel (24 − 4), 12 in a well (16 − 4),
  16 on a sheet or a dropdown (24 − 8).
- Fixed to follow that rule: the sidebar's account row was 16 and is now 12 (24 − 12); the specimen
  sheet in the mock was drawn with a 16 radius and is now the real sheet's 24.
- Found while measuring, my mistake: the search suggestions group shared a class name with the
  Artists tab's suggestion cards, so since that batch it was drawn with 16 of extra side padding and
  16 gaps between rows. It is a flat group of 48 rows again, as DESIGN.md says.
- The wash is 5% white (it was 4%); this is what the owner saw when picking.
- Not verified: live hover was tested by script on one Settings row only.

## 2026-11-26 — The one-head drawing approved

- I asked: "do you approve that drawing", after saying that on Following's grid the left-aligned
  title in the centred column does not line up with the full-width tiles. Owner's word: "Approve".
- **Approved: the drawing of the owner's one-head rule.** On a computer the head stays in the 600
  column in feed view and in grid view; only the tiles use the full width, 24 at each side.
- Accepted with it: in grid view the head's left edge and the tiles' left edge do not line up.
- With this, everything in DESIGN.md's "The top bar, the pointer, grid loading, one head, chip
  dropdowns" is owner-picked or owner-approved. The chip dropdown's measurements are still mine.


## 2026-11-26 — Building the hover pass, the Inset rows, grid loading and the suggestions check

- Built from the design session's 78f134c and 10d2cff (owner: "Approve both", "Inset, just gotta make
  sure the corner radius matches the outer container as well", "Approve"); the owner said "Yes, build
  it".
- **Under the pointer** (mouse or trackpad only, 100 ms): Raised with no lip goes one step lighter (an
  off chip, round Back, the post header's mark when you point at the artist, the field's ✕). An icon or
  words with no body get a 6% wash and turn white (the post ⋯, bare Back, "Skip for now"); a link only
  turns white. A well gets the 6% wash and its icon turns white (sheet ✕, the blacklist's remove, Undo,
  a tag keeps its e621 colour); the Search field's words turn link-blue; "+N" gets a rim. One of
  several only turns white. Glass's rim goes from 16% to 32%. Pictures don't change.
- **Rows: Inset**, for a press and the pointer: 5% white, 4 inside the row, 20 corners in a panel, 12
  in a well; on a sheet or a dropdown 8 wider than the row with 16 corners. The lines above and below
  fade. Search suggestions get it too (the row the arrow keys or pointer are on). The sidebar's tabs
  and account row keep their own shape with a 5% wash; the account row's corners are 12.
- **Follow from favorites now has the wash** (it had none because a square box looked cut at the
  avatar); Inset's 8 wider rounded wash is what the owner picked for rows on a sheet.
- **Grid loading:** skeleton tiles are wells (16 corners) with a light band crossing them, and two
  10-tall bars in the 18 number line. First load: 12 on a phone, 3 full rows on a computer. Loading
  more: one row 12 under the last real row, in place of the spinner. Nothing to press.
- **Search suggestions, checked against DESIGN.md "While typing":** the app's group was already flat
  with 48 rows (the class mix-up was only in the mock). One gap fixed: an artist suggestion is now a 24
  mark and the name in callout, with "artist" as the value.
- My choice, not drawn: with reduced motion on, a control's hover colour changes at once (no 100 ms
  fade), so the earlier no-transition rules stand; the row wash still fades, as it moves nothing.

## 2026-11-26 — The app icon is redrawn as a hexagon with Play

- Owner's words, with a picture of e621's hexagon logo: "For the app icon, I'd like us to make some
  kinda in-theme icon where we have a similar hexagon but with an inset play icon".
- This replaces the earlier question (the kaleidoscope on a navy gradient or on flat navy).
- Drawn behind a switch in the mock ("Install, update and the app icon", column 3): a rounded,
  point-up hexagon built like the app's raised buttons (face, top light, lip, shadow), with Play sunk
  into it like a well, on the navy square. For a browser tab (32 and 16): no lip, no shadow, the
  hexagon larger. One colour for Android's themed icons: the hexagon with Play cut out.
  - **Gold** (my pick): the gold Play button as a hexagon, Play in navy. It still reads at 16.
  - **Navy, gold Play**: a Raised navy hexagon, Play as a gold inlay.
  - **Navy**: all navy. The quietest; Play is hard to see at 16.
- Mine, not the owner's: the hexagon is my own drawing, not e621's logo (no "e", no "621", no ears);
  the kaleidoscope stays the app mark inside the app (caught-up, Settings, the sidebar).
- Owner's pick: "Gold".
- **Locked: the Gold icon.** The other two colourings and the switch are out of the mock. The earlier
  question (gradient or flat navy behind the kaleidoscope) is closed: the icon keeps the gradient.
- Written into DESIGN.md with measurements (mine). Source files exported from the mock:
  `docs/path-a/icons/app-icon.svg` (full square), `app-icon-tab.svg` (32 and 16), `app-icon-mono.svg`.
- Not done: no PNG sizes were made and the app's own `favicon.ico` and manifest are not touched; that
  is the builder's side.

## 2026-11-26 — The mark inside the app becomes the hexagon

- I asked: "inside the app, should the mark stay the kaleidoscope or become the hexagon". Owner's
  words: "Use the hexagon".
- **Locked: the app mark is the hexagon with Play**, at "You're all caught up", at the foot of
  Settings and at the top of the sidebar. The kaleidoscope leaves the app.
- Not picked yet: how it is drawn there. The icon's own drawing cannot be used as it is, because of
  two owner-pinned rules: a lip means "press me" (the mark is not a button), and gold fills one thing
  per screen (Play is on the same screens). Drawn behind a switch in the mock, all without a lip:
  - **Inlay** (my pick): a Raised navy hexagon with the top light, Play set in as gold. Both rules hold.
  - **Gold**: the tab icon's flat gold hexagon. Closest to the icon. It is a second gold fill on every
    screen with Play, so the One Gold Rule would need an exception for the mark.
  - **One colour**: Link Blue with Play cut out. The quietest.
- Owner's pick: "Inlay".
- **Locked: Inlay.** Gold and One colour are dropped; the switch is out of the mock. Written into
  DESIGN.md ("Artist marks and the app mark") with measurements (mine). Source file:
  `docs/path-a/icons/app-mark.svg`.
- Proposed, not owner-approved: at "You're all caught up" the mark pops once (92% to 100%, 360 ms)
  where the kaleidoscope turned one notch; the Settings mark pops when pressed. The caught-up pop is
  in the spec only, not in the mock.


## 2026-11-26 — Building the hexagon app icon and app mark

- Built from the design session's 4dfc62b and c1d8dfa (owner: "some kinda in-theme icon where we have a
  similar hexagon but with an inset play icon", "Gold", "Use the hexagon", "Inlay").
- **The app icon:** `scripts/make-icons.ts` now renders every PNG from the design session's SVGs in
  `docs/path-a/icons` (app-icon for 512, 192 and the iPhone 180; app-icon-tab for 32 and 16; app-icon-mono
  for Android's themed icon). The manifest and the page's icon links didn't change (same files).
- **The app mark** (`AppMark`): the Raised hexagon with Play inlaid in gold, drawn from app-mark.svg, at
  the sidebar (36), "You're all caught up" and "That's everything" (56), and the foot of Settings (56).
  No disc, ring, lip or shadow. Each mark has its own gradient and clip ids: a hidden screen's copy
  can't lend its gradient to a shown one.
- The kaleidoscope's app-mark settings are gone; its generator (`avatarFor`) is no longer drawn
  anywhere and leaves the bundle (only its tests and `hash`/`rng`, used by the tab bar, remain).
- **The pop** (owner-approved after it was built, design 57f7323: "Approve"): the mark pops (92% to
  100%, 360 ms) the first time "You're all caught up" comes into view on a visit, and when pressed in
  Settings. It replaces the kaleidoscope's turn. Nothing with reduced motion. The list is windowed, so
  the row can mount again after a long scroll: the pop is remembered per screen entry for the visit.
- Test fix in passing: "Tapping Goo spurts…" waited 5 s for drops whose code loads when the page is
  idle; under the full parallel run that was too short twice. It waits 10 s.

## 2026-11-26 — The mark's pop approved

- I asked: "do you approve that pop", after saying the caught-up pop was in the spec only and that
  the owner had not seen it move. Owner's word: "Approve".
- **Approved:** the mark pops once as "You're all caught up" scrolls into view, and pops when pressed
  in Settings: 92% to 100%, 360 ms, `cubic-bezier(.3,1.35,.5,1)`; nothing with reduced motion.
- Added to the mock after the approval, so the drawing matches the spec: the caught-up mark pops the
  first time it comes into view.


## 2026-11-26 — The title no longer goes missing when you scroll back up

- Owner: "when I scroll up in settings the title is gone then pops in after a couple ms ... make sure
  the same behavior isn't there in other screens".
- Cause: the floating capsule is the title row itself (no button twice). Leaving, the row stayed in
  the capsule for its 150 ms fade, so the page had no title for that long. Every tab with a title row
  had it: Following, For You, Artists, Settings, on a phone and a computer. The artist page's compact
  bar is a separate bar over a hero that never leaves the page, so it never had it.
- Fix: leaving, the row goes back into the page at once and a copy of the capsule (title and count,
  no tools, can't be pressed or read out) does the fade. Arriving is unchanged.
- e2e: on all four tabs at 375 and 1280, two frames after scrolling to the top the title is in the page;
  the test fails on the old code.

## 2026-11-26 — The goo on a computer: options drawn, not picked

- I asked: "do you want to work on where the goo lives on a computer". Owner's word: "Yes, show
  options".
- Drawn in the mock behind a switch, at 5, 40 and 150 favorites: **Pool** (collects in the foot of
  the sidebar, never passes the account row), **Top edge** (the phone's bead and drips along the
  sidebar's top), **None** (no goo on a computer).
- My pick is Pool: a drop falls down from the heart, so the foot of the sidebar is where it can
  land; the top edge needs the drop to fly up. That is my view, not the owner's.
- **Not picked.** Nothing here is approved. The secret tab on a computer is still not designed.

## 2026-11-26 — The goo on a computer: Pool

- I asked: "which one do you want — Pool, Top edge, or None?" Owner's word: "Pool".
- **Picked:** the goo collects in the foot of the sidebar. Level 10 + 56(1 − e^(−n/60)) px, so it
  stops at the account row; the name shows through in Goo Ink where covered; no goo with the
  icon-only sidebar. The switch and the other two drawings are removed from the mock.
- Mine, not seen moving by the owner and not approved: the drop arcing from the heart into the
  sidebar's foot (described, not drawn). Not designed: the wipe on a computer, the row's name there,
  the secret tab on a computer.

## 2026-11-26 — The pool on a phone: options drawn, not picked

- Owner, after picking Pool for the computer: "Maybe we bring the pool to mobile somewhere too? I
  like the idea. Maybe the settings or something?"
- Drawn in the phone's Settings behind a switch, each following the live count: **Jar row** (the
  pool rises inside the "Tab bar goo" row's card), **Account** (inside the account card, as on a
  computer), **Puddle** (under the app mark at the foot), and **Off**.
- My pick is Jar row: the goo sits beside the button that wipes it. That is my view, not the owner's.
- **Not picked.** The tab bar's own goo is unchanged in every option.
- Fixed while drawing, on the computer's pool too: the navy copy under the goo was cut on a straight
  line; it is now cut to the goo's wavy shape.

## 2026-11-26 — The pool on a phone: Jar row

- I asked: "which place do you want — Jar row, Account, Puddle, or Off?" Owner's word: "jar row".
- **Picked:** the pool rises inside the "Tab bar goo" row's card in Settings: 4 + 42(1 − e^(−n/60))
  px of 56. Words in Goo Ink under the goo; "Wipe clean" on top. The switch and the Account and
  Puddle drawings are removed from the mock.
- Not designed, not approved: the level's motion and how the jar empties during the wipe.

## 2026-11-26 — The goo pools built

- Built from design 159ea87 (owner's picks "Pool" and "jar row"): `src/shell/pool.ts` (levels and
  shapes), `src/components/Pool.tsx` (the goo through the tab bar goo's filter and colour ramp, plus
  the copy under it drawn again in Goo Ink and cut by a mask made from the same goo, filter and all).
- On a computer the pool lies in the sidebar's foot, clipped to its bottom corners, and takes no
  clicks (the account row under it still opens). None with the icon-only sidebar (900–1099 wide).
- On a phone it rises inside the "Tab bar goo" row's card in Settings; "Wipe clean" stays on top.
- Mine: **no pool at 0 in the sidebar** too (the formula gives 10 px at 0; an empty jar shows nothing
  on a phone, so the same on a computer). Easy to change: `poolLevel` in `src/shell/pool.ts`.
- Known: where the goo covers the account row, its focus ring is under the goo (the row still works).
- Not built (not designed): the drop flying into the sidebar's foot, the level's motion (it jumps to
  the new count), the pools draining during the wipe, the row's name on a computer, the secret tab on
  a computer.

## 2026-11-26 — Two known gaps fixed; the sign-in check stays in the first load for now

- Owner: "fix the bugs" (MORNING Decide 11 and 12).
- **A hidden For You kept ranking after sign-out** with the old key: its screen's effects don't run
  while hidden, so it never stopped its ranking. Now the feed registry watches the session and stops
  and drops every kept feed (For You's rankings) when the key changes or goes. e2e: sign out with a
  slow ranking under Settings; no request with the old key after it (fails on the old code).
- **A tap while a Back was landing was dropped** (push, open a sheet, replace). Now it waits for the
  Back to land and then runs, in order. A second Back during a Back is still ignored (a double Esc
  shouldn't leave two screens).
- Owner asked what moving the sign-in check out of the first load would mean. The check itself
  stays; only where its code loads would change. It is small (about 1 KB), so it buys little room;
  with Remember on nothing visible changes, without Remember the first signed-in paint waits one more
  small file. Default: leave it; when a feature needs room, measure and move the biggest piece the
  first paint doesn't use.

## 2026-11-26 — How the pools move: proposed, not approved

- I asked: "do you want me to design how the pool rises and empties". Owner's word: "Yes, show it".
- The owner also passed on the builder's list of what it has not built because it is not designed:
  the drop flying into the sidebar, the level rising smoothly, the pools draining on Wipe clean, the
  goo row's name on a computer, the secret tab on a computer. This entry covers the first three.
- Proposed, live in the mock: the level rises on the drips' spring with a 340 ms swell; on a phone
  the jar catches up when Settings opens; Wipe clean drains it in 900 ms with the blade, leaning 8 px
  to the right. Reduced motion: the level changes at once.
- The drop on a computer is behind a switch: **Fall** (my pick) and **Arc**. When the owner picked
  Pool I had said the drop "arcs left into it". Drawn, the arc crosses half the window and passes
  over the Play disc, so I now recommend Fall. That is my change of mind, not the owner's.
- **Nothing here is approved or picked.**

## 2026-11-26 — The drop on a computer: Fall

- I asked: "which drop do you want on a computer — Fall or Arc? If the rise and the drain also look
  right, add 'approve'." Owner's word: "Fall".
- **Picked:** the drop falls straight down from the heart and leaves by the bottom of the window;
  the pool swells and rises 140 ms later. The switch and the Arc drop are removed from the mock.
- **Not approved:** the owner did not say "approve", so the rise, the catch-up when Settings opens,
  and the drain stay proposed.

## 2026-11-26 — How the pools rise and drain: approved

- I asked: "do you approve how the pool rises and drains". Owner's word: "Approve".
- **Approved:** the rise on the drips' spring with a 340 ms swell; the jar catching up 250 ms after
  Settings opens; the 900 ms drain on Wipe clean, leaning up to 8 px to the right; no motion with
  reduced motion.
- Honest limits: the catch-up is approved from its description, since the mock stands in for it
  with a "+12 favorites" button. I tested the motion by script and did not watch it play.
- Still not designed: the goo row's name and the wipe's control on a computer, and the secret tab
  on a computer.

## 2026-11-26 — Sign in on the e621 row; icons centred; the pools move; the live Follow check

- **Owner:** "instead of opening a menu when we're signed out we should just have a sign in button in
  the e621 sign in row that brings in the popup". Signed out, the row is no longer a link to the
  Account page: it carries a compact gold **Sign in** (gold: it's the one thing to do there) that opens
  the sign-in sheet. Signed in, the row still opens Account.
- **Owner:** "the sign in and tab bar icons look off center, we should do a pass". Measured every icon
  against its circle, well or tab at 375 and 1280: all boxes centred except the row well's deliberate
  0.5 drop (removed: it read as off centre). The rest was optical: four glyphs carry their weight off
  their middle, nudged by a share of their size (`globals.css` "Optical centring"; the tab bar's Goo Ink
  copies take the same): Sign in (log-in) −5% x, Following (rss) +4% x −4% y, Artists (users) +4% x,
  Goo (droplets) +2% x −4% y.
- **The pools move** (design ae6b77a, owner: "Fall", "Approve"): built as drawn in the mock's
  `poolStep`/`poolDrain`/`deskFall`. The Goo Ink copy is now cut by a clip path of the goo's shapes
  (user-space units), so it follows each frame. The pool reads the goo count itself; a drop in the air
  holds it until it lands (as the tab bar does). On a computer the sidebar's pool registers as the
  place a heart's drop goes when there is no tab bar.
- Mine: the jar remembers its last level only within a visit (a reload starts it at rest).
- **Live Follow check done** (owner: "Yes do follow live check"): Follow and Unfollow of nando wolf on
  the owner's account, each confirmed by a fresh read of e621's list; the account ends as it began.

## 2026-11-26 — The app is called eLicks21

- Owner, via the roadmap session: "Let's do eLicks21" (Licks rhymes with six, so it reads like e621).
- Renamed every place the app names itself: page title and description, manifest name and short name
  (the manifest id stays "/following", so an installed copy stays the same app), the sidebar's name,
  Settings' foot, the install sheet, the e621 button's label and title, the `_client` name sent to e621
  (`eLicks21/1.0 (by <user> on e621)`), README ("a browser for e621 (unofficial)"), PRODUCT.md and
  DESIGN.md's name lines.
- Kept: Settings › Slideshow and Classic slideshow (they name the Play feature's settings and the old
  page, not the app); the userscript's file URL and its `@name` (script managers know it by them);
  storage keys, cache names, the service worker, the repo and the domain (renaming would lose saved
  data or links). The app mark and icon have no text in them.

## 2026-11-26 — The goo row and the secret tab on a computer: options drawn, not picked

- I asked: "do you want me to design those two" (the goo row's name on a computer, and the secret
  tab on a computer, the last two on the builder's list). Owner's word: "Yes, show options".
- **The goo row:** drawn as the last group of the Settings page on a computer, a plain row with
  "Wipe clean" (mine). Two names behind a switch: "Goo" everywhere (my pick, renames the phone's row
  too) or "Sidebar goo" / "Tab bar goo".
- **The secret tab:** three options behind a switch, live in the desktop windows: Scroll (my pick,
  the phone's mechanic stood on its side), Mark (hold the app mark 600 ms), None.
- **Nothing here is picked or approved.**

## 2026-11-26 — The secret tab on a computer: Scroll

- I asked: "which secret do you want on a computer — Scroll, Mark, or None?" Owner's word: "Scroll".
- **Picked:** the four tabs ride a rail; a wheel turn down (or focus past Settings) slides it up one
  row and "Goo" comes in under Settings; pressing it throws ten drops into the pool. The switch and
  the Mark and None options are removed from the mock.
- Fixed while locking it, my mistake: the pool's swell could be drawn with a negative height on its
  first frame (a console error, nothing visible). It is in commit ae6b77a; the fix is in the mock now.
- Still open: the goo row's name on a computer.

## 2026-11-26 — The app is named eLicks21; wordmark options drawn, not picked

- Passed on by the "App architecture and feature roadmap" session, not typed to me by the owner: the
  owner's words there were "Let's do eLicks21". I found the same words in that session's transcript.
  Spelling: lowercase e, capital L.
- Renamed in the mock wherever the app names itself: the sidebar's brand, the foot of Settings, the
  label under the home-screen icon, the install sheet, "Add eLicks21 to your dock", "Adds an
  eLicks21 button to e621". Added, mine: the wordmark under Goo on the landing card.
- Not changed, because they do not name the app: the update toast ("New version ready"), the
  Version row, the first run after sign-in, and the app icon. "Settings › Slideshow" keeps its name:
  it is the feature's page.
- **Later the same day, owner: "Don't add the drop to the i, just keep it text".** Drop is out of
  the mock and the spec. Left to pick: Plain or Two-tone. What follows is the record before that.
- **Proposed, not owner-approved:** three wordmarks behind a switch: Plain, Two-tone, Drop (my
  pick). Nothing is picked.
- DESIGN.md, PRODUCT.md and `.impeccable/design.json` now say eLicks21. The surface brief does not
  name the product, so it is unchanged. `docs/path-a/GOAL.md` still says "e621 Slideshow" in its
  title; I left it, since it is the record of the original goal.

## 2026-11-26 — The wordmark: Two-tone

- Owner, typed to me: "Don't add the drop to the i, just keep it text", then, asked Plain or
  Two-tone: "Two-tone".
- Locked: "e" and "21" in Link #B4C7D9, "Licks" in the text colour, Fredoka 600. Type only. The
  switch and the other two options are out of the mock.
- Still mine, not approved: where the wordmark sits, and that the landing card now carries it.
- No wordmark file exists yet. The builder can set it as text with two spans; an SVG would need the
  letters turned into outlines.

## 2026-11-26 — Built: the two-tone wordmark, the secret tab on a computer (design 30ea838)

- **Wordmark (owner: "Two-tone"):** `src/components/Wordmark.tsx`, text in two spans with one
  accessible name, "eLicks21". Used only where the name already stood: beside the mark in the
  sidebar (20/25) and at the foot of Settings (17/22). Not added under Goo on the landing card: that
  spot is the designer's, not owner-approved.
- **Secret tab on a computer (owner: "Scroll"):** the sidebar's four tabs ride a rail clipped to
  188; a wheel turn down over them (or focus on Goo) slides it up 48 on the tab bar's spring, and
  up (or focus on Following) slides it back. "Goo" throws ten drops in spurts of 4, 3, 3 into the
  pool; the ten are counted at once (none lost if the sidebar goes) and the pool shows them one by
  one as each lands, with a swell where it lands. None with icons only; reduced motion adds ten at
  once. The wheel snaps open or shut, as in the mock: hand-following is not designed.
- **Not built (waiting on the owner):** the goo row in Settings on a computer and its name.
- **Fix carried over:** a pool swell's progress is clamped to 0 to 1, so its first frame can't give
  an ellipse a negative height.

## 2026-11-26 — The goo row is called "Goo" everywhere

- Owner, asked "Goo" everywhere or "Sidebar goo" / "Tab bar goo": "Goo, everywhere".
- The row in Settings is "Goo" on a phone and on a computer. The phone's old name, "Tab bar goo", is
  gone from the mock, DESIGN.md and the sidecar's preview. The heading "Tab bar goo" in DESIGN.md
  stays: it names the goo on the tab bar, not the row.
- Still mine, not approved: where the row sits on a computer (last group, after App, a plain row).
- Later the same day, owner, asked whether the row's place on a computer is right (the last group of
  Settings, under App, a plain row with no jar): "Approve". Nothing about the goo row is open now.

## 2026-11-26 — Built: the goo row is "Goo", and a plain row on a computer (design 45d7541)

- Owner: "Goo, everywhere" and "Approve". The row is "Goo" on a phone (still the jar) and on a
  computer, where it is the last group of the one-page Settings, under App, with no heading: a plain
  row with the count and Wipe clean, which drains the sidebar's pool. One component,
  `src/screens/GooRow.tsx`, used by both. "Tab bar goo" stays only as the DESIGN.md heading for the
  goo on the tab bar.

## 2026-11-26 — Where the wordmark sits: approved

- Owner, asked to approve where the wordmark sits, including under Goo on the landing card:
  "Approve".
- The three places: beside the 36 mark in the sidebar (20/25), under the 56 mark at the foot of
  Settings (17/22), under Goo on the landing card (28/34). Nothing about the name or the wordmark is
  open now.

## 2026-11-26 — Un-favouriting: the goo stays

- Owner, asked whether a post's goo stays or goes when it is un-favourited: "Goo stays".
- Goo only adds. Only "Wipe clean" empties it. This is how the app is built already, so there is
  nothing to change in the mock or the code.
- Mine, not approved: favouriting the same post again adds goo again.

## 2026-11-26 — Built: the wordmark under Goo; goo only adds (designs 18a04f9, 999a183)

- **Landing card (owner: "Approve"):** the wordmark under Goo, 28/34, 4 under Goo and 22 above
  "Follow the artists you love". All three places the wordmark sits are now built.
- **"Goo stays" (owner):** already so. Un-favoriting takes nothing off; only Wipe clean empties it.
  One difference from the designer's note, told to them: a post counts once per page session
  (`addFav`), so un-favoriting and favoriting it again adds no second drop until the page reloads.
- **Fix, owner's report:** on a computer Artists showed an empty sliver at the top right. Its tools
  capsule held only Search, which is in the sidebar there; the capsule now goes with it.

- Later, from the builder: the build remembers which posts added goo for the page session, so the
  same post adds no second drop until a reload. I changed the spec to match the build and dropped my
  "adds again" line. Not owner-approved either way; the question is on the morning list.- Owner, asked one drop per post or a new drop every time: "One per post". Locked, as built. The
  build's memory lasts for the page session only; the owner was told and did not ask for more.

## 2026-11-26 — Tune: Filter artists (owner's ask)

- Owner: "add a toggle to the for you tune settings to filter out artists from the taste building
  process". A switch row in Tune under Breadth: "Filter artists", "Ranks without artist tags"
  (owner: "just say 'filter artists' with a brief description … shouldn't be too prescriptive").
  Placement and copy are mine; not drawn by the design session.
- Kept with the pins and mutes (`overrides:<user>`, `noArtists`), so per account and on this device.
- When on, For You's taste has no artist tags: the lift weights skip them, the learned weights drop
  the favorites' artists, and each candidate is scored without its artist tags (so an artist only
  the sample had can't push a post down either). The searches For You plans and "Recommended
  because" follow. A pinned artist still counts. Like a pin, it offers Update ranking; nothing
  re-ranks on its own.
- The learned fit itself is not redone without artists: it still shares credit between an artist
  and their usual tags, then the artists are dropped. A refit would also need a second fit for
  Artists › Suggested, which keeps the artists' taste whatever the switch says.
- **Breadth's ends are numbers** (owner, same day): "2" and "30" in place of "Close to my favorites"
  and "Surprise me", since many tags can weigh about the same and Breadth is how many are searched.
  The note under it says just that.

## 2026-11-27 — The check list: the overnight batches are owner-approved

- The 49 things still open were put on one page (https://claude.ai/artifact/43ibNeuA4gHKncdwxkW3XM), each
  with where to look, the other option and my pick. The owner answered 48 by tapping; no notes. I read
  the answers from the page's store.
- 47 times "Agree" (or "Looks right"): every listed choice in the five overnight batches, the sidebar
  with names, Play as a disc on a computer, the leftovers. DESIGN.md's five "Proposed, not
  owner-approved" headings now read "Owner-approved 2026-11-27 on the check list". What was approved
  is the listed choices; the measurements are mine.
- "Agree" also meant "drop" for three things I had added: "What's new" (never built), the "Updated to
  2.1" toast (built, to be removed), the one-time "Install the app" row on Settings (never built).
  They are out of the mock and DESIGN.md.
- Safari: the owner sees Share under "•••". The hint in the install steps stays.
- Not answered: whether Search, Artists and the artist page on a computer need their own drawing.
- Fixed in passing: two places in DESIGN.md still said "Slideshow" where the app names itself (the
  install sheet's lead and the e621 button's line).
- Pull request 24 was merged to main as `3d28a4b` on the owner's say ("It's ready, let's mark ready and
  merge for now").


## 2026-11-27 — Built: popovers on a computer; the "Updated to" toast is gone

- Built from the check list (owner: "Agree" to g1 and b7; I read the answers from the page's store
  myself before building).
- **The "Updated to 2.1" toast is gone.** After a Reload into a new build nothing is said.
- **Popovers on a computer** (DESIGN.md "On a computer", "Popover"). A sheet opened from something on
  screen hangs from it: 300 wide, 8 below it with left edges lined up (right edges when it would leave
  the window), no grabber, no ✕, no dim; a click away or Esc closes it. These are the menus of
  Following, For You and Results (⋯), an artist page's ⋯, an artist row's ⋯ in Artists (followed and
  suggested), a post's ⋯, and a grid tile's right-click menu, which opens at the pointer.
- **How a popover finds its opener:** every press (click, key, right-click) is noted as it happens
  (`src/shell/opener.ts`); a sheet marked `pop` that mounts within 1.5 s of one hangs from that
  control. A sheet opened any other way (a keyboard shortcut) is the centred dialog.
- **Mine, not in the spec:** when there is no room below the opener and more above it, the popover
  opens 8 above it instead. Slideshow's choices in Settings (Transition, Quality, Longest video, Load
  ahead) are popovers at their row: they are opened from a row and only pick one of a list, like the
  sort and date menus. Undo either by taking `pop` off the sheet.
- **Still dialogs in the middle:** Quick settings, Keyboard shortcuts, sign-in, the install steps,
  Follow from favorites, Mark all as seen (a confirm with its own job), the search editor, Quality in
  the player's Quick settings.

## 2026-11-26 — For You: artists and characters take at most a third of the search; do-not-post marks don't count

- Owner's report: a friend with many favorites got only artist tags in For You, and the owner's own
  Tune showed `avoid_posting` as the strongest tag, then artists only.
- **Bug:** e621's do-not-post and warning marks (`avoid_posting`, `conditional_dnp`, `sound_warning`,
  `epilepsy_warning`, `third-party_edit`) and its no-one placeholders (`unknown_artist`, …) are artist
  tags on e621. The artist lists already skipped them; For You's taste didn't. Now they get no weight,
  learned or lift, and their counts aren't fetched.
- **Why only artists:** lift is capped at 50×. Artists are rare on e621, so any artist favorited a few
  dozen times hits the cap, while content tags, common on e621, almost never do. With a few thousand
  favorites, all 15 searched slots went to artists, and the candidates were their posts.
- **Fix:** at most a third of the searched tags (rounded up: 5 of 15) are artists while other tags
  are left; artists past that fill in only if other tags run out. Pins don't use the share. Every
  tag still counts when ranking; Tune lists the artists past the share under "Not searched".
- **Characters share the third** (owner: "Share a third"). The owner's own Tune was all characters, for
  the same reason: characters are as rare on e621 as artists. Artists and characters together take at
  most a third, not a third each, so content tags keep two thirds of the search. "Filter artists" still
  takes out artists only.
- **Characters weigh half** (owner: "would love to have characters weighted less"). Their category
  multiplier is 0.5, like copyrights, so a character at the lift cap weighs about as much as a content
  tag at 7× lift. It changes Tune's order, the searched tags and the ranking before a model is learned.
  The learned model fits its own weights and is unchanged. The shared third stays as a backstop.
- Not backtested live (needs `.env.backtest`); `scripts/rec-backtest.ts` still plans without the share.


## 2026-11-27 — For You: tag weights damped by share of the favorites

- Owner, after the shared third and the half weight for characters: "Would love to think about the best
  approach holistically here", then picked the fix at the root ("do #1").
- **Root cause:** a tag's weight was damped by n / (n + 5), a count. With thousands of favorites, every
  tag on 50 or more of them got full weight, so any artist or character favorited a few dozen times hit
  the lift cap. Content tags, common on e621, rarely do. The shared third and the half weight only
  covered this up.
- **Fix:** the weight also scales by s / (s + 2%), s = the tag's share of the favorites
  (`SHARE_HALF`). A tag on 10% of the favorites keeps 83% of its weight, one on 1% keeps 33%, at any
  profile size. A small profile hardly changes (3 of 100 favorites is already 3%). The count damping
  stays for tiny counts. One rule for every category: no artist or character case.
- The shared third and the half weight for characters stay as backstops; with this they rarely bite.
- Changes Tune's order, the searched tags and the ranking before a model is learned. The learned model
  fits its own weights and is unchanged.
- **Backtest** (owner's go-ahead, 2026-11-27; `scripts/rec-backtest.ts` gains `mix-3-count`, the old
  damping, and logs how many names each plan searches). Last 30 days hidden, breadth 15, app's plan
  (mix-3), learned model mix10:
  - The friend whose For You was all artists (10,921 favorites, 22 hidden): names searched 5 of 15
    before, 2 of 15 now. Hidden favorites found 10 → 20; in the learned top 200, 5–7 → 10–12.
  - The owner (2,002 favorites, 18 hidden): no names searched either way. Found 7 → 11; in the learned
    top 200, 5–6 → 7–8.
  - Cost: the old plan's narrow tags ran dry in 4–6 pages; the new one uses the full 25-page budget
    plus 3 popular pages, as designed. Two accounts and 40 hidden favorites: a direction, not a proof.

## 2026-11-27 — Search, Artists and the artist page on a computer: fine as built
- Owner, after the check list, asked whether Search, Artists and the artist page on a computer need
  their own drawing: "Fine as built". The check list is fully answered (49 of 49). Nothing to build.

## 2026-11-27 — For You: tags common on e621 damped too
- Owner, on the share damping's results: "one of the original intents with the weight system was to
  make it harder for broader things like male_penetrating_male, which is a very common tag on e621, to
  show up as opposed to specific kink interests … trying to make the system good at finding the things
  that aren't so broad." Picked the site-breadth damping ("Yes, add it").
- **Why the share damping broke it:** lift is a log, so it squashes specificity. In the friend's
  profile male_penetrating_male (3.6% of e621, 9×) scored 2.2 and muzzle_(object) (0.24%, 20×) 3.0;
  the share damping then cut the muzzle (4.8% of the favorites) to 71% and left the broad tag (31%)
  at 94%. 8 of the 15 searched tags were on over 1% of e621.
- **Fix:** weight also scales by 1 / (1 + c / 1%), c = the tag's share of all e621 posts
  (`SITE_HALF`). A tag on 1% of the site keeps half its weight, one on 3.6% keeps 22%. The share
  damping stays: it is what keeps 0.2%-of-the-favorites gear tags out.
- **Backtest, the friend's account** (last 30 days hidden, 22 favorites; app's plan with 3 popular
  pages; learned model mix10, quality 0.5–1):

  | Weighting | Names searched | Tags on >1% of e621 | Pages | Found | Learned top 200 |
  |---|---|---|---|---|---|
  | count only (before #28) | 5 | 0 | 4 + 3 | 10 | 5–7 |
  | share only (#28 alone) | 2 | 8 | 25 + 3 | 20 | 9–11 |
  | share + site breadth (now) | 5 | 0 | 4 + 3 | 14 | 8–9 |

- Read: the broad tags bought the extra finds by pulling 4× the posts, the pool size the weighting
  exists not to chase. Now beats the old weighting on every measure, with no broad tags. Names are back
  at the shared third (5 of 15). The specific tags run dry in 4 pages of a 30-day window, so most of
  the page budget goes unused; a later change could spend it on more tags.
- The owner's own account is no longer used for tuning or testing the weights.

## 2026-11-27 — For You: the tag search goes on with the next tags when the first run out
- Owner, on "the specific tags run dry in 4 of the 25 pages": "yeah sure!"
- **Change:** the candidate search runs in rounds (`searchTiers`, `SEARCH_TIERS = 3`). Round 1 is the plan
  For You always searched; when its query runs out of posts, the search goes on with the next `breadth`
  tags by weight (names still at most a third per round), within the same 25-page budget. Tune and the
  settings panel still show round 1 only.
- **Backtest, the friend's account** (last 30 days hidden, 22 favorites; with 3 popular pages; learned
  model mix10, quality 0.5–1):

  | Rounds | Pages | Candidates | Found | Learned top 200 |
  |---|---|---|---|---|
  | 1 (main) | 4 + 3 | 1,912 | 14 | 8–9 |
  | 2 | 14 + 3 | 4,424 | 17 | 9 |
  | **3** | 22 + 3 | 5,812 | **19** | **10–11** |
  | 5 | 25 + 3 | 6,120 | 19 | 10 |

- 3 rounds: 5 more found and about 2 more in the top 200, with nothing broad added (round 2's broadest
  tag is dominant_male, 1.1% of e621). 5 rounds found no more. One account and 22 favorites; the 7-day
  window had 1 hidden favorite, too few to test.
- **Cost:** up to 25 tag pages instead of 4, so a ranking takes longer and makes more e621 requests.

## 2026-11-27 — The post panel's top corners are 26; the ⋯ stays inside the padding
- Owner, asked "Fix the artist mark's loose corner in the mock next?": "Yes, fix it". This replaces "left
  as it is" from the 2026-11-25 pass. Then, with two pictures of the ⋯ button crowding the corner: "Also
  need to fix spacing around the triple dot as well if this didn't cover it".
- How, decided by the designer: both top corners of the post panel are 26, the bottom two stay 24. A 36
  disc (18 radius) 8 inside a corner wants 18 + 8 = 26; at 24 the gap was 8.8 on the diagonal and 8 at the
  sides. This is the spec's own rule (outer radius = inner radius + gap).
- The ⋯ was pulled 6 into the panel's edge so its dots lined up with the picture, which left its 36 wash 2
  from the edge. It now stays inside the 8 padding: the wash is 8 from the top and the right. The cost:
  at rest the dots are 15 from the panel's edge, not 9. The Follow pill moves 6 to the left with it. The
  ⋯ in an artist card's header moves the same way. A list row's ⋯ is not changed.
- Not chosen for the mark: a 32 mark (a smaller mark, 2 above the text's centre) and moving the 36 mark
  2 up and left (it leaves the picture's left edge). Both were drawn and measured.
- Only `screens-v6.html` changes. `feed-v6.html` stays as approved.
- For the build: `border-top-left-radius` and `border-top-right-radius` 26 on the post panel and its
  loading skeleton; no negative right margin on the ⋯ in a panel's header.

## 2026-11-27 — The picture viewer, the post page, comics: owner-approved
- Owner: "Single-post view, so we can share a post out specifically from our app and have it link back
  with an image preview", "Might also want to build comic view into this so when we click into a post
  that's a part of a set we can look through it", and "single-image viewing, where when we tap into a
  picture it pulls it up fullscreen and allows us to zoom and save and stuff without pulling us into the
  slideshow view, kinda like if we were on X or bluesky".
- Drawn in `screens-v6.html`, section "A post on its own", and written in DESIGN.md under the same name.
- Decided by the designer, for the owner to react to: tapping a picture opens the viewer, not the paused
  player; the viewer is the player's glass with Favorite, Post info, Share and Save; a comic is an e621
  pool, read page by page in the viewer; the post page is `/post/<number>`; "Share post" shares that
  link from every feed; a post's ⋯ gets "Open post".
- Owner, asked "Double tap in the picture viewer: zoom or favorite?": "Zoom". The switch is gone. In
  feeds and in the player a double tap still favorites.
- Owner, asked "Link preview of a Questionable or Explicit post: picture or covered?": "Picture". The
  switch is gone. The drawn card with no art stays for one case only: a post e621 hides from signed-out
  visitors, whose picture cannot be fetched.
- Owner, asked "Approve the viewer, post page and comic screens as drawn?": "Approve".
- Still open, for the builder: how a link gets its preview (see "Not checked" below).
- Not checked: whether a server may fetch a post from e621 for the preview, and Save on a real iPhone.

## 2026-11-27 — Built: the post panel's 26 top corners; the ⋯ inside the padding
- From the design commit 2ce8910 (owner: "Yes, fix it", then "need to fix spacing around the triple
  dot as well"). A post panel's top corners are 26 (the skeleton's too), the bottom two 24. Its ⋯ has
  no negative margin: the 36 wash is 8 from the top and the right, as the mark is on the left. An
  artist card's ⋯ likewise sits inside the card's 8 padding (the head lost its 4 right padding and the
  ⋯ its −10 pull). A list row's ⋯ keeps its pull.
- New e2e test `post-panel.spec.ts` measures the corners and the 8s.

## 2026-11-27 — On a computer: Ground behind the sidebar; the shrunk top bar's hover follows its end
- Owner, with screenshots: "this strange background behind the left bar on desktop, is that to spec?"
  and "these hover states in the for you bar look off".
- **Behind the sidebar:** the page was black and the screen's Ground began right of the sidebar, so
  the sidebar sat on a black strip. DESIGN.md has the sidebar float on the window and only the
  player's window black. At 900 and wider the page is Ground; the player still paints its own black.
- **The shrunk top bar's hover:** its tools wore the tools capsule's 40 by 36 wash, which is 4 inside
  that 44 capsule but 8 from the top and bottom of the 52 top bar and 4 from its end, so it did not run
  parallel to the 26 end. **Mine, by the hover rule** ("radius = the container's less the gap"): in the
  52 bar the tools are 44 wide and the wash is a 44 circle, 4 inside on every side. Same on a phone,
  where there is no hover; the tools are 4 wider each there too.

## 2026-11-27 — Built: the picture viewer (part one of "A post on its own")
- From the design commit 2ce8910 (owner: "Approve"; "Zoom" for the double tap), on "Merge both,
  start viewer". `?view=<post number>` over the screen; Back, ✕ and Esc close it and land the feed on
  that post, as the player does. Code: `src/player/Viewer.tsx` (its own chunk, fetched when idle).
- **A tap on a card's picture opens the viewer.** The player opens from Play, ⋯ › "Play from this
  post" and Play from here. A video still plays or pauses in place on a card (DESIGN.md: no videos in
  the viewer this pass).
- **Grid tiles keep turning the feed to a list at that post.** Owner, asked "Grid tiles on Results:
  open the viewer, or keep turning the feed to a list?": "Keep list behavior" (2026-11-27). This
  overrides DESIGN.md's "or a grid tile" in the viewer bullet; every grid (Following, For You,
  Results, Favorites, an artist) already does it, so no tile opens the viewer.
- Hands as drawn: one tap hides or shows the buttons (after 250 ms, so a double tap can cancel it);
  a double tap zooms to 2.5 at the point in 280 ms and back to fit, never favorites; pinch 1 to 5;
  a drag moves a zoomed picture; a drag down on an unzoomed one closes past 120 px, the picture
  following and the room fading so the feed shows through. On a computer the wheel zooms at the
  pointer, a drag moves a zoomed picture, a mouse drag never closes it; **mine:** keys L (favorite),
  I (Post info), + − 0 (zoom in, out, fit), like the player's keys.
- **Mine:** the sample file shows first; once zoomed past fit the original file loads over it and
  fades in (200 ms), so zooming in gets the full picture without every open paying for it.
- **Save, through our own pass-through.** e621's file host lets only e621.net read its files (CORS),
  so the page can't hand a file to a share sheet or a download. Owner, told what a pass-through
  means (Vercel's Acceptable Use Policy lists "proxy... or host media for hot-linking", and the
  files would come from our domain): "Build pass-through" (2026-11-27). `next.config.ts` rewrites
  `/media/ab/cd/<md5>.<png|jpg|jpeg|gif|webp>` to `static1.e621.net/data/...`, nothing else (any
  other path is a 404). On Vercel that is an external rewrite: no function, so no 4.5 MB limit; a
  2-minute timeout. Only Save uses it; pictures still load from e621 directly. Fetched with no
  credentials (e621's files are public; the API key never goes near it).
  - On a phone (coarse pointer) the share sheet gets the file, named `<artist>_e621_<id>.<ext>`;
    on a computer it downloads. While the file comes, the glass breathes (aria-busy).
  - **Mine:** a share sheet needs a fresh tap; if the fetch outlasted the tap's permission, the file
    is kept and a toast says "The picture is ready: tap Save again".
  - If the pass-through fails, the full picture opens in a new tab with a toast. Holding the picture
    still brings the phone's own menu.
  - Not checked: Save on a real iPhone, whether e621's Cloudflare lets Vercel's servers through, and
    which Vercel transfer allowance this traffic counts against.
- A reload or a link with `?view=` finds the post in the screen's feed, else asks e621 for `id:<n>`;
  none: "No post #… on e621".
- **A video** (a grid tile, or a link with `?view=` to one) hands itself to the player, paused, in the
  viewer's place (a replace, so Back still goes to the feed).
- **JS budget:** the viewer rides in the player's chunk (a chunk of its own put its file list in the
  first load: 200.6 KB, over the 200 limit). The route and shell parts still came to 200.2, so the
  post ⋯ sheet (`src/feed/PostMenu.tsx`) moved out of the first load into the filter sheets' chunk;
  it shows only after a tap and that chunk is fetched when idle. First load now 198.0 KB.
- Not built in this part: comics, the post page, "Open post", link previews.
- Tests: `e2e/viewer.spec.ts` (opens from a tap, not the player; tap hides, double tap zooms and does
  not favorite; the heart favorites; ✕, Back and Esc; reload; the wheel; Post info beside it on a
  computer). Four older tests that opened the player with a tap now open it from ⋯.

## 2026-11-27 — A grid tile does not open the viewer
- The approved section said "Tapping a picture in a feed or a grid tile opens it". "or a grid tile" was
  the designer's line. It went against the owner's idea of 2026-11-26 (a grid tile opens the feed at
  that post), and the designer did not point that out when asking for approval.
- Owner, asked by the builder "Grid tiles on Results: open the viewer, or keep turning the feed to a
  list?": "Keep list behavior". The designer has this from the builder's message and from the
  builder's entry on PR #32, not from the owner directly.
- Now: only a picture in a feed opens the viewer. In every grid a tile turns the feed to a list at that
  post, and the picture there opens the viewer. "Play from here" stays in the tile's menu.
- Changed: DESIGN.md's viewer bullet, UX.md's Media taps note, the "Tapping a picture" row of the
  table in `screens-v6.html`. No drawing changes.

## 2026-11-27 — Fixed: the sign-in sheet's spacing, back to the drawing
- Owner, with a screenshot on a computer: "analyze the sign-in form for spacing issues". Measured
  against `screens-v6.html` (DESIGN.md "Sign-in sheet"); the same on a phone, so not a computer-only
  fault. What was off, and what it is now:
  - Step 1 (the link) stood 44 tall and the other two 28, so the gaps were 16 then 8. All three are
    28 and 8 apart; the link's tap target still reaches 44 (an invisible 8 above and below).
  - The steps to "Username" were 24 apart, the labels 16 in and 6 above their fields, and a field to
    the next label 8. Now 16; 14 in (the field's own text inset); 4 above; 12.
  - The shield note was 16 in on both sides with 12 above and 4 below; now flush with the fields,
    16 under the key field and 12 above the switch row.
  - "Remember on this device" was a 56 list row with its text flush left and the switch 4 short of
    the fields' right end, 8 above Sign in. Now a 44 row, flush on both sides, callout-rounded, 16
    above Sign in. Paste sits 6 from the key field's end (was 10).
- New e2e test `sign-in-sheet.spec.ts` measures each of these on a computer and a phone.

## 2026-11-27 — Built: the post page, Open post, Share post
- Owner: "Post page first" (before link previews and comics). Built from DESIGN.md "A post on its
  own": `/post/<number>` (1 to 10 digits, else the 404 screen), pushed over the tab it came from.
- What it shows: the post's panel without its tag row (the tags stand below, by kind, artists
  always shown), then the description, the file line, Source and Open on e621, and "More from
  <artist>" (6 tiles, See all opens the artist). A tap on the picture opens the viewer over the
  page (`/post/<n>?view=<n>`); a More-from tile opens that post's page.
- Calls in the build, not in the drawing:
  - The comic group is left out until comics are built.
  - A post e621 hides from signed-out visitors, and one on your blacklist, show a post-shaped gate
    (Sign in; or which line matched and Show it, for this visit only). The feed has no such gate
    built, so there was nothing to reuse.
  - The description shows as plain text (DText markup removed, links kept as their words).
  - Source shows only http(s) links, by site name.
  - On a computer two columns (600 and 344, 24 apart) only from 1280 wide; below that the rest
    stands under the post.
  - The page's own ⋯ has no Open post and no Play from this post.
- "Open post" is the first row of every post's ⋯ (a card's and a held tile's). "Share post" now
  shares `/post/<n>` in this app (was the post on e621); no sign-in rides along.
- The post page rides in the artist page's chunk, so the first load gains no file name (198.8 KB).
- Not built in this part: link previews, comics.
- Tests: `e2e/post-page.spec.ts` (signed out from a link; the viewer; a wrong number; the hidden
  and blacklist gates; Open post and Share post from a feed's ⋯; the two columns at 1440).

## 2026-11-27 — Save in the viewer: what the build added, written into the design
- Built by the builder on PR #32 (`afad3d8`): Save fetches the file through the app's own `/media/…`
  path, because e621's file host lets only e621.net read its files. Owner, to the builder: "Build
  pass-through". The designer has those words from the builder, not from the owner directly.
- The build added two things the design did not have: a toast when a phone needs a second tap to
  open the share sheet, and a new tab with a toast when the file cannot be fetched. Owner, asked
  "Write Save's two fallbacks into the design files?": "Yes, write them".
- **Mine:** both toasts take the toast's two-line form. "The picture is ready" / "Tap Save again"
  (was "The picture is ready: tap Save again", 301 wide at 375; it would be cut on a 320 phone).
  "Couldn't save it here" / "The full picture opened in a new tab" (was "Couldn't save here: the full
  picture opened in a new tab", 56 characters, cut at 375). Marks: Save's arrow in Link Blue; the
  alert glyph in Danger.
- **Mine:** a toast in the viewer floats 12 above the bottom stack: 142 from the bottom of a phone,
  202 in a comic, 76 on a computer's stage. The build has 120 for the player's room, which would sit
  10 into the artist's row by the mock's measures. Not checked in the build.
- Kept from the build: the button's glass fades to 55% and back while the file comes; the file's name.
- Not checked: Save on a real iPhone; whether a phone lets the new tab open after the wait for the
  file (browsers often block a tab that is not opened straight from a tap).

## 2026-11-27 — "Made by" on the App page
- Owner: "I'd also like to add to the about a made by section, mentioning it's made by Oreo, linking
  to my telegram (t.me/hyenafox), and a short sentence saying to reach out with bug reports or
  feature requests".
- Drawn in `screens-v6.html`, "4. App": label "Made by" under About's note; one row, "Oreo" over
  "@hyenafox on Telegram", a paper plane in the well, the external-link glyph at the right; under it
  "Found a bug or want a feature? Send a message."
- **Mine:** its place (after About, last on the page), a group of its own rather than a third row in
  About's flat group, the paper plane, and the sentence's words.
- Owner, asked "Is "Made by" right as drawn?": "Yes, commit and send".
- For the build: the row is a link to `https://t.me/hyenafox`, new tab, `rel="noopener"`.

## 2026-11-27 — A failed Save offers "Open"; no tab opens by itself
- The builder, from the code (`src/player/save.ts`): the new tab is opened after the fetch has been
  waited for, so a phone's browser is likely to block it. Not tried on a phone by anyone.
- Owner, asked "Use the "Open" button on the failed-Save toast?": "Yes, commit and send".
- **Mine:** the failure toast is "Couldn't save it here" / "Open the full picture
  instead" with "Open" in the action slot (the toast's ring, 6 s). "Open" is a tap, so the tab opens
  on every browser. It is the same on a computer, so there is one behaviour to learn. 291 wide at 375.
- This makes "Open" the third word the action slot can hold, after "Undo" and "Reload".
- Not chosen: keep opening the tab by itself and show these words only when the browser blocks it.
  That gives two toasts for one failure.

## 2026-11-27 — Built: "Made by", and Save's two toasts as designed
- Owner: "Made by + Save toasts" (designs 886d01f and b214e46).
- **Made by**, last on the App page: one row to `https://t.me/hyenafox` (new tab, `rel="noopener"`),
  "Oreo" over "@hyenafox on Telegram", lucide's paper plane in the well; under it "Found a bug or
  want a feature? Send a message."
- **Save:** "The picture is ready" / "Tap Save again" (Save's arrow, 4 s). When the file can't be
  fetched, nothing opens by itself any more: "Couldn't save it here" / "Open the full picture
  instead" with "Open" (6 s, the ring); Open opens the original file in a new tab from its own tap.
  The next tap on Save tries to save again.
- **A toast in the viewer**, measured: it sat 168 from the bottom on a phone (above the feed's
  Play, still in the page under the viewer) and 120 on a computer (the player's rule). Now 12 above
  the viewer's artist row: 142 on a phone (34 or the safe area, + 108), 76 on a computer.
- Tests: `viewer.spec.ts` (both toasts' words and places; no tab until Open), `settings.spec.ts`
  (Made by).

## 2026-11-27 — Fixed: the top pill hid under the title; Following's counts didn't clear
- Owner: "update ranking and similar items seem to be trapped at top of scroll" and "Following post
  notifications don't seem to clear even after having seen/scrolled past the posts".
- **The pill** ("Update ranking", "↑ N new posts") was sticky 12 from the top, so once you scrolled
  it sat under the floating title capsule (higher up, and drawn over it). It now rides 12 under the
  capsule: 68 from the top on a phone (4 + 52 + 12), 72 on a computer (8 + 52 + 12), plus the safe
  area. Before you scroll it stays where it was, under the chips.
- **The counts:** marking seen moved e621's marker but every count kept the session's number
  ("10 new since your last visit", the tab and sidebar badge, Play's count) until the next session.
  UX §5 had it so ("the subtitle counts new posts loaded so far"); the owner calls that a bug. Now,
  once marked seen this session, those counts are 0 and the subtitle says "All caught up". The New
  dots and the divider still stay put for the session, so nothing in the feed jumps.
- Unchanged: when e621 has newer posts than the ones loaded, nothing is marked and the pill shows
  (UX §5 rule 3); after the pill's tap, scrolling past marks as before.
- **A post's description keeps its formatting** (owner, 2026-11-27, with a friend's report of
  "h2." showing as text: "We should likely respect the formatting in descriptions"). This replaces
  the post page's plain-text call. `src/lib/e621/dtext.tsx` turns the common DText into React,
  never HTML:
  - h1. to h6. become a bold line; [b] [i] [u] [s] [sup] [sub] keep their look.
  - Links open in a new tab (web links only); "post #123" opens that post's page here.
  - [[wiki]] and {{tags}} show their words; "* " lines are a list.
  - [spoiler] is a Well bar until tapped.
  - [quote], [section] and the like keep their words without the tags.

## 2026-11-27 — Fixed: what a code review of the viewer, Save and the post page found
- Owner: "Fix them", then "Also fix the rest of the findings too".
- **What the viewer can't show goes to the post's page** (it sat on a loader): a video with no feed for
  the player to find it in, a picture e621 hides from you (the page's Sign in gate), a post on your
  blacklist (the page's gate). "Show it" there holds for this visit (`src/feed/revealed.ts`), so the
  picture then opens in the viewer.
- **More from** asks only the ratings you have on and leaves out your blacklist, as feeds do (it
  asks 24 and shows 6).
- **Save:** only a used-up tap ("NotAllowedError") asks for another; any other refusal by the share
  sheet offers Open (it looped on "Tap Save again").
- **Smaller:** the viewer takes the focus when it opens; one post is asked of e621 once a visit,
  shared by the page and the viewer (`src/feed/postCache.ts`; the page asked 4 times); Try again
  shows the loader while it asks; a deleted post e621 still sends counts as no post.

## 2026-11-27 — Post info shows the description; a card's bar opens the post
- Owner: "hitting I on a post doesn't show its description". Post info (the player's and the
  viewer's sheet) now has "Description" under the numbers and the "For you because" line, above the
  tags, in the post page's DText look. "post #123" in it closes the sheet and the player or viewer,
  then opens that post's page.
- Owner: "Unless we tap artist's name, tapping the post's bar should open the post, not the artist
  page now". The bar (the header's empty part and the time and number line) opens the post's page;
  the artist's name opens the artist, and so does the artist's mark (the builder's call: the mark
  is the artist's picture). On the post's own page the bar does nothing. This changes DESIGN.md's
  "the header already opens the artist", which the designer has to update.

## 2026-11-27 — The date menu's Custom part: segments hug their words
- Owner, with a screenshot of the build on a computer: "We may also need to make some spacing fixes
  in the date filter dropdown".
- Measured: the build matches `screens-v6.html` (rows, paddings, the 311 track), so the faults were
  the drawing's. Three of them:
  - "Custom…"'s capsule sat 4 above a full-width line. Now 8, and the line is 16 in from each side.
  - The five kinds were equal segments of 61: "Between" (51 wide) had 5 at each side and 16 to
    "Before". Now every word has 14 at each side.
  - The units were drawn as three; the build added "years" (kept), which left "months" 1 at each
    side. Now four units that hug their words, 8 at each side, beside a 72 number field (was 88).
- Owner, asked "Commit and send the text spacing and both menu fixes?": "Commit and send".
- **Mine:** the rule "segments hug their words when equal ones would leave a word less
  than 10 from its segment's edge" (DESIGN.md "Segmented control"). Every other control keeps equal
  segments.
- Not chosen: the units on a row of their own under the number field (18 at each side, but 52 taller
  and the number field stands alone); a 64 field (9 at each side; the field looks stubby).
- For the build: the capsule's place and width come from the chosen button, not from an index.

## 2026-11-27 — "Is the text spacing off?": measured, three options drawn; the owner picked C
- Owner, with a screenshot of Settings' App rows on a computer: "is it just me or is the text
  spacing off?"
- Measured from the screenshot: the 32 well, 12 gap and 16 padding are to spec, and the six strings
  are within 2 px of the mock's widths. The build is not at fault.
- What the designer sees: Fredoka's word space is 0.24 em, narrow beside its wide bold letters
  ("e621 button" reads as one cluster), and the 13 px system line under it runs loose by the
  system's own spacing. Two rhythms, one above the other.
- Drawn for the owner to pick: A, as is; B, word-spacing +0.08 em on everything set in the round
  face; C, B and letter-spacing −0.02 em on the 13 px system line. The designer's pick is C.
- Owner, asked "Which text spacing do you want: A, B or C?": "C".
- Now in DESIGN.md, "Hierarchy", under the table: Fredoka everywhere has word-spacing 0.08 em; system
  text at 13 (Footnote and Tag) has letter-spacing −0.02 em. **Mine:** that Tag takes it as well as
  Footnote (the picture showed a Footnote line; Tag is the same face and size).
- In the mock it is applied by a script that tags each element by the face it ends up in (2,635
  elements). The build should set it where it sets the faces.
- Checked in the mock at 400 and 1400 wide: no text newly cut off, no line newly wrapped, no sideways
  scroll. Toasts measure 198 and 283 now (were 194 and 291).

## 2026-11-27 — The ⋯ menu: labels line up with the name; 16 above the mark in a popover
- Owner, with a screenshot of a post's ⋯ popover on a computer: "New design bug report in the item
  dropdowns as well".
- **The build's:** the context line keeps its phone padding (4 above) after the grabber is hidden, so
  the mark is 4 from the popover's top and 16 from its side (`.sheet-ctx`, `globals.css`). The spec's
  popover has 16 padding all round. Read from the code and the screenshot; not measured in a browser.
- **The drawing's:** the name stood 64 from the panel's edge and the rows' labels 62. Icon to label
  is now 14 (was 12) and the dividers start at 48 (was 46), so both stand at 64. The name and the
  post number are 36 tall together (they were 40 in the mock, which put the mark 18 from the top).
- The build's row has the icon 12 in and a 14 gap (labels at 62 too); the drawing's is 14 in and 14.
- Owner, asked "Commit and send the text spacing and both menu fixes?": "Commit and send".
- **Mine.** It applies to every ⋯ sheet (a post, a grid tile, an artist row, a
  suggestion), on a phone too.

## 2026-11-27 — Built: text spacing C, the date menu's Custom part, the ⋯ menu's labels
- Owner: "Merge, then build" (the three fixes above).
- **Text spacing (C), per face, where the faces are set (`globals.css`):** Fredoka rules get
  word-spacing 0.08 em and letter-spacing normal; system and mono rules word-spacing normal; 13 px
  system text (Footnote and Tag) letter-spacing −0.02 em, through `--ls-footnote` on `:root` so a
  Fredoka rule at 13 px sets it back to normal. **Mine:** the declarations were added to the rules by
  a script once, then checked by hand; nothing at run time tags elements.
- **Mine:** `e2e/text-spacing.spec.ts` walks Following, results, the ⋯ and date menus, the post
  page, the viewer with Post info, Settings, Artists and For You at 390 and 1280 wide, and fails on
  any element whose spacing doesn't match its face. 0 found.
- **The date menu:** a line 16 in from the menu's sides, 8 below the last row and 12 above the
  segments; the number field 72 wide (was 88). Segments hug their words (`Seg hug`, 14 for the kinds,
  8 for the units) and the capsule is measured to the chosen button, so it takes that one's width.
  The spare width is shared, so the words stand 15 and 9 in at 390 wide.
- **The ⋯ menu:** the rows' icons 14 in, labels at 64 like the name, dividers from 48; as a popover
  the context line has 16 above, so the mark is 16 from the top. On a phone the grabber's space stays.
- **Mine:** `e2e/menu-spacing.spec.ts` checks these numbers at 390 and 1280.

## 2026-11-27 — Built: a post link's preview
- Owner: "Build link previews". From DESIGN.md "A post on its own", "The link's preview".
- **How a link gets its preview (the builder's question, answered):** `/post/<number>` now has
  `generateMetadata` (`src/app/post/[id]/page.tsx`). The server asks e621 for the post, signed out
  (it never has anyone's key), naming the app in its User-Agent and no person, with a 3 s limit; a
  found post is kept ten minutes in the server's memory (a failure, or Cloudflare's challenge page
  coming back as HTML, is not kept). A chat app's crawler gets the tags in the page's head; a browser
  gets the page at once and the tags stream in after (Next's own split), so the post page is no slower.
  **Mine:** Next's crawler list lacks Telegram, Bluesky, Mastodon, Matrix and Signal, so
  `htmlLimitedBots` in `next.config.ts` is Next's list plus those.
- **The tags:** site "eLicks21"; title "<artist> on eLicks21" (the first real artist; none: "Post #…
  on eLicks21"); "Post #… on e621 · 1.2K score · 56 favorites" (the app's short numbers); the post's
  sample picture whatever its rating (owner: "Picture"), a video's still. Twitter's large card too.
  **Mine:** a picture chat apps refuse (under 300 wide, or a no-sample original over 5 MB) gives way to
  the thumbnail if that is 300 wide, else to the drawn card.
  **Mine:** no page title: the shell changes screens without a page load, so the tab would keep the
  artist's name on every screen after; the tab stays "eLicks21". A post e621 can't find, or a slow or
  failed ask, keeps the site's own preview.
- **The drawn card** (`/post/<number>/card`, 1200 by 630) for a post e621 hides from signed-out
  visitors: Panel Navy, the artist's mark on its raised disc (200), the name in Fredoka 600 (76), "#… ·
  Explicit" in Muted (40), the wordmark at the bottom right (44). **Mine:** the sizes, and Fredoka is
  fetched by the server from Google Fonts once per server (no visitor's data in the ask); without it
  the card uses the renderer's own face. If e621 doesn't answer when the card is asked for, it is
  drawn with the number only, never a broken picture; a card drawn short is kept 5 minutes, a full one
  a day.
- A fresh code review (owner: run one before every draft) found 7 things; all fixed: a type error that
  would have failed the build, the card's 404 when e621 hiccups, a day's cache on a short card, the
  missing chat crawlers, the site address behind a proxy, the challenge page being cached, and pictures
  chat apps refuse.
- Checked on the dev server with a Safe post: the crawler's tags and the card as drawn. **Not checked:**
  whether e621 answers Vercel's servers (it answered this computer), and the preview in a real chat app
  after deploying.
- Tests: `src/lib/e621/__tests__/preview.test.ts` (the tags, the card for a hidden post, the ask, the
  card's size). The e2e suite's post pages now make the dev server ask e621 for made-up numbers; those
  come back empty and change nothing on screen.

## 2026-11-27 — The post's bar opens the post; the name and the mark open the artist
- Owner, relayed by the builder (I did not hear it from the owner): "Unless we tap artist's name,
  tapping the post's bar should open the post, not the artist page now".
- Built first, on `main` as `8d957a7` (pull request 37, by its title; I did not test it). The mark
  opening the artist is the builder's call; the design keeps it.
- **Mine:** the targets. The name's is its text and 6 at each side, at least 44 wide and 28 tall. It is
  under 44 tall because the time and number line under it belongs to the post. A tap meant for the name
  can land on that line and open the post; Back returns. The owner has been told.
- The mock's "Getting to it" row said the header opens the artist; it now says the bar opens the post.

## 2026-11-27 — Post info shows the description
- Owner, relayed by the builder: "hitting I on a post doesn't show its description".
- Built first (`8d957a7`): a "Description" part under the stat wells and the "For you because" line,
  above the tags.
- **Mine:** the label is a tag kind's label; the text stops at 4 lines with "Show all". The build
  shows all of it. Not yet approved by the owner.

## 2026-11-27 — A screen's ⋯ menu gets a drawing: a dropdown, like a chip's
- Owner, with two screenshots of the build on a computer (For You's and Following's ⋯ menus): "This
  menu may also need some spacing help".
- **The design's fault:** this menu was never drawn. UX.md lists its rows only. The build made it from
  a titled sheet and control rows with 32 icon wells.
- Measured from the screenshots, halved from 2x: the popover is 300 wide; the title is 16 from the
  left; a row's wash is 48 tall, 8 from the sides and 20 from the bottom. The popover's left edge
  lines up with the ⋯, so it hangs to the right of the capsule.
- **First drawing (mine, withdrawn):** a title, then a Well group of 52 rows, as in a post's ⋯.
  Owner, of the phone version: "The border radius and item alignment here seem rough and out of place
  with our other screens, is that right?" It was. The title stood at 16 and the icons at 30, and a 16
  well sat 16 inside a 24 panel, so the corners did not run parallel.
- **Drawn now (mine):** the chip's dropdown, on a phone and on a computer. The Panel with 4 above and
  below and 16 at the sides, 260 wide, no title; rows 56 tall with a 32 icon well, as Media's. The
  wash is 8 from the panel on three sides with a 16 radius (24 − 8). A row that cannot be used now is
  at 45%. The build keeps its rows; it loses the title and takes the dropdown's padding.
- **Changed with it (mine):** a ⋯ lines up its popover's right edge, not its left. The popover rule
  was approved on the check list with left edges; the owner has been told of the change.
- Measured in the mock: 260 by 120 with two rows, 64 with one; 8 under the capsule.

## 2026-11-27 — For You marks its tags; a well copies a post's link (owner: "Tags + Left")
- Owner: "Would also love to explore designing, in the for you feed items, showing somehow the tags
  this is related to in their tuning, like we do in the info page. Also maybe exploring having another
  button on the bottom of feed items that copies its link for you".
- Drawn with a switch each. Tags: Marked tags, A line, Off. Copy link: Left, By the heart, Off.
- Owner, asked "Which do you pick for the two ideas on a post?": "Tags + Left".
- **Marked tags.** On a For You post the tags Post info's "For you because" line names stand first in
  the tag row, each with a 12 spark in Link Blue. The post's height does not change (579 in the mock,
  with or without). A line would have added 26.
- **Left.** A Well 36 by 28 at the left end of the footer, 8 before the comic's well. A tap copies
  `/post/<number>`, shows a check for 1.4 s and the toast "Link copied".
- **Mine:** every measurement, the check, the failure toast "Couldn't copy the link", and that the
  well is on a post in every feed and on the post page.
- Not built. Nobody has tried the copy on a phone.

## 2026-11-27 — Built: the post's bar, the description's 4 lines, Copy link, For You's marked tags, a screen's ⋯ as a dropdown
- From the design commit 3507b7d (owner: "Commit and send" to all five), on "Merge, then build".
- **The bar:** the name's target is its text and 6 at each side, at least 44 wide, from the panel's top
  to the bottom of the name line (28). Pressed or under the pointer, the bar's post part turns the time
  and number line white. On the post page the card has no bar button at all, so that part does nothing.
- **Post info's description:** 4 lines with an ellipsis (a line clamp across DText's paragraphs, which
  stay 8 apart), then "Show all" 4 below (28 tall, a 44 touch area), shown only when the text is cut.
- **Copy link:** a 36 by 28 Well at the footer's left end, on every card (feeds and the post page). It
  copies `<origin>/post/<number>`; the glyph is a green check for 1.4 s, toast "Link copied"; if the
  clipboard refuses, "Couldn't copy the link" with the alert glyph. **Mine:** no fallback prompt here
  (Share post keeps its own).
- **For You's marked tags:** the tags Post info's "For you because" line names (the post's two
  strongest positive weights, now one helper, `pickedFor`) lead the tag row with a 12 spark, 8 in and 4
  before the word; accessible name ends ", For You picked this". **Mine:** an artist tag among them is
  not added to the row, since the artist is in the bar.
- **A screen's ⋯ menu** (Following, For You) is the chip's dropdown, 260 wide, no title, hung 8 under
  the tools capsule with right edges lined up, on a phone too. **Every popover a ⋯ opens** lines up
  right edges: a ⋯ in a tools capsule with the capsule, a post's ⋯ with itself (`data-pop-end` on each
  ⋯; `popEdge` in `src/shell/opener.ts`).
- Tests: `e2e/post-more.spec.ts` (all five, phone and computer); the desktop ⋯ tests now expect the
  dropdown and the capsule's right edge.
- **Mine, for the budget:** the first full run put the feed's first load at 200.1 KB (over 200). The
  link, check and spark glyphs on the card are lucide's own paths drawn as CSS masks instead of icon
  components; the failed copy uses the toast's own alert icon.
- A fresh code review (owner: one before every draft) found 7 small things. Fixed: Tab onto a link
  past the 4th line opens the whole description; the description's state resets per post; it checks
  again once fonts load; a ⋯'s right-edge lining is taken when pressed; a dropdown with every row
  disabled holds focus itself. Left: a picked artist tag isn't marked on the card (it isn't in the
  row), and a very short name's target is the spec's 44 wide.
## 2026-11-27 — The post page's title row; a row's value drops the chip's menu
- Owner, with two screenshots of the build on a computer (the post page's top; Settings' "Quality"
  menu): "Computer post page and settings dropdowns might need some fixes too".
- **The post page.** In the build Back and the tools capsule stand 1 above the panels (measured from
  the screenshot: 2 px at a scale of 1.91). The spec gave no number. The mock had 16 on a computer
  and only 4 on a phone, so the phone drawing was at fault too. Now: 12 under the title row on both,
  which puts the 44 controls 16 above the panel.
- **Kept from the build (mine):** on a computer the title row spans both columns. The drawing had the
  capsule at the end of the 600 column, with an empty corner over the right column.
- **Settings' menus.** The build followed the spec: a titled sheet as a popover, holding the Well
  menu. The spec was the fault. The title repeats the row's label right above it, and the Well's 26
  corners sit 16 inside the panel's 24. Now a row's value drops the chip's menu: no title, the Panel
  is the track, 220 wide, at the row's right end. The row ends in ⌄, not ›.
- **Mine:** all of it. Not yet approved by the owner. Measured in the mock, below.

## 2026-11-27 — Built: the post page's title row; a row's value drops the chip's menu
- From the design commit 8773cd7 (owner: "Commit and send").
- **The post page:** 16 under the title row, on a phone and on a computer, so Back and the tools capsule stand
  16 above the panels. The drawing says 12 under a 52 row. The build's row is the 44 controls themselves,
  so the space is 16 here. On a computer the row already spans both columns, and both columns start level.
- **A row's value:** Quality, Longest video and Load ahead in Settings, and Quality in Quick settings, now
  drop the chip's menu. It has no title, is 220 wide, sits 8 under the row, and its right edge is on the
  row's content edge. The row ends in a muted ⌄ that turns up and white while the menu is open (150 ms, like
  a chip's).
- **Mine:**
  - Transition (Classic only) is the same kind of row, so it drops the same menu.
  - A row low on the page opens its menu 8 above itself when it doesn't fit below and there's more room
    above. It rises 4 instead of dropping 4.
  - Quick settings on a phone: Quality is the sheet's last row, at the screen's foot, so its menu always
    opens above the row. The sheet stays open under it. Esc, Back or a tap outside closes only the menu.
- Not checked on a real phone.
- A fresh code review (owner: one before every draft) found these, now fixed:
  - Focus goes back to the row or chip when a dropdown closes and focus was left nowhere. This was the old
    sheet's gap too.
  - The menu is measured at its own width before it decides between above and below.
  - It opens above only when there's real room there (at least its height, or 160).
  - The ⌄ keeps still under reduced motion.
  - The flip test now sets the row at the window's foot and checks that the menu opened above.
## 2026-11-27 — Switching between the feed and the grid keeps the post you were looking at
- Owner: "When I switch from feed to grid in for you, scroll is out of place in grid."
- **Cause:** the switch kept the page's offset. The grid is far shorter than the feed, so the same
  offset landed far below the post (or at the grid's end). For You and Following show the switch in
  the floating title capsule, so it can be pressed mid-scroll; on Results, Favorites and an artist's
  page it scrolls away with the header, but they share the same list (`FeedView.tsx`), and the fix.
- **Mine:** feed → grid centres the tile of the post in the middle of the view. Grid → feed (the
  switch, not a tile) opens the feed at the middle tile's post (the tile in the middle column of the
  row at the middle of the view), the same way a tapped tile does. At the top of the list nothing
  moves. On a computer it waits for the grid's wider width before placing the tile.
- **Mine:** `e2e/grid-switch.spec.ts`: For You on a computer and a phone, Following, both ways, and
  the top case.
- **Left as it was:** a card the grid opens the feed at (tap or switch) sits 12 below the top of the
  view, so on For You and Following its head is under the floating capsule.
- **Mine, for the budget:** with main's grid fix (PR 40) merged in, the feed's first load came to 200.1 KB.
  The row menu's placement moved out of Dropdown into `src/shell/rowMenu.ts`, which only Settings and the
  player load. The card's sound button draws lucide's volume-2 and volume-x as CSS masks, not icon
  components. First load is now 199.8 KB.

## 2026-11-27 — A deploy reaches an open app
- Owner: "I dunno if I'm seeing the auto updates come through without fully quitting/reopening the app."
- **Why it didn't:** nothing in a running app ever looked for a new version. The worker was only
  registered once, at launch, and the browser's own check comes on a page load (the shell changes
  screens without one) or a day on. Even then it found nothing: `sw.js` is the same file every build,
  only its `?v=<build>` differs, and the browser's check asks for the old `?v=` and compares bytes. So a new version was only found by a page load: a full quit and reopen.
- **Now** (`src/shell/pwa.ts`): the app asks `/version.json` (the build this deploy serves; written once
  per build, `src/app/version.json/route.ts`) each time it comes back to the front (`visibilitychange`,
  window focus, back online), at most once a minute, and every half hour while it stays open. A build
  it doesn't have is registered as `/sw.js?v=<that build>`: the new worker downloads unseen, then
  "New version ready" shows as before (DESIGN.md "A new version"), and Reload takes it and reloads into
  the new build. Cache names, scope and `sw.js` itself are unchanged; `/version.json` is not touched by
  the worker (not a build file, not a page), and holds no one's data.
- **A cold start runs the new version without asking** (DESIGN.md), which it didn't: the new shell came
  from the network, then its own worker downloaded and the toast asked to reload into the build already
  running. Now a waiting worker of this page's own build takes over quietly (no toast, no reload) and
  is handed the chunks loaded so far. **Mine:** a browser tab of the old build left open beside it
  loses the old caches then; its next lazy screen would fail anyway once the host stops serving the old
  files.
- **A launch never puts an older version back:** a page on another build than the worker in charge
  registers its own only when `/version.json` says the site serves it (a newer shell from a cold
  start); an older shell, or no answer, keeps what is there. A version already waiting is kept when the
  page runs it or the active one's build.
- Also fixed: the toast could be missed when the download began before the app started listening; and
  it showed once per app run, so a second deploy before a reload never asked (now once per version).
- **Mine:** half an hour, and once a minute at most on return; an ask with no answer (back from the
  background before the network is up) doesn't count toward the minute.
- A fresh code review (owner: run one before every draft) found 3 things; all fixed: a failed ask
  held off the next one for a minute, a page on an older build could put its version back through the
  new quiet takeover, and the deploy test could flip back after its Reload. Not changed: a new version
  whose download keeps failing is tried again on each return (once a minute at most).
- Tests: `e2e/pwa.spec.ts` (production build): the site starts serving another build, the app comes
  back to the front, the toast shows without a reload, Reload puts the new version in charge and drops
  the old caches, and asking again shows nothing; a cold start on a newer build takes over without a
  toast; a page on an older build than the worker in charge leaves it there. Checked for real: an open page on one build, the server rebuilt and restarted on another,
  the toast on return, and after Reload the page ran the new build's code. **Not checked:** an iPhone's
  home-screen app after a real deploy.

## 2026-11-27 — For You: "Search further" in Tune, off by default
- Owner: "since we extend our search past the top n breadth the feed is a little less tuned. I'd like to
  be able to toggle that functionality (default off)".
- **Change:**
  - Tune has a switch, "Search further", with the line "When your top tags run out, go on with the next ones".
  - Off (the default): the candidate search is round 1 only, the Breadth tags, as before 2026-11-27's rounds.
  - On: up to `SEARCH_TIERS` (3) rounds, as built that day.
  - It is saved with the search settings (`moreTags`). Settings saved before it read as off.
  - Changing it is a new ranking input, like Breadth: For You offers Update ranking instead of re-ranking under you.
  - The old app's Recommended follows the same switch.
- When it is on, Tune lists the next rounds' tags as searched too.
- **Mine:** the name and the line, and that it sits in the group with Filter artists.
- A fresh code review (owner: one before every draft) found these, now fixed:
  - With the switch off, the ranking's inputs read exactly as they did before the switch. A ranking saved by the last build is not offered as stale.
  - The old app's show key carries the switch, so flipping it starts a new show instead of resuming the old one.
  - Tune's Searched group followed round 1 only.
  - The test now checks the Update ranking offer and the second round's tags.

## 2026-11-27 — A row's menu opens above when there is no room below
- The builder, after building the row menu (pull request 42, as the builder reports; I did not test
  it): in Quick settings on a phone "Quality" is the sheet's last row, so a menu cannot drop under it.
  The builder's rule: when the menu does not fit below and there is more room above, it opens 8 above
  the row and rises 4. The same happens to a low row in Settings in a short window.
- **Kept (designer).** Written into DESIGN.md "Menu", "A row's value". Not drawn.
- The builder also gave "Transition" (Classic only) the same menu; it is added to the list.
- The post page: the build's title row is the 44 controls with 16 under them, not a 52 row with 12.
  The result is the same 16 from the controls to the panels, which is what the spec asks for.
- Owner, told of the rule and asked "Keep the builder's open-above rule and commit it?": "Keep and
  commit". The owner has not seen it drawn or built.

## 2026-11-27 — For You: "Taste or popular" in Tune
- Owner, passing on a friend's note: "It's weighted a little more towards high ranking posts than tags,
  compared to mine. That could be a useful slider (tag vs favcount weight), if it's not expensive to have".
  Asked to pick between that slider and two other fixes: "Slider only".
- **Change:**
  - Tune has a slider, "Taste or popular", under Breadth. It sets rank.ts's quality weight, from 0
    (taste only) to 2, in steps of 0.25. The middle, 1, is the even blend For You has used since
    2026-11-25 and stays the default.
  - It reads "Taste only", "Even", or "More taste" / "More popular" with the number (e.g. "More taste ·
    0.75"). The ends are labelled Taste and Popular.
  - It is saved with the search settings as `qualityWeight`. Settings saved before it read as 1; a saved
    value off the slider is clamped to 0–2. The older slideshow screen uses it too.
- **Cost:** moving it re-sorts a finished ranking in memory (`RecommendedQueue.reweigh`), with no new
  e621 searches. The list then starts at the top.
  - A list restored after a reload holds post ids only, so it can't re-sort. When it was ordered by
    another weight (saved with it as `qw`), For You offers Update ranking.
  - A search still running, and a Refresh running in the background, rank with the new weight when
    they end.
  - The scroll to the top waits a frame: the re-sorted list first keeps the card that was in view in
    place (FeedView), which would otherwise pull the page back down.
- **Mine:** the name, the words, the 0–2 range and the step.
- Not changed: the 3 popular pages. The owner asked only for the slider.

## 2026-11-27 — Artists › Suggested picks whom to look up from the artists you don't follow
- Owner: "I don't know that I'm seeing as many populate as I'd expect".
- **Cause:** the lookup of newest posts took the top `RECENCY_TOP` (32) of every artist you favorite
  a lot, followed or not, and only then cut the followed and hidden ones. Someone who follows most of
  their top artists got a handful of suggestions (the test's case: 2 instead of 9), and the 33rd
  artist down never got a turn.
- **Change:**
  - The 32 are picked from the artists you neither follow nor hid (`toLookUp`). That waits for who you
    follow to be known, as the cut already did.
  - The lookup's request count is unchanged: one search per 8 artists (at most 4), plus up to 8
    single looks for those a batch's page left out.
  - The score formula is unchanged.
  - Following or hiding someone within the hour still re-cuts the kept lookup, without asking e621
    again. A card you follow from Suggested stays in place, as before. The list is shorter by one
    until the next lookup (an hour on).
  - The other way round: someone the lookup left out because you followed or hid them then, and now
    don't (an unfollow, Show in Settings › For You), joins the list when the lookup would have picked
    them (`rejoiners`). Each gets one small search of their own (3 posts), once per lookup, one at a
    time, at most 8 per lookup; past that they wait for the next lookup, which picks them anyway. Undo on Not
    interested or on a follow needs none: they were looked up.
  - Follow from favorites (`LIST_TOP` 30, `PICKED` 10) and "N artists you favorite a lot" read the
    same list, so both now count the artists you can still follow.
  - "No one new to suggest" versus "Not enough favorites yet" now reads how many artists you favorite
    a lot (`found`), since the looked-up list no longer holds the ones you follow.
- **Rejected:**
  - Raising `RECENCY_TOP`: more requests, and it still runs out for someone who follows more.
  - Spares, or looking up the next 8 lazily as the list shrinks: either adds requests or slots new
    cards into a list you are reading. The hourly lookup refills it.
- A fresh code review (owner: one before every draft) found these, now fixed:
  - Following everyone you favorite a lot said "Not enough favorites yet".
  - An unfollow within the hour didn't bring the artist back (before, they were in the lookup).
  - Two quick Shows lost the second one; a Show after the hour sent a wasted search.
  - A second review: those single searches are capped at 8 per lookup (unfollowing many at once,
    or on another device, would have sent one each), and a failed one no longer stops the rest.

## 2026-11-27 — Rows: a glyph's pull is its own; a divider stops at the content edge
- Owner, with a screenshot of Settings' App rows on a computer: "We should reinvestigate the spacing
  on these types of components, right icon seems too far right and line shouldn't extend all the way
  through".
- Measured in the mock, every row in every group, sheet and dropdown: what ends a row stands 16 from
  the panel's edge, with two exceptions. The external-link glyph's ink stood 12.3 from it, because it
  took the chevron's pull of 5 and its own empty margin is 1. The ⌄ I added for menu rows stood 14.2
  (its margin is 3). The build matched the drawing (12 in the screenshot), so the fault was the
  drawing's.
- **Fixed (mine):** › is pulled 5, ⌄ 3, the external-link glyph 1. All three now end 16.2 from the edge.
- **The line.** The spec had it run from the text to the panel's right edge. Now it stops 16 before the
  edge, where the row's content stops; in a ⋯ menu's well, 14 before. Rows on a sheet or in a
  dropdown already stopped there. No divider touches a panel's edge anywhere now.
- Not changed: where a line starts (at the text), row heights, the 16 at each side.

## 2026-11-27 — Built: a row's end glyph at 16, dividers stop at the content edge
- Owner, on the designer's rows fix: "Commit and send".
- **Built:**
  - ⌄ (a row whose value drops a menu) is pulled 3, not 4.
  - The external-link glyph (Source code, Made by, Telegram rows, the post page's e621 row) gets its own
    `row-ext`, pulled 1, not the chevron's 5. All three glyphs' ink now ends 16 from the panel's edge.
  - A divider in a group stops 16 before the panel's right edge; in a ⋯ menu's well, 14.
  - Rows on a sheet (`sheet-rows`) and in a dropdown are unchanged, as specified. That includes
    Follow from favorites: a group in a sheet whose rows have no side padding, so its line still runs
    to the sheet body's edge (the mock's `.qrows6` case).
  - **Left alone (mine):** the search field's suggestions (`.suggest`) still run their line to the
    panel's edge. The mock has no rule for them; for the designer to say.
- e2e "Rows: a row's end glyph's ink…" measures the drawn ink of each glyph, not its box. The Follow
  from favorites test checks its line still runs to the edge.

## The blacklist box suggests e621's tags (owner, 2026-11-27)

- Settings › Content's "Tags to hide" box is now the same `TagInput` as Search: after 250 ms it asks
  e621's autocomplete (anonymously) for the word under the caret, with its `-`/`~` kept. Metatags
  (`rating:e`) and words with `(` aren't asked about.
- **Mine:** it keeps its own look: no search icon, `type="text"`, `enterKeyHint="done"`, clear button
  "Clear Tags to hide". The list is Search's list, 8 below the box.
- **Mine:** Enter with the list open picks the highlighted tag (as in Search); Enter with none open
  adds the line. So typing `wolf` and pressing Enter twice adds the top suggestion, not `wolf`;
  Escape first keeps what you typed.
- From review: an IME's confirming Enter no longer picks a tag (Search too), and the box sets
  `autoComplete="off"` so the browser's own list doesn't cover ours.

## 2026-11-27 — Artists › Suggested loads more at the bottom, then says that's everyone
- Owner: "When we scroll to the bottom it should load in more suggestions or say that it's out".
- **Change:**
  - Near the bottom of Suggested (800 before it), the next `RECENCY_TOP` (32) artists you favorite a
    lot and neither follow nor hid are looked up and added below. It costs the same as the first look:
    one search per 8 artists, plus up to 8 single looks.
  - Each page is ranked with recency on its own and added after the last, so the cards you've passed
    don't move. An artist who rejoins (an unfollow, Show) goes on the page their rank falls in.
  - Nobody left: the feed's end moment, "That's everyone", with "You've seen every artist you favorite
    a lot. Favorite more and check back." A list that holds everyone from the start shows it at once,
    without a request.
  - A failed look: the feed's last row, "Couldn't look up more artists" with Try again. The cards
    stay.
  - The pages are kept with the first look's hour; the next lookup starts again at page one.
- **Mine:** the words of the end and the failed row; a spinner while it looks.
- **Rejected:** a "Show more" button (the owner asked for the scroll); ranking every page together
  (new cards would land among the ones you've read).
- A fresh code review (owner: one before every draft) found these, now fixed:
  - A More still running across Try again, a refresh or another sign-in blocked the next one without
    a word. Now it is dropped with the lookup it was for, and the foot asks again on every re-cut.
  - A More that landed during the hour's fresh lookup showed the old list for a moment.
  - Every card gone (followed or hidden) with more to look up said "No one new to suggest". Now the
    foot asks for the next ones.
  - The tests: later artists now posted more recently, so ranking all pages together would fail the
    "cards stay put" check; the failed More checks it isn't asked again until Try again.

## 2026-11-27 — Built: comics (e621 pools)
- Owner, asked about a post that is a comic's page: "Build it". Built from DESIGN.md "A post on its
  own", "A comic", and the mock's comic screens.
- **Built:**
  - A feed card whose post is a comic's page has the well at the left of its footer, after Copy link:
    the pages glyph and "3 / 5". It opens the viewer on that page. Cards that appear together share one
    request for their pools, not one each.
  - The viewer on a comic's page: "3 / 5" at the top, the comic bar above the artist row, a sideways
    drag turns the page. The first and last pages hold back when dragged past. On a computer, two glass
    buttons at the sides and the arrow keys turn it too. Back still closes the viewer, however many
    pages were turned.
  - The comic bar opens the Pages sheet: every page as a thumb, the current one ringed, "Last page
    <when>", and "Open as a feed".
  - The post page has the comic's group right after the post: its name and page, then a strip of
    every page. The row opens the comic as a feed; a thumb opens that page's post.
- **Picked by me:**
  - Only e621's "series" pools are comics. A "collection" pool (somebody's set of favorites, say) gets
    nothing.
  - Up to 500 pages are fetched, 100 to a request; the first hundred go out as on-screen asks, the
    rest wait behind them. A longer comic's strip and sheet stop at 500.
  - "Open as a feed" is the pool's own page order. e621 can't sort a search by page, so the feed is
    the pool's list of posts, fetched in order, with your ratings and your blacklist applied.
  - A key press or tap while a page is turning (320 ms) is dropped, not queued.
  - A turn goes past a page it can't show: deleted, hidden from you by e621, or on your blacklist (unless
    you chose to see it once). Page numbers stay the pool's. A skipped page isn't fetched ahead.
    Turning waits until the pages are known (a fraction of a second), so it never lands on one first.
  - The comic as a feed has only the Media chip. Its order is the pages', so sort, date, score and
    hide-favorites don't apply.
  - A failed ask for a comic's pools or pages waits 30 s before it goes again.
- Not built: a comic's own page (the e621 pool page), reading a comic in the slideshow.
