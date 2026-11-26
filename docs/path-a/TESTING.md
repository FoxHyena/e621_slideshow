# Manual testing (Phase 6, 2026-11-26)

Walked in the built-in browser against the dev server, at phone size (375×812) and on a computer
(1280×800). The browser's profile was already signed in to the owner's e621 account from an earlier
session, so read-only flows ran against real e621. Nothing was written to the account: no Follow,
favorite, blacklist or setting was touched there. Flows that write ran against the e2e mock instead
(`mockE621`). No screenshot from the real account is kept or committed.

Result key: **pass**, **fixed** (found, fixed, retested), **mock** (covered by the e2e mock, not by hand),
**held** (needs the owner; in MORNING.md).

| # | Flow | Phone | Computer | Notes |
|---|---|---|---|---|
| 1 | First run signed out | mock | mock | states-v6, first-run specs |
| 2 | Sign in | mock | mock | The key is never typed here; settings.spec signs in against the mock |
| 3 | Zero follows → Follow from favorites | mock | mock | first-run.spec; the empty Artists state checked by hand with the mock |
| 4 | Following: new posts, caught up | pass | pass | Real account: "All caught up", the cards, Play |
| 5 | Pull to refresh | mock | n/a | following.spec (a touch gesture) |
| 6 | Artists tab: Following, Suggested | fixed | pass | The list was blank for ~8 s while e621 answered behind For You's lookups; now skeleton rows |
| 7 | Artist page: Follow / Unfollow with Undo | pass (read) | pass (read) | Hero, stats, chips, posts; Follow itself only against the mock (artist-page.spec) |
| 8 | Favorite from a card, a tile, the player | mock | mock | Writes: mock only |
| 9 | Hold a tag: targets, blacklist with Undo | mock | mock | Writes: mock only |
| 10 | Play from a feed and back to the post | pass | pass | Play from here on the artist page; Esc returns to that post |
| 11 | Every slideshow style | mock | mock | slideshow.spec styles |
| 12 | Share link (chip, sheet, banner) | pass | pass | `/?v=1&tags=fox+solo&r=s&int=7&style=kenburns` plays, Back to Results with the chip; banner via link-visit.spec |
| 13 | Launch link | pass | pass | `/?tags=wolf+solo` → `/search?l=1…&play=…`, Esc twice lands on Following |
| 14 | Old URLs | mock | mock | nav.spec |
| 15 | Back and Esc everywhere | pass | pass | Edge swipe: nav.spec |
| 16 | Offline | mock | mock | states-v6 offline banner; pwa.spec worker |
| 17 | Install prompt | mock | n/a | pwa.spec; installing on an iPhone is MORNING "Needs you" 3 |
| 18 | Settings | pass | pass | Phone: home and Content. Computer: one page, five sections, Sign out on the account row |
| 19 | Player Post info on a computer | n/a | pass | Panel 360 wide at the right; picture and controls end at 889 |

## break-ui

Captured with the mock at 375, 1000 and 1280: a 68-character artist name, Japanese names, a one-letter
name, a 70-character tag, a 38-character username, 123,456,789 posts, 500 follows and none.

| What | Result |
|---|---|
| Long artist name on a card, an Artists row, the sidebar's account | Truncates with an ellipsis: pass |
| Long artist name on the artist page (phone) | **Fixed:** wrapped to five lines at 34 px; names over 24 characters step down to the section size (20 px) and balance |
| Long tag | Clipped in the tag row, which scrolls: pass |
| Japanese and one-letter names | Pass |
| 123,456,789 posts | "123.5M": pass |
| 500 follows | List and "Following 500" pass. **Fixed:** names sorted "number 10" before "number 2"; now numeric |
| No follows | Goo asleep, "You don't follow anyone yet": pass |

## Console

Only the dev server's HMR socket failing after the server restarted (dev only). No errors from the app.
