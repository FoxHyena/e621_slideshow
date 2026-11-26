# Questions for the owner

Format: id — question. Options (recommendation first). Status.

## Peripheral feature brainstorm (Phase 1, ranked by value ÷ effort)

| # | Idea | Value | Effort | Note |
|---|---|---|---|---|
| P1 | Remember scroll position per tab | High | Low | Falls out of the queue registry; arguably not optional |
| P2 | "You're caught up" divider in Following | High | Low | Falls out of the new-post marker |
| P3 | Heart burst on double-tap / favorite | Med | Low | Double-tap to fav already exists; this is the animation |
| P4 | Group bursts: "+11 more from X" when one artist floods Following | High | Med | Keeps a 40-post dump from burying everyone else |
| P5 | Quick filter chips on feeds (rating, images/videos) | Med | Low–Med | One row under the header, per feed |
| P6 | Per-artist "new" dots on the Artists tab | Med | Med | Needs each followed artist's newest post id; derive from loaded Following pages, no extra requests |
| P7 | Offline state ("You're offline, showing what's saved") | Med | Low | Cheap once the service worker exists |
| P8 | Share an artist (Web Share → our artist URL) | Low–Med | Low | |
| P9 | Snooze an artist for 7 days (hide from Following, stay subscribed) | Med | Med | Client-side filter, no tag slots |
| P10 | Haptics on favorite / subscribe | Low | Low | `navigator.vibrate` is Android-only; iOS Safari has no web haptics |
| P11 | App badge with the new-post count (installed PWA) | Low | Low | Badging API; only updates while the app is open |

## Phase 1 (asked and answered 2026-11-25)

- **Q1 — Extras for feeds.** P4 group bursts, P5 filter chips, P6 per-artist new dots, P9 snooze artist.
  Recommendation: P4 + P5 + P6. **Answered:** P4, P5, P6. Chips: drop the rating chip (most people want explicit), keep Images/Videos; asked for more chip ideas (see Q7).
- **Q2 — Polish extras.** P3 heart burst, P7 offline state, P8 share artist, P11 app badge.
  Recommendation: P3 + P7 + P8. P1 (scroll per tab) and P2 (caught-up divider) are planned as baseline.
  P10 haptics dropped: iOS Safari has no web vibration. **Answered:** P3, P7, P8, and "consider other microinteractions; trial some with the Emil animation skills on different components".
- **Q3 — Where slideshow settings live.** (a) Quick sheet inside the player (style, speed, fit, mute)
  plus the full list in Settings; (b) only in Settings; (c) only in the player.
  Recommendation: (a). **Answered:** (a) both.
- **Q4 — What a userscript launch link opens.** (a) Start the slideshow straight away, X lands on the
  feed of that search; (b) open the feed of that search with a big Play button; (c) a setting.
  Recommendation: (a), the button says "▶ Slideshow". **Answered:** (a).
- **Q5 — Where plain search and Favorites live.** (a) Search button in every tab's header opening a
  search screen (saved + recent), Favorites reachable from For You and from your profile; (b) a fifth
  Search tab; (c) For You becomes "Explore" with a For You / Search / Favs switch.
  Recommendation: (a). **Answered:** (a).
- **Q6 — New-since-last-visit marker.** e621ng has `GET /saved_searches/:id/visit.json` that advances
  only the subscription anchor (302 redirect, works with Basic auth, no CSRF). Caveats: it jumps the
  marker to the site's newest post id, and new_count caps at 100. (a) Share it, advance once you scroll
  past the new posts; (b) local marker only. Recommendation: (a). **Answered:** (a).
- **Q7 — More feed chips.** Hide favorited, Sort New/Top/Hot, Date Today/Week/Month, Score above 50.
  Recommendation: Hide favorited. **Answered:** all four. (UX must keep the chip row light: see UX.md.)

## Phase 2 sign-off (asked 2026-11-25)

- **Q8 — Moving e621's "seen" marker automatically.** e621 can only move it to its newest post and
  never back. (a) Auto: after you scroll a screen past "You're caught up" with no filters on, with a
  "Marked as seen on e621" toast; plus ⋯ › Mark all as seen. (b) Manual only: ⋯ › Mark all as seen.
  Recommendation: (a). **Answered:** (a) automatic.
- **Q9 — UX sign-off** on the wireframe page. **Answered: almost.** Do a research pass on spacing and
  visual hierarchy (what makes app spacing good and consistent), use tokenized values throughout. Specific
  notes: the card's artist avatar and the ⋯ icon feel too far right / unevenly placed; the artist
  suggestion tiles look janky. Research well-reviewed component libraries and indie designers' work for
  inspiration; run research subagents that write findings to disk. Then re-ask sign-off.
  **Follow-up (owner):** spacing/visual feedback can move to visual design; UX-wise it's okay. Change:
  "Artists you might like" shows one artist at a time with a few tiled recent posts, as part of each
  artist row section. → **UX signed off** with that change (UX.md v3.2).
