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
