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

## Open (asked 2026-11-25)

- **Q1 — Extras for feeds.** P4 group bursts, P5 filter chips, P6 per-artist new dots, P9 snooze artist.
  Recommendation: P4 + P5 + P6. Status: open.
- **Q2 — Polish extras.** P3 heart burst, P7 offline state, P8 share artist, P11 app badge.
  Recommendation: P3 + P7 + P8. P1 (scroll per tab) and P2 (caught-up divider) are planned as baseline.
  P10 haptics dropped: iOS Safari has no web vibration. Status: open.
- **Q3 — Where slideshow settings live.** (a) Quick sheet inside the player (style, speed, fit, mute)
  plus the full list in Settings; (b) only in Settings; (c) only in the player.
  Recommendation: (a). Status: open.
- **Q4 — What a userscript launch link opens.** (a) Start the slideshow straight away, X lands on the
  feed of that search; (b) open the feed of that search with a big Play button; (c) a setting.
  Recommendation: (a), the button says "▶ Slideshow". Status: open.
- **Q5 — Where plain search and Favorites live.** (a) Search button in every tab's header opening a
  search screen (saved + recent), Favorites reachable from For You and from your profile; (b) a fifth
  Search tab; (c) For You becomes "Explore" with a For You / Search / Favs switch.
  Recommendation: (a). Status: open.
- **Q6 — New-since-last-visit marker.** e621ng has `GET /saved_searches/:id/visit.json` that advances
  only the subscription anchor (302 redirect, works with Basic auth, no CSRF). Caveats: it jumps the
  marker to the site's newest post id, and new_count caps at 100. (a) Share it, advance once you scroll
  past the new posts; (b) local marker only. Recommendation: (a). Status: open.
