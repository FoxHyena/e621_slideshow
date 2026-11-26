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
