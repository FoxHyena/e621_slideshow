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
