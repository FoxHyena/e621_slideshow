# Reviews

## UX round 1 — 2026-11-25

Reviewer: fresh general-purpose subagent briefed as a picky senior mobile UX designer. Input: UX.md v1,
README, docs/screenshots only. 30 findings (3 blocker, 16 major, 10 minor, 1 nit).

| # | Sev | Finding (short) | Outcome |
|---|---|---|---|
| 1 | blocker | Tab switches pushing history → Back rewinds tabs, not iOS-like | **Changed.** One stack: tab switch resets history to `[/following, <tab root>]`; pushed screens stack on top. Back at a non-home tab root → Following; at Following → leaves. **Declined** per-tab parallel stacks: one browser history can't hold them; tapping a tab returns to its root (cached screens restore instantly if revisited). |
| 2 | blocker | `?play=` reload/restore undefined; per-slide history unclear | **Changed.** Slides `replaceState` `?play=`. Reload: rebuild the feed, find the id; if missing, fetch that one post, play from it, toast "Couldn't restore your place". For You's ranked id list persisted in sessionStorage. |
| 3 | blocker | Tag strip vs edge swipe, callout, scroll fights | **Changed:** strip CSS (`overscroll-behavior-x: contain`, non-scrolling 16 px start gutter, no callout/selection, `touch-action: pan-x`). Long-press shows targets that stay open to tap (already how a tap works). **Declined** removing drag: it's shipped and on the must-not-regress list. |
| 4 | major | Swipe-to-unfollow hidden and inconsistent with artist page | **Changed.** No swipe. Row ⋯ → Unfollow; artist page tap "Following" → unfollows; both with Undo toast. |
| 5 | major | Scroll model / PTR vs Safari unspecified; second-tap refresh hidden | **Changed.** Document scroll (Safari bars still collapse), `overscroll-behavior-y: none` on html, custom PTR spec'd (threshold, cancel). Dropped second-tap refresh; ⋯ menu has Refresh. To verify on device in slice 1. |
| 6 | major | Marker advance by flick loses the inbox | **Changed.** Advance only after the divider has been above the header for 1.5 s while idle; the "new" set stays stable for the session. No "Unmark": e621 has no route to move it back. |
| 7 | major | Insert-on-PTR vs pill inconsistent | **Changed.** One rule: posts insert only on PTR or pill tap; explicit anchoring (Safari has no `overflow-anchor`). |
| 8 | major | Feed video behaviour / tap vs double-tap | **Changed.** Single tap on video = play/pause (after 250 ms double-tap guard); image single tap = nothing; one live `<video>`, posters elsewhere; mute button; low-power fallback. |
| 9 | major | Player icons out of thumb reach; edge-swipe exits | **Changed.** Bottom action rail; ✕ top-left + swipe down; swipes starting within 24 px of an edge left to the OS. |
| 10 | major | Feed/player scroll sync fragile; shared-element transition over-built | **Changed.** Player and feed share the post list; close scrolls the card to center first. Shared-element transition cut from v1 (fade). |
| 11 | major | Search ↔ Results history loops | **Changed.** Rule: same-type refinement replaces, going somewhere new pushes. |
| 12 | major | Chips: hidden state, leaking filters, custom date lost | **Changed.** Multi-value chips open a menu; booleans toggle; "Reset" chip when any is active; filters belong to the screen instance (not leaked); Date menu has "Custom…" with the existing date panel. |
| 13 | major | Signed-out app is three sign-in walls; API key journey | **Changed.** Signed-out Following shows a sign-in card above a browsable "Popular today" feed. Sign-in sheet: 3 steps, Paste button, username draft survives tab eviction. |
| 14 | major | Burst rule ambiguous; carousel placement; permanent hide | **Changed.** Exact algorithm; carousel once per session after the divider; "Not interested" undoable in Settings › For You. |
| 15 | major | Artist dots/recency depend on scroll depth | **Changed.** Opening Artists fetches one page of `search:subscriptions` (320 posts) to fill dots and recency; unknowns sorted A–Z below. |
| 16 | major | Offline/optimistic behaviour undefined | **Changed.** Optimistic with rollback + retry toast; player pauses offline instead of skipping; auto-resume. |
| 17 | major | Slide transitions vs Safari snapshot; sheets in history | **Changed.** v1 ships cross-fades; in-app Back button may slide, gesture back never animates (`hasUAVisualTransition`). Sheets don't touch history. |
| 18 | major | For You PTR / Tune / chips trigger costly re-ranks | **Changed.** "Ranked 3 min ago" in header; PTR re-ranks only if older than 10 min; Tune changes show an "Apply changes" pill; chip changes debounce 600 ms. |
| 19 | major | Installed PWA has no browser Back; Settings sub-pages not in IA | **Changed.** Back button on every pushed screen; standalone edge-swipe back as a later slice; `/settings/<section>` routes. |
| 20 | minor | Too much chrome; blur jank | **Changed.** Compact 44 px bar after scroll; chips hide on scroll down, return on scroll up; opaque bar fallback. |
| 21 | minor | Multi-artist posts, non-artist tags, long names | **Changed.** First artist + "+2" → picker; non-artist tags stripped; ellipsis; 44 px targets. |
| 22 | minor | Card action misfires | **Changed.** 44 px targets, ≥8 px gaps; Open on e621 moves into ⋯ with Share post / Play from here. |
| 23 | minor | Follow pill reflow, no undo | **Changed.** Pill turns into a persistent check; toast with Undo; cap/failure toasts. |
| 24 | minor | Play entry points scattered | **Changed.** Floating Play pill on every feed (from top / from here). |
| 25 | minor | Quick settings vs link visits; timer while open | **Changed.** Opening pauses; link visits get "This visit only / Save as default". |
| 26 | minor | Do artist/search work signed out? | **Changed.** Stated: yes. OG previews out of scope. |
| 27 | minor | A11y gaps | **Changed.** §8 rewritten as testable requirements. |
| 28 | minor | For You header crowded; Favorites discoverability | **Changed.** Favorites moved to Search screen + Settings › Account; For You header: Tune + ⋯. |
| 29 | minor | Memory on iOS with many live screens | **Changed.** Hidden screens keep data, not DOM beyond a window; anchors (post id + offset) in sessionStorage. |
| 30 | nit | Cuts; "since yesterday" copy | **Changed.** Cut: shared-element transition, "because" line on cards, confetti, sort long-press, 5-min polling (visibility only). One mascot, 3 poses. Kept desktop keys and saved-search ★ (existing features). Copy: "12 new". |

## UX round 2 — 2026-11-25

Reviewer: fresh general-purpose subagent, same brief and inputs (UX.md v2). 25 findings (1 blocker,
13 major, 10 minor, 1 nit). "Material issues remaining: yes" → UX.md v3, then round 3.

| # | Sev | Finding (short) | Outcome |
|---|---|---|---|
| 1 | blocker | Back/✕ dead on pasted or shared URLs and reloads | **Changed.** One Back helper with `history.state.depth`; no in-app entry → replace with the parent. Tab-tap popping uses it too. |
| 2 | major | Marker advance ignores filters, bursts, player | **Changed.** Advance only with no filters on, divider dwell or player past the last new post, and a 1-post check that nothing newer is unloaded. Collapsed bursts count as seen (the row was shown). e621 can't set an arbitrary id or move back (`permitted_params` = query, name, is_tracked), so "Mark all as seen" confirms instead of offering Undo. |
| 3 | major | Launch-link ratings vs global ratings | **Changed.** Per-link filter table; "From a link" chip with "Use my settings". |
| 4 | major | iOS links open Safari, not the PWA; separate storage | **Changed.** "Not signed in on this browser" strip; explained in Settings › App. |
| 5 | major | sessionStorage wiped when iOS kills the PWA | **Changed.** Anchors and For You ranking in localStorage with TTLs; missing anchor → nearest older post. |
| 6 | major | Back with a sheet open closes two layers | **Changed** (reverses round 1 #17): sheets push a same-URL entry; Back closes only the sheet. |
| 7 | major | Standalone edge-swipe back deferred | **Changed.** Ships with the routing slice; tab bar visible on pushed screens. |
| 8 | major | Avatar source unspecified, explicit leak risk | **Changed.** Stated: generated kaleidoscope avatars only, never post art. |
| 9 | major | Regressions: GIFs, sort options, custom date/score, saved search contents, loop | **Changed.** Media has GIFs; Sort "More"; Custom date and score; saved = tags + filters + ratings; loop per setting; mapping table of old settings. |
| 10 | major | Artists dots vs frozen threshold; when dots clear | **Changed.** Same session threshold; clears when the artist page opens; "40+ new". |
| 11 | major | No way to view an image big; zoom vs swipes | **Changed.** Single tap image → player paused (viewer). Pinch zoom; zoomed disables swipes; axis lock. |
| 12 | major | Bottom collisions; tab bar on pushed screens; keyboard | **Changed.** Bottom stack order; tab bar hidden on Search and player only; `visualViewport`. |
| 13 | major | iOS won't raise the keyboard on async focus | **Changed.** Focus inside the tap handler; fallback stated. |
| 14 | major | Favoriting with Hide favorited removes the anchor | **Changed.** Posts stay until refresh; close falls back to nearest older. |
| 15 | minor | Reset chip offscreen; menus out of reach | **Changed.** Reset first; "Filters are on" in empty state; bottom sheets on phone. |
| 16 | minor | Tap on the ✓ after following undefined | **Changed.** Unfollows with toast + Undo. |
| 17 | minor | Hold vs strip scroll; target placement; blacklist scope | **Changed.** 10 px cancel, strip locks while held, targets above the finger, local blacklist stated. |
| 18 | minor | Double-tap zoom; signed-out heart | **Changed.** `touch-action: manipulation`; sign-in then carries out the action. |
| 19 | minor | Grid behaviour undefined | **Changed.** Grid view section. |
| 20 | minor | Two searches on Artists; settings IA mismatch; Favorites depth | **Changed** label "Filter your artists"; IA lists 5 sub-pages. **Declined** another Favorites entry: Search (one tap from every header) + Account is enough, and the For You header was decluttered in round 1. |
| 21 | minor | PTR threshold ambiguous; non-passive listeners | **Changed.** 144 px finger / 72 px visual; axis lock; listener only during a top-start touch. |
| 22 | minor | Reduced motion vs player styles; VoiceOver auto-hide | **Changed** reduced-motion defaults. **Declined** VoiceOver detection (not detectable on the web); controls stay while paused or focused. |
| 23 | minor | Safari may skip history inserted on load | **Changed.** Verify in slice 1; Back helper covers it. |
| 24 | minor | iOS memory | **Changed.** Unmount cards outside ±2 screens. |
| 25 | nit | Three surfaces for suggestions; slice load | **Accepted for Phase 4/5 ordering:** follow-from-favorites + Suggested first; inline card and bursts in a later slice. |

## UX round 3 — 2026-11-25

Reviewer: fresh general-purpose subagent, walked 6 flows over UX.md v3. 15 findings (13 major/minor, 1 nit
on over-building). "Material issues remaining: yes", driven mainly by #3–4 (auto-moving a shared,
irreversible marker), which is now an owner question (Q8). UX.md → v3.1.

| # | Sev | Finding (short) | Outcome |
|---|---|---|---|
| 1 | major | iPhone launch link plays without blacklist; strip hidden behind player | **Changed.** Notice over the player for 4 s, then strip; sign-in pauses and resumes. |
| 2 | major | Missing `depth` after reload with a sheet | **Changed.** No depth = root; helper never goes back from it. |
| 3 | major | Player path skips marker rules | **Changed.** Same rules from the player. |
| 4 | major | Auto-moving the shared marker is irreversible and silent | **Changed:** one screen past the divider + dwell, toast "Marked as seen on e621". **Asked owner (Q8):** auto vs manual only. |
| 5 | major | Standalone Back at Following root | **Changed.** Edge swipe does nothing there. |
| 6 | major | Player edge swipe vs previous; double pops | **Changed.** Edge (24 px) only closes the player; helper ignores re-entry. |
| 7 | major | 250 ms tap delay on images | **Changed** to 200 ms, media only. Kept double-tap favorite (existing feature). |
| 8 | major | Safari native PTR / gestures reaching the document under overlays | **Changed.** Scroll lock under player and sheets; `overscroll-behavior` verified on device in slice 1. |
| 9 | major | Pasted `/artist` then browser Back leaves the app | **Changed.** `/following` inserted under any pushed screen landed on directly. |
| 10 | minor | Double favorites read; two different skips | **Changed.** One shared read; one "Skip for now" → banner. |
| 11 | minor | Two For You pills | **Changed.** One "Update ranking" pill; one top pill at a time. |
| 12 | minor | Grid long-press callout | **Changed.** Same no-callout rules. |
| 13 | minor | Hidden Play pill; overlap with ♥ row | **Changed.** ⋯ always has Play; bottom padding. |
| 14 | minor | "More in Settings" from inside the player | **Changed.** Closes the player, then pushes `/settings/slideshow`. |
| 15 | nit | Memory model too heavy | **Changed.** Keep tabs + current stack; rebuild others from anchors. |

## Design review round 1 — v4 mocks (fresh senior-designer subagent, 2026-11-25)

Rendered at 1:1 with Playwright; screenshots in the session scratchpad (not committed).

| # | Finding | Sev | Outcome (v5) |
|---|---|---|---|
| 1 | Play pill and tab bar cover the first post's metadata at rest; toast and pill share a slot; "Play" clashes with the video ▶ | High | Fixed: Play pill hides on scroll-down and returns on scroll-up/idle; toast replaces it in the same slot; scroll padding 156; label "Play 12" (plays the new posts). |
| 2 | Gold fill on 4–6 objects per screen; artist names #F2AC08 read as gold | High | Fixed: one gold fill per screen (Play / Play all / Review). Follow = tonal navy pill with gold plus. Selected chip = raised fill + gold ring. Artist names white; e621 artist colour only on tags and the handle. |
| 3 | Post internal gaps ≈ the gap between posts, so grouping is weak | High | Fixed: picture→name 12, name→stats 4, stats→tags 4; 32 between posts. |
| 4 | Tags not tappable at 44, duplicate the artist, "+14" not a control | High | Fixed: one scrolling row of 32 tags with 44 hit, artist tag dropped, "+N" is a button. |
| 5 | Tab bar at 12 vs toast at 16; glass label contrast over bright art ≈3.2:1 | Med | Fixed: all floating chrome at 16; glass alpha .88 on a #0B1F3E base. |
| 6 | Segmented control 32 hit, no button semantics | Med | Fixed: buttons with 44 hit. |
| 7 | UX fidelity: burst shows 2 not 3; suggestions not one-at-a-time and lack Not interested; subtitle ambiguous; Follow toast contradicts UX | Med | Fixed: 3 burst posts; carousel kept as the swipe form of "one artist at a time" (each card is one artist; peek = Next) with ⋯ Not interested; subtitle "You faved 23 of 140 · posted 4d ago"; no toast on Follow (only on unfollow). UX.md note added in Phase 4. |
| 8 | Artist page: no compact header; toast covers thumbs; hero inline override; avatar ring past 16 | Med | Fixed: compact bar shown as a second state; toast removed; hero cleaned; ring inset. |
| 9 | Size-system breaks (28 title, 18 glyph, 6/10/2 spacings, 52 toast, two collage heights, dead CSS) | Med | Fixed: every value mapped to the table; table lists collage and toast sizes. |
| 10 | Suggestion card name truncates at ~15 chars | Med | Fixed: two-line card body (name + ⋯ / subtitle + Follow). |
| 11 | Generic iOS; kaleidoscope gone from the feed | Med | Fixed: 24 kaleidoscope avatar leads the post's name line (gold ring = new); kaleidoscope mark on the caught-up moment and empty states. |
| 12 | Structural clone of AllTrails | Med | Partly: Play pill carries a count; stat row uses coloured icon trophies (Duolingo study). The rest are platform conventions, kept. |
| 13 | Mute control 32 hit, a span | Low | Fixed: 44-hit button. |
| 14 | Artist actions leave dead space; badge duplicates subtitle; new dot colour-only | Low | Fixed: buttons flex:1; badge only when off Following; dot has a "New" label for assistive tech. |
| 15 | "Explicit" on every post is noise; fav pill accessible name | Low | Fixed: rating shown only when it differs from the user's default; aria-label "Favorite, 1.2k". |

## Design review round 2 — v5 mocks (2026-11-25)

Fresh reviewer (general-purpose agent), rendered at 1:1 with Playwright. No P0. Contrast pairs all pass AA. Outcomes in v5.1
(`mocks/direction-a-v5-1.html`).

| # | Finding | Sev | Outcome (v5.1) |
|---|---|---|---|
| 1 | Post anatomy still reads Instagram-like | P1 | Fixed: posts sit in navy panels (owner's v3 pick, e621's post boxes); picture inset 8, radius 8; tags and fav on raised navy. |
| 2 | Artist compact header not shown | P1 | Fixed: added "Artist page, scrolled" phone (glass bar: back, avatar, name, Following). |
| 3 | Gold on ~6 things on Following | P1 | Fixed: avatar ring removed; "12 new" subtitle white. Gold at rest = "New" labels, Play, active tab. |
| 4 | Neon tag colours compete with art | P1 | Kept: tag category colours are the owner's explicit e621 pick. Panels now separate them from the picture. Revisit if the owner agrees. |
| 5 | Play pill over art at rest; peeks under tab bar | P1 | Partly: peek fixed (fades out while scrolling down). Floating position kept: UX v3.2 (signed off) puts it above the tab bar, and it is chrome like the bar. |
| 6 | Stats/tags hit areas overlap | P1 | Fixed: 12 between the stats line and tags. |
| 7 | Settings tiles off-palette; "S Q E" cryptic; empty lower half | P2 | Fixed: one navy tile style; "All ratings · 4 blacklisted tags"; Sign out group. |
| 8 | Player gear = Settings icon; gold twice; chunky bar | P2 | Fixed: sliders icon; 4 px white progress; gold only on pause. |
| 9 | Following pill in player not in UX | P2 | Fixed: removed; name + time instead. |
| 10 | Sign-in: no key-privacy line, no close | P2 | Fixed: "Your key stays in this browser and is only sent to e621."; ✕ close. Error/disabled states go to the build (UX already specifies them). |
| 11 | Chip copy ambiguous | P2 | Kept: "Media" and "Hide favorited" are UX v3.2 labels. |
| 12 | Handle in artist colour; missing chips | P2 | Fixed: handle in link blue, mono; Media, Hide favorited, Sort, Date, Score chips. |
| 13 | Trophy tiles look like buttons | P2 | Fixed: plain coloured icon + number. |
| 14 | Suggested selected; banner repeats cards | P2 | Kept: the phone shows the Suggested state on purpose; the banner is UX's bulk-follow entry. |
| 15 | Burst / caught-up not visible at rest | P2 | Fixed: added "Following, scrolled" phone. |

Round-1 items the reviewer found not landed: #8 compact bar (now landed), #1 pill overlap (see #5), #2 gold count (see #3).

## Plan review round 1 — ENGINEERING.md target (2026-11-25)

Fresh `Plan` subagent given GOAL Phase 4, UX.md, DECISIONS, DESIGN.md and the code; it verified framework
claims in `node_modules` (Next 16.3.8 `app-router.js` history patching, React 19.2.8 `Activity`). All 20
findings accepted; ENGINEERING.md target revised in place.

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Boot built 2 entries, so closing a link's player went home, not to Results | High | 3 entries: /following, Results, `?play=` |
| 2 | Boot would re-run on Back/Forward into an earlier document's entries | High | Rewrite history only when `state.e6` is missing; re-sync on `pageshow` |
| 3 | Follow POST gives no ids for Undo; SWR refetch could clobber optimistic state | High | Per-tag op serialization, ids from `added` or a refetch, generation counter |
| 4 | Head-dropping pages doesn't fit forward-only queues or player indices | High | Slim posts + one 3,000-post global budget, evict hidden feeds first, "Start from the top" |
| 5 | Migration in slice 7 but new prefs keys in slice 1; `/following` didn't exist until slice 3 | High | Migration and an interim home (today's panel) in slice 1 |
| 6 | Opaque redirect can't distinguish success; hidden posts could block marking forever | High | Own fetch path, re-read the anchor to confirm, `maxRawIdSeen` |
| 7 | Scroll lock makes `scrollY` 0, breaking windowing and anchor saves | High | `scroll.ts` owns a locked offset; windowing frozen while locked |
| 8 | Queues mutate in place, so selectors miss updates | Med | Per-feed `version` |
| 9 | Aspect clamp not in DESIGN; no anchor-preserving relayout path | Med | Own aspect (1:2 cap, logged); one `relayout(preserveAnchor)`; CSS-pinned heights + dev check |
| 10 | Push/back fade conflicts with one-visible-screen; focus handling missing | Med | View Transitions API with `flushSync`, instant fallback; `focus.ts` |
| 11 | Next's `HistoryUpdater` and `__NA` edge cases | Med | Added to the slice-1 spike checklist |
| 12 | Sign-in fragment visible to Next's initial `canonicalUrl` | Med | Inline head script strips it before hydration; test that no entry contains `k=` |
| 13 | Signed-in data at rest undecided; no purge; unbounded tile keys | Med | Decision logged: only with Remember, purged on sign-out; `bigStorage` delete/keys/sweep; per-artist keys |
| 14 | Batch recency reorders the list; one artist can starve a batch | Med | Two-pass rank, top 24, `limit=320`, per-artist fallback |
| 15 | SW offline launch missing chunks; thumbnail caching undecided; SW hides requests from mocks | Med | `clients.claim` + cache loaded resources; thumbnails only if CORS; `serviceWorkers: 'block'` |
| 16 | Back-helper lock could stick with no popstate | Med | 400 ms timeout + re-sync |
| 17 | Lane priorities starve; per-feed 429 handling; AbortError as error | Med | Aging, lane-wide 5 s pause, AbortError is a no-op |
| 18 | Fav count double-counts; out-of-order rollback | Low | `fav_count + (faved − is_favorited)`, per-post serialization, 422 = success |
| 19 | Link filters lost on reload; ratings rule contradictory | Low | Filters in the Results URL; ratings in the key, blacklist via `setRules` |
| 20 | Edge swipe slice; JS budget measurement; font dep; no CSP | Low | Slice 1; Lighthouse; `next/font/google`; CSP in slice 8 |

Not verifiable without runtime or live e621 (carried into the slice-1 spike and slice-3 live check):
RSC requests on restore, rapid-transition batching, iOS Safari scroll/toolbar/history behaviour, e621 CORS
on `visit.json`, the `tag_subscriptions` POST body, `static1` CORS, Playwright + SW interception.

## Slice 1 code review (2026-11-25)

Two passes over the uncommitted slice: the `code-review` skill at high effort (in-session), and a fresh
`general-purpose` reviewer given only the diff, ENGINEERING.md §0–2, §8, §11 and UX §3. All gates re-run
after the fixes: typecheck, lint, 174 unit tests, 86 e2e.

**code-review (high), 6 findings, all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Hiding the legacy home in `<Activity>` ran its effect cleanups, disposing the running show's queue for good | High | Legacy home kept mounted, hidden with `hidden`; e2e for a tab round-trip |
| 2 | Boot put only `/following` under a pasted page, so Back from `/settings/content` skipped Settings | High | Boot walks `parentOf`; unit + e2e |
| 3 | Concurrent tab taps (or a tap during Back) raced pending pops | High | `goTab` serialized; push/replace ignored while a Back lands |
| 4 | Tab re-tap and offsets used `window` scroll, but screens scroll in their own box | Med | Offsets and scroll-to-top act on the screen element |
| 5 | Focus openers were overwritten on Forward and dropped after one Back | Low | Recorded only on push; pruned only when the entry leaves the stack |
| 6 | Non-link params on `/` stuck to `/following` | Low | Boot keeps only share or launch params |

**Fresh reviewer, 12 findings: 10 fixed, 2 deferred**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Esc-as-Back dead once the legacy panel mounted (its closed dialog still matched `[role=dialog]`) | High | Only open, visible dialogs count; e2e visits `/following` first |
| 2 | The hidden legacy home kept its keys, timer and video audio live | High | `onScreen` prop gates keys, timer and stall watch; videos pause when hidden; e2e asserts no search |
| 3 | The 400 ms timeout could release the Back lock while a slow traversal was in flight | Med | If the entry hasn't changed, wait once more; unit test with a 600 ms popstate |
| 4 | Tests passing for the wrong reason (fragment, double Back, depth-0 Back) | Med | Fragment test reads the page at DOMContentLoaded (before hydration); depth-0 Back via Esc on `/nope` |
| 5 | Double tap pushed the same screen twice | Med | `push` ignores the current URL |
| 6 | Fragment regex narrower than the decoder (`%6B=`) | Low | Head script uses `URLSearchParams.has("k")` |
| 7 | Saving the offset of an already-hidden screen wrote 0 | Low | Save only while the screen has boxes |
| 8 | `data-nav` cleanup raced between transitions; unhandled rejection | Low | Token per transition; `.catch` |
| 9 | Our `replace` carried `__NA`, so Next's patched `replaceState` skipped its router update (verified in `app-router.js`) | Med | `ownState()` strips Next's keys from everything we write (shell and legacy App) |
| 10 | Legacy artist-feed entries share the `/following` entry's key | Low | Deferred: reachable only with the bar hidden; artist feeds move to `nav.push` in slice 2 |
| 11 | `.legacy-home`'s containing block offsets viewport-positioned overlays at ≥ 900 px | Low | Deferred: those overlays only show in immersive mode, where `left: 0`; recheck in slice 2 |
| 12 | The first-entry stamp ran during render | Low | Stamp moved into boot (layout effect) |

## Slice 2a review (2026-11-25): Results, Favorites, Search, player, links

**code-review skill (high), 8 findings: all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | A filter or tag change kept the old scroll offset, so the new results opened mid-list | High | `replaceScreen` lands at the top; shell offsets keyed by entry + screen (a `replace` keeps the entry key); e2e |
| 2 | Copy share link ran after `await back()`, outside the tap's user gesture (Safari blocks it); the legacy prompt fallback was gone | High | Copy first, then close; `copyText` falls back to `window.prompt` |
| 3 | Favorite overlay survived a sign-out or account switch | Med | `favs.reset()` on a creds change; in-flight requests from the old account change nothing; unit test |
| 4 | A launch-link Results shared your saved ratings, not the every-rating view it showed | Low | Share uses all ratings for `l=1` |
| 5 | A dropped push left "open paused" set for the next player | Low | ▶ and Play from this post reset it |
| 6 | The saved place was written to localStorage every scroll frame | Low | Written after 250 ms of rest, and on pagehide/unmount |
| 7 | Close-reveal fallback assumed newest-first order | Low | Falls back only on newest-first lists |
| 8 | Sheet sprang back up before a swipe-down dismiss | Low | Stays down while Back lands |

**Fresh reviewer, 15 findings: 13 fixed, 2 deferred** (4 overlapped the list above)

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The player jumped to the first post when its post left the queue (failed load, blacklist, Undo) | High | Remembers its index; a vanished post moves to the one that took its place, no paging or toast |
| 2 | An evicted feed stranded the player on an endless loader (bindings held keys) | High | Bindings hold the feed object; capped at 64 |
| 3 | A link visit's (sharer's) blacklist was saved over yours on any edit; UX §2 says unsaved | High | `prefs.editBlacklist` writes your list and the visit's separately; `setSearch` keeps the visit unless the blacklist itself was edited; legacy setters follow; unit test |
| 4 | Favorites overlay across accounts | Med | Same fix as code-review #3 |
| 5 | Offsets leaked between screens that `replace` each other | Med | Same fix as code-review #1 |
| 6 | Closing a sheet over the player dropped focus to `body`; Esc did nothing with focus outside the sheet | Med | Focus returns to the opener inside the player; the sheet listens for Esc on `window` |
| 7 | A reload on a sheet entry could lock the page under no dialog | Med | Boot closes a sheet left open by a reload |
| 8 | Blacklisting posts above the view shifted the feed under the finger | Med | The first card in view keeps its place across removals and width changes |
| 9 | Favorites never refreshed after a change elsewhere | Med | Re-read on return when favorites changed; a removal stays (dimmed) while you're on it |
| 10 | Editing a link's Results kept the link's ratings and chip; edits skipped Recent | Low | A new search from Results drops the link marker and adds to Recent; adding a tag already there is ignored |
| 11 | Custom score accepted an empty field as 0 | Low | Done needs a number |
| 12 | A rejected saved key was silent; a link sign-out cleared your saved share opt-in | Low | Verify rejects (shell toasts); link sign-out leaves your settings |
| 13 | A card windowed out within 200 ms of a tap still opened the player; open-paused leak | Low | Timer cleared on unmount; leak as code-review #5 |
| 14 | Anchor writes per frame | Low | Same fix as code-review #6 |
| 15 | Body lock hid the desktop scrollbar (feed re-laid out); 422 might also mean "favorite limit" | Low | `scrollbar-gutter: stable`. Deferred: 422 meaning, recheck against e621ng when signed-in testing is possible |

Also deferred (spec gaps the reviewer listed, owned by later slices): a signed-out ♥ opens the sign-in sheet
(slice 7, today a toast); the "+N" artists picker (slice 6); pull to refresh and the new-posts pill (slice 3).
Slice 1 reviewer #10 (legacy artist feeds share an entry key) and #11 (`.legacy-home` containing block)
stay deferred to slice 3, which deletes the legacy home.

## Slice 2b review (2026-11-25): For You, Tune

**code-review skill (high), 5 findings: all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The debounced chip apply scrolled whatever screen was on show (or the locked page under a sheet) | High | Scrolls only while For You is shown; `setLockedY(0)` under a lock |
| 2 | Sign-out then sign-in as the same account reused the old ranking feed and its old key | High | Signed out forgets the choice; ranking keys take a never-repeating nonce |
| 3 | A blocked IndexedDB open kept For You waiting forever | High | The stored-fit read races a 3 s timeout; a late fit still patches in |
| 4 | A failed ⋯ › Refresh said "Ranking again…" forever | Med | The subtitle says it couldn't rank again; e2e |
| 5 | A malformed saved media setting could turn every media type off | Low | Only boolean `true` values kept; none on → default; unit test |

**Fresh reviewer, 12 findings: 10 fixed, 2 deferred**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | A ranking stopped mid-way (feed gone while every tag was muted, or a re-check) came back from the registry stopped: endless loader | High | Stopped rankings are dropped from the registry too; e2e |
| 2 | A chip change in its 600 ms pause was lost when the tab hid (Activity runs effect cleanups) | High | Hiding applies the waiting change; e2e |
| 3 | Saved ids weren't checked; a list e621 won't replay looped on Retry for 30 min | Med | Ids must be positive integers; a restore whose first batch fails forgets the list and ranks afresh |
| 4 | Every sync tick re-rendered For You and its feed | Med | For You selects the profile without `step`; only the loader follows ticks |
| 5 | Removing a blacklist line re-ranks For You from the current profile, so the pill can show while the list is already newer | Low | **Deferred** (rare; every feed starts over on a removed line). Revisit with request lanes in slice 3 |
| 6 | Refresh could start a second ranking during one; it read inputs from before its await | Med | Refresh is disabled while ranking; inputs read after the sheet closes |
| 7 | A finished refresh was thrown away if the profile moved meanwhile | Low | It's swapped in; the pill stays for the newer change |
| 8 | Sign-out with an unverified key, or a sign-in without Remember, could leave a saved list | Low | Purge by the key's username too; a sign-in without Remember removes that account's list |
| 9 | `getRec()` starts the sync from the first render that asks | Low | **Deferred**: idempotent today; move to boot when slice 3 retires the legacy home's hook |
| 10 | A hidden For You feed was first in line for eviction, so a re-ask could rank twice | Low | For You's feeds are never evicted (registry `keep`; a hidden Activity drops its effect retains); For You drops the ones it replaces; unit test |
| 11 | The restore e2e couldn't tell saved order from newest-first; the "no pill" check ran before the sync ended | Low | Ranked order now differs from newest-first; the check waits for the sync; new e2e for a chip change before leaving |
| 12 | Tune's "synced 3:41 PM" had no date for an older sync | Low | Shows the date when not today. Pull to refresh and its "Already fresh" toast stay with slice 3 |

**Budgets, measured once** (production build, `e2e/budgets.spec.ts`, 375×812, mock e621):

| Budget | Target | Measured |
|---|---|---|
| JS, cold load of `/following` | ≤ 200 KB | 199.7 KB gzip (was 219 KB before the screens were split into lazy chunks); 280 KB including the idle prefetch of every screen. The legacy home is ~21 KB of it and goes in slice 3 |
| Cards in the DOM | ≤ 30 | 12 at most while scrolling 300 posts |
| Layout shift | 0 | 0.0000 |
| First feed content | < 1.5 s | 0.37 s to the first Results card (no `feedHead` cache yet; slice 3) |
| Scroll, 4× CPU | no task > 50 ms | 0–1 long task per run, 53–55 ms. Borderline: recheck in Phase 6 with the performance panel |

## Slice 3a review (2026-11-25): Following

**code-review skill (high), 7 findings: 6 fixed, 1 not a bug**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The newer check dropped Hide favorited, so a faved newest post held the mark forever | High | The check runs the feed's own filters |
| 2 | Refresh would restore the old scroll place, not the top | High | **Not a bug**: the feed view is keyed by feed key, so it doesn't remount and the place is only read on mount. e2e guards it |
| 3 | The newer check re-ran on every scroll rest while the pill was up | Low | Skipped while newer posts are known |
| 4 | A failed read-back after a good visit read as a refusal | Low | One retry, and its own message |
| 5 | Grid view never marked seen by scrolling | Low | The grid reports the tile row of the first old post as the divider |
| 6 | Focus was lost opening Settings › Account | Low | The account section takes focus |
| 7 | Expanded runs folded again on reload | Low | Kept in sessionStorage |

**Fresh reviewer, 11 findings: 8 fixed, 3 no change**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Opening an old post in the player marked seen without anything seen | High | Needs a new post in the player first; e2e fails without the fix |
| 2 | "A screen past" read as "divider at the top"; the list end could never mark | Med | Reading kept and logged; the list's bottom with the divider on screen counts; unit tests |
| 3 | A failed mark retried and toasted on every scroll rest | Med | A minute's back-off after a failure; only the first automatic failure toasts; unit test |
| 4 | A read-back failure after a good visit said "e621 didn't take it" | Low | "Couldn't confirm it with e621"; unit test |
| 5 | Esc on Settings › Account doesn't go back | Low | **No change**: the legacy app owns Esc there (its panel); interim until slice 7; logged |
| 6 | A saved place on a post folded since lands wrong | Low | Lands on its "+N more" row |
| 7 | Expanded runs keyed by first id fold again when newer posts join their head | Low | Open if any of the run's posts opened one; unit test |
| 8 | Test gaps: borrowed sign-in, sign-out purge | Med | e2e: a share link's sign-in never calls `/saved_searches` or `/tag_subscriptions`; unit: purge clears both stores |
| 9 | Turning Remember on leaves markers in the wrong store | Low | **No change**: every write moves the record to the right store and removes the other copy; reads fall through to the other store |
| 10 | Mark all that found newer posts said nothing | Low | Toasts "New posts came in, so nothing was marked" |
| 11 | "40 new" lost its "+" after a page error | Low | A failed page doesn't end the list |

Not covered: the real e621 marker (needs the owner signed in in the browser pane); the mock ignores
`-fav:` and `rating:` in the newer check.

**Gates:** 233 unit tests, 122 e2e passed (2 skipped), typecheck and lint clean.

**Budgets** (production build, `e2e/budgets.spec.ts`, 375×812, mock e621):

| Budget | Target | Measured |
|---|---|---|
| JS, cold load of `/following` | ≤ 200 KB | 187.8 KB (was 199.7): the legacy home left the first load; Following joined it. 221.6 KB with the idle prefetch |
| Cards in the DOM | ≤ 30 | 12 |
| Layout shift | 0 | 0.0000 |
| First feed content | < 1.5 s | 0.38 s |
| Scroll, 4× CPU | no task > 50 ms | 0 long tasks |

## Slice 3b review (2026-11-25): refresh, pill, lanes, instant paint

**code-review skill (high), 4 findings: all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | A seeded queue's `rawMax` ignored the newest post the filters hid, so a "New posts" pill brought nothing | High | The head keeps e621's `rawMax`; `seed(posts, rawMax)`; unit test |
| 2 | The saved head kept hearts as they were, so a re-tap after reload hit "already favorited" | High | Hearts from the favorites overlay are folded in, and the head is saved again when they change (keeping its age); e2e |
| 3 | For You's ranking ran as `user`, holding up Following's next page | Low | Ranking runs as `page`; a restored list stays `user` |
| 4 | No test for eviction cancel or a pull below the top | Low | Registry unit test; e2e |

**Fresh reviewer, 10 findings: 8 fixed, 2 no change**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | `cancel()` left a stale `inflight`, so an `ensure` in the same tick got the aborted refill: an empty queue that never refetched (StrictMode remount of the legacy home) | High | `cancel` forgets the refill; a cancelled refill never touches the queue again; `inflight` cleared only by its own promise |
| 2 | Any `touchend` let go and a second finger didn't cancel | Med | A second finger cancels; only the last finger up lets go |
| 3 | A hung refresh kept the spinner and blocked pulls | Med | The spinner stops after 10 s whatever happens |
| 4 | The head wasn't saved again after a refresh that loaded the same ids | Med | The signature is kept per queue |
| 5 | The head wasn't dropped when what you follow changed | Low | A re-read that finds another tag count (or no row) drops it |
| 6 | The marker record now holds the anchor row in sessionStorage without Remember | Low | **No change**: same rule as the marker (DECISIONS 3a); the row has counts and ids, no key; a sign-in without Remember purges |
| 7 | A fetch that never answers holds the lane forever | Med | Every request times out after 20 s ("e621 took too long to answer") |
| 8 | Priority isn't tied to visibility | Low | **No change**: ranking moved to `page` (code-review #3); unbounded aging is intended so nothing waits forever |
| 9 | `reread` couldn't clear a deleted anchor | Low | A missing row now means you follow nothing; the saved row goes too |
| 10 | Small: the check gate shared across queues; the spinner left out when a sheet opens mid-pull; tests | Low | Gate resets on refresh; cleanup puts the spinner away; unit tests for the same-session reload, re-read and the head's rules |

Not covered: a lane test for the 20 s timeout (`AbortSignal.timeout` runs on real timers); `countNewer`
doesn't check the tag limit (Following's query is far below it).

**Gates:** 244 unit tests, 128 e2e passed (2 skipped), typecheck and lint clean.

**Budgets** (production build, 375×812, mock e621): JS cold load of `/following` 190.4 KB (≤ 200; +2.6 KB
for the lane, pill and pull), 224.4 KB with the idle prefetch; 12 cards in the DOM; CLS 0.0000; first
feed content 0.37 s; scroll at 4× CPU: 2 long tasks, longest 51 ms. **Borderline**, like slice 2b
(53–55 ms): recheck in Phase 6 with the performance panel.

## Slice 4 review (2026-11-25): follow everywhere

**code-review skill (high), 7 findings: all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Pills asked for the list only on mount, so the artist page's button stayed "waiting" when the sign-in was confirmed after it rendered | High | The effect runs again when the account or the list's status changes |
| 2 | `/artist/foo%20bar` would follow two tags on e621 and roll back locally | High | Names with whitespace are refused |
| 3 | A follow kept without an id ("already subscribed") was dropped on reload | Med | `subs:` rows may have a null id |
| 4 | A write before any list read saved a one-row list as the whole list | Med | Only a list e621 sent is saved |
| 5 | A follow made before Following opened left its saved first page in place | Med | Every follow write drops it from the follows store |
| 6 | A sign-in still being checked looked signed out on the artist page | Low | `checking` state: pills wait, the button shows waiting |
| 7 | The artist button carried its state twice (label and `aria-pressed`) | Low | Label only |

**Fresh reviewer, 9 findings: 7 fixed, 1 already fixed, 1 no change**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | A run queued for the old account ran under the new one after a switch | Med | Runs carry the account they were tapped for; unit test |
| 2 | Null-id rows lost on reload | Med | Already fixed (code-review #3) |
| 3 | A failed follow that a quick unfollow replaced still toasted an error | Med | Only the latest intent rolls back and speaks; unit test |
| 4 | A sign-in without Remember loaded an earlier remembered session's list | Med | Only a remembered sign-in reads `subs:`; unit test |
| 5 | The pill's label and `aria-pressed` both changed; the limit note wasn't linked | Low | Fixed label "Follow <artist>" + `aria-pressed`; `aria-describedby` to the note |
| 6 | An alias came back under its new name, and the next list read dropped the follow | Low | Kept under both names; unfollow removes both; unit test |
| 7 | An Undo from the old account worked after a switch | Low | Undo is dead after a switch; unit test |
| 8 | A Follow tapped signed out was dropped silently when the list couldn't be read | Low | Waits for the read, toasts "tap Follow again" on failure; window 5 min (was 10) |
| 9 | Follow then Undo shows Following's "New posts" pill for no net change | Low | **No change**: harmless, never reorders; tracking the net set isn't worth it |

e2e added for the reviewer's test gaps: a share link's borrowed sign-in on Results never reads or writes
follows (and Follow opens sign-in). Not covered: component tests of focus when a pill hides after a
follow elsewhere (the pill stays while it's the one tapped).

**Gates:** 269 unit tests, 138 e2e passed (2 skipped), typecheck and lint clean. Visual check at
375×812 with fixture images: card pill at the row's end (✓ shrinks in place), player pill on glass,
artist page tonal button.

**Budgets** (production build, 375×812, mock e621): JS cold load of `/following` 193.2 KB (≤ 200; +2.8
KB for the follows store and pills), 227.2 KB with the idle prefetch; 12 cards in the DOM; CLS 0.0000;
first feed content 0.37 s; scroll at 4× CPU: 2 long tasks, longest 51 ms (borderline as before; Phase 6).

## Live marker check (2026-11-25, owner signed in in the browser pane, Remember on)

| Check | Result |
|---|---|
| Anchor read (`/saved_searches.json`) | Pass: subscription row found, 3 tags, `last_seen_post_id` 6882662, `new_count` 0 |
| Following feed (`search:subscriptions`, signed in) | Pass: newest followed post 6878298 is below the marker, so "All caught up" is right |
| Images from `static1.e621.net` | Pass: cards render (no CORS issue) |
| Reload from the saved first page | Pass: no first-page request; the pill's count (`id:>6878298`, 30) and the next page (`b6589566`) ran |
| `visit.json` with `redirect: "manual"` (owner OK'd one call) | Pass: `opaqueredirect` (status 0); marker moved 6882662 → 6884634, the site's newest post; `new_count` 0 |
| `tag_subscriptions` POST output | Not run: follow arrives in slice 5 |
| **Gap** | Instant paint waits for the sign-in check: e621 was slow (`/users/me` 4.5 s, the anchor 3.2 s), so cards showed after ~5 s. Fix: keep the profile with Remember and paint before the check |

**Follow-up fix (signed in from the first paint):** self-review of the session change (no findings);
unit tests for the at-once sign-in, a refused vs unreachable check, and Remember/sign-out; e2e: a
reload with `/users/me` held 5 s shows Following's cards within 1.5 s, and a refused key on reload
signs the saved account out. The sign-in-failed toast now has an id (React's dev double effect showed
it twice).

## Slice R1 review (2026-11-25): v6 feed chrome

**code-review skill (high), 7 findings: all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The secret tab's ten drops showed at once: `spurt` added 10 before the drops counted as in the air | Med | `inAir += 10` before the add |
| 2 | The loading skeleton used the deleted `.post-stats` | Med | Rebuilt as a v6 panel (36 dot, sunk media, footer pill) |
| 3 | `.field` looked raised once the hairline token became the lit edge | Low | A sunk capsule (`--shadow-sunk`, well colour) |
| 4 | Tube tab links could start a native link drag | Low | `draggable={false}` |
| 5 | A favourite during a spurt could end one short | Low | The last landing sets the stored count |
| 6 | `.post-tags` `touch-action: pan-x` blocked vertical page scroll (pre-existing) | Low | `pan-x pan-y` |
| 7 | Tuck styles stayed when reduced motion or the grid turned on | Low | Cleared when Tuck turns off |

**Fresh reviewer, 10 findings (3 more were already fixed on disk)**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The goo count persists without Remember and survives sign-out | Med | Owner: "Clear on sign-out". Stored with Remember only (tab otherwise), wiped on sign-out; unit + e2e test |
| 2 | Two goo e2e asserts couldn't fail (no-drop checked too early; drag test never clicked a tab) | Med | No-drop waits 700 ms; new test drags back onto the start tab. Note: it passes with the click guard removed too, because Chromium retargets that click to the bar under pointer capture; it checks the outcome, not the guard |
| 3 | The desktop rail has no goo or secret tab | Low | **No change**: desktop is undrawn (R2); logged in DECISIONS |
| 4 | Player artist name lost its ellipsis; the player didn't turn the mark on favourite | Low | `display: block`; `turnMark` in the player |
| 5 | Goo counted again on un-favourite + favourite | Low | `addFav(id)` counts a post once per page session; unit test |
| 6 | Play stayed focusable while stepped aside | Low | `inert` with `data-away` |
| 7 | "favourites" vs the app's "favorites" | Low | US spelling; tests updated. The Settings row's icon well is R2 (list rows) |
| 8 | Skeleton gap 24 (cards 16), duplicate `.post-new` weight, link-blue tab focus ring | Low | All fixed (16, rule removed, gold ring) |
| 9 | The bottom scrim may darken the legacy Account home's last 40 px | Low | **No change**: a guess, pointer-events off; R2 restyles Settings |
| 10 | A wipe with drops in the air drew a plop on the empty bar | Low | No plop at 0 |

e2e failures found by the gate: Play covered the desktop rail (4 tests); it now sits past the rail.

**Gates:** 293 unit tests, 145 e2e passed (2 skipped), typecheck and lint clean (after the sign-out follow-up). Visual check at 375×812
(Following, Settings, goo at 60 in the preview, the tube and capsule) and desktop (rail).

**Budgets** (production build, 375×812, mock e621): JS cold load of `/following` 199.3 KB (≤ 200; was
202.2 before the goo bar, drip and burst moved to idle-loaded chunks; Fredoka is CSS/font, not JS),
237.5 KB with the idle prefetch; 12 cards in the DOM; CLS 0.0000; first feed content 0.37 s; scroll at
4× CPU: 0 long tasks. **Risk for R2**: 0.7 KB of headroom; the R2 list parts must stay out of the first
load or something else must move out.

## Slice R2a review (2026-11-25): v6 lists, Search, Tune, Settings home, grid

**code-review skill (high), 3 findings: all fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The artist page's Follow button flipped its label and had `aria-pressed` ("Following, pressed") | Low | Constant name "Follow <artist>", state in `aria-pressed` |
| 2 | The Clear button sat inside the Recent `h2` ("Recent Clear, heading") | Low | The label row is a `div` holding the `h2` and the button |
| 3 | Dead `--radius-thumb` token and `.group-label` rule | Low | Deleted (`.sheet-label` kept for R2b) |

**Fresh reviewer, 12 findings**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | No gap between the Settings title and the account group (mock: 8) | Med | `.title-row + .list-group { margin-top: 8px }`; e2e measures it |
| 2 | Search autofocus might lose to the screen's heading focus | Med | Real once Search's code is loaded: the pushed screen's h1 took focus from the field. `focusScreen` now leaves focus alone when the screen already holds it; e2e (fails without the fix) |
| 3 | `.tune-tag { gap: 4px }` overridden by `.list-row` | Low | Deleted |
| 4 | Old `.switch` blocks superseded; two `.panel-card .tune-note` rules; `.group-label` | Low | Old switch removed (its focus ring kept); tune-note merged; `.group-label` gone with finding 3 above |
| 5 | `Seg` and `Stepper` unused | Low | **No change**: R2b and slice 6 use them (DECISIONS) |
| 6 | Clear inside the heading; two buttons both named "Clear" | Low | Heading fixed (above); the field's is "Clear search", `Field`'s is "Clear <its label>" |
| 7 | Follow button state announced twice | Low | Same as code-review 1 |
| 8 | Saved row: Trash, not ⋯; name shown twice when it is the tags; no "Videos" | Low | Line drops the tags when the name is the tags (e2e); Trash kept (DECISIONS); saved searches have no media filter to show |
| 9 | Grid caught-up isn't a full-width row; "1 favorites" | Low | Singular fixed; the full-width row waits for slice 5 (pre-existing, DECISIONS) |
| 10 | Tune: "Find a tag" copy, "· weight", "N tags" value; `Field` didn't refocus after Clear | Low | Copy is "Filter tags to find the rest"; `Field` refocuses; weight and "N tags" kept (DECISIONS) |
| 11 | Slider fill ended up to 14 px from the thumb's centre | Low | `--p` is a 0–1 fraction; the fill stops at `14px + (100% − 28px) × p` |
| 12 | Hard-coded "Version 0.1.0" | Low | From package.json via `next.config.ts` `env`; e2e checks the pattern |

e2e failures found by the gate: two tests opened Settings › Account by the link's old name; they use the
row's test id now.

**Gates:** 293 unit tests, 150 e2e passed (2 skipped), typecheck and lint clean. Visual check at 375×812
(Settings, Search, Results, grid, Tune) and 1280 (Settings, grid).

**Budgets** (production build, 375×812, mock e621): JS cold load of `/following` first measured 201.2 KB
(over). Cause: Following imports the feed screens module, which imported the whole Search screen (for
`SearchForm`) and all of `v6.tsx` (for `TagText`). Fixed by moving `SearchForm` and `TagText` into their own
modules and the Settings home into a lazy chunk: **199.1 KB** (≤ 200), 241.0 KB with the idle prefetch;
12 cards in the DOM; CLS 0.0000; first feed content 0.41 s; scroll at 4× CPU: 0 long tasks. Still about
1 KB of headroom: R2b's player and sheet code is lazy already, but anything new the feed screens import
counts.

## Slice R2b review (2026-11-25): player, its sheets, menus, tag targets

**code-review skill (high), 5 findings: 4 fixed, 1 skipped**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | The filter menus are a new lazy chunk with no error boundary: a failed download (offline, or a deploy replaced it) would take the app down | Med | `LoadFailed` boundary in Chips: closes the sheet, toasts, and makes a fresh `lazy()` so the next tap retries; e2e aborts the chunk |
| 2 | Post info offered Pin (and the why line) on signed-out For You, which shows Popular, not a profile | Med | For You in Post info needs your own sign-in (creds, user, not a link's); e2e |
| 3 | Score › Custom… didn't focus its field (Sheet's autofocus runs only when the sheet opens) | Low | Ref callback focuses it as it appears; `data-autofocus` kept for a sheet that opens on Custom; e2e |
| 4 | The style picker radiogroup had five tab stops and no arrow keys | Low | Roving tab stop and arrows, like `Seg`; e2e |
| 5 | A single-artist post shows no artist tag in Post info, so it can't be held for Blacklist there | Low | **Skipped**: the design puts the artist in the head (DESIGN.md "Post info"); Blacklist this artist stays in the card's ⋯ (DECISIONS) |

**Fresh reviewer, 7 findings**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Sheet's Tab trap counted a menu's `tabindex=-1` rows as the last stop, so Tab could leave the dialog | Med | The trap uses real tab stops only (`tabIndex >= 0`); e2e Tabs round Sort |
| 2 | "Artists" counted `conditional_dnp` and the other warning tags as artists | Low | The group shows when `artists(post)` has more than one, and lists only those |
| 3 | Open on the artist's own page does nothing | Low | **No change**: cards don't show artist tags; from Post info on that page, Open closes the player onto the page, which is what it asks for |
| 4 | Lazy filter menus have no failure path | Med | Same as code-review 1 |
| 5 | Menu's layout effect runs every render | Low | **No change**: 3–9 rows; it is what keeps the thumb right after a Custom… row opens |
| 6 | Reshuffle is a non-radio inside the radiogroup | Low | **No change**: it is the chosen row's action and only shows while Random is on |
| 7 | TimeLeft polls every 250 ms while paused | Low | **No change**: `setState` bails out when the value is the same |

**Gates:** typecheck and lint clean; unit tests pass; full e2e 157 passed, 2 skipped, 1 failed: the legacy
"prints: one colour print…" timing test under four workers (passes 3 of 3 alone; R2b doesn't touch the
stages). New e2e: Sort/Date/Media/⋯ sheets (R2b part 1), player chrome, Post info (stats, kinds, targets
8 above the tag), Quick settings (stepper, Fit only for Classic, mute, Quality menu), share-link Quick
settings (this visit vs your default), card tag targets, two-artist Post info with Open first, and the
review fixes. Visual check at 375×812: player, Post info with targets, Quick settings, card targets.

**Budgets** (production build, 375×812, mock e621): JS cold load of `/following` **198.6 KB** (≤ 200; R2a
199.1: the old sheets left the first load with the filter menus), 250.9 KB with the idle prefetch; 12 cards
in the DOM; CLS 0.0000; first feed content 0.36 s; scroll at 4× CPU: 0 long tasks.

## Slice R3 review (2026-11-26): Goo the mascot, landing, empty, error and offline states

**code-review skill (high), 5 findings: 5 fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | "Try now" didn't try sooner: the request lane holds every request for e621's 5 s back-off, so the tap swapped the panel for skeletons and the request left on the old schedule | Med | `skipBackOff()` in the lane lifts the pause once (the 550 ms gap still holds) and wakes the waiting pump; only the tap uses it, the automatic retry doesn't. Unit test; e2e asks again within 2 s |
| 2 | The offline banner could mismatch on hydration (server online, client offline at load) | Low | The banner reads the net store through `useSyncExternalStore` with an online server snapshot |
| 3 | A lifted gate cleared `inert` on a stepped-aside (invisible) Play | Low | React no longer writes `inert`; a layout effect sets it from gate and step-aside together; e2e |
| 4 | Three empties (For You's window, an artist, Popular) kept the old plain line | Low | `quietEmpty()`: Goo snoozes with a headline and sentence, or looks and counts when the blacklist or sign-in took the posts |
| 5 | Dead CSS from the replaced markup | Low | Removed (`.feed-error`, `.feed-end`, `.feed-empty-title`, `.feed-empty-mark`, `.feed-empty-actions`, `.following-mascot`) |

**Fresh reviewer, 8 findings**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Following's "No posts yet" and Favorites' "No favorites yet" ignored posts the blacklist or sign-in took | Med | Those go to the "No posts match" state with real counts; Reset filters shows only when a filter is on; e2e |
| 2 | "None of the 1 artist you follow…" | Low | One artist reads "The artist you follow hasn't posted since you joined."; e2e. The count is e621's `tag_count` of followed tags (follows are artists in this app) |
| 3 | "3 need you signed in" had no noun | Low | "3 posts need you signed in" in the sentence and the end note |
| 4 | The slow-down countdown was a live region that spoke every second | Low | The seconds sit in `aria-live="off"`; the headline is announced once; e2e |
| 5 | Gate and `inert` | Low | Same as code-review 3; also, a gate with no element never keeps Play hidden |
| 6 | Follow pills on the landing's Popular and on FollowsNoOne | Low | **No change**: signed out, Follow opens sign-in (follows.ts); FollowsNoOne's sentence asks you to tap Follow |
| 7 | `toss` flew drops to the top left when the bar had no box (under the player) | Low | A bar with no box counts the drops in place |
| 8 | First-load JS (State and Goo in the first load, 202.0 KB) | Med | Results, Favorites and the artist page had been in the first load because Following imported shared parts from their module: the parts moved to `screens/feedParts.tsx`, so those screens are lazy at last. Also lazy: the error and slow-down panels (`StatePanels`, prefetched at idle, with a plain panel if the chunk can't come), the placeholder and Not found screens, pull to refresh on Following. 194.5 KB |

**Gates:** typecheck and lint clean; unit tests pass (lane: Try now); full e2e: see STATE. New e2e
(e2e/states-v6.spec.ts, 14): landing gate and inert, Goo tap to the goo count, needs sign-in, For You signed
out, no match counts, filter count and Reset, error panel, slow down with Try now, offline banner, end of
feed, load more failed, Following nothing yet (2 artists, 1 artist), blacklist counted not "nothing yet", the
plain panel when the panels' chunk can't load. The first full run caught the offline banner in the lazy chunk
(offline, it couldn't download): the banner is back in the first load.
Visual check at 375×812: landing, needs sign-in, no match, error, slow down, offline.

**Budgets** (production build, 375×812, mock e621): JS cold load of `/following` **194.5 KB** (≤ 200; R2b 198.6),
259.5 KB with the idle prefetch; 12 cards in the DOM; CLS 0.0000; first feed content 0.36 s; scroll at 4× CPU: 0
long tasks.

## Slice 5 review (2026-11-26): Artists tab, artist score, first run after sign-in

**code-review skill (high), 5 findings: 5 fixed**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Follow from favorites in a sheet went Back after e621 answered: with the sheet already closed, that Back left the Artists tab | Med | The sheet closes at the tap (the follow shows at once) |
| 2 | Every rec progress tick patched the artists store, so Suggested re-rendered every card during the learn phase | Med | `same()` patches only what changed; `cut()` skips when its inputs are the same objects |
| 3 | The segment read "Following3" | Low | A space before the count |
| 4 | The sort chip looked "on" at the default Recent | Low | On only when the sort isn't Recent |
| 5 | The New dot cleared only from the row, not when the artist's page opened from anywhere | Low | The artist page marks the artist opened |

**Fresh reviewer, 11 findings**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Account switch: the artists store could read the last account's rec profile and follow list (rec and follows follow the session on their own) and keep that for an hour | High | Waits until rec's `name` and the follow list's `user` are the new account's |
| 2 | Sign-out didn't cancel a read in flight; it could finish and show the old account's list | Med | Sign-out bumps the epoch and drops the in-flight read, the kept hour and the last cut |
| 3 | `wanted` never reset: after one visit, every later sign-in read favorites and searched from any tab | Med | Reset with the account; the screens ask again when the account changes |
| 4 | After an error, any store tick restarted the read: a failing e621 got asked again and again | Med | An error waits for Try again |
| 5 | An account without an id would spin forever | Low | **No change**: the session never keeps a user without an id (/users/me with no id is a refused sign-in) |
| 6 | Following N artists unmounted the list and focus fell to the page | Med | Focus moves to the Following title; a toast says "Following N artists" (and what was skipped, with why) |
| 7 | Pick rows had no group name; the count could include names followed or hidden since the list opened | Low | `role="group"` "Artists to follow"; only names on the list count and are sent |
| 8 | The Follow-from-favorites sheet could open empty from history before the read | Low | It closes itself when there's nothing to pick |
| 9 | The first run's Skip flag could carry over to another account | Low | Keyed by the account |
| 10 | `hiddenArtists` survives sign-out and isn't tied to Remember | Low | **No change** for now, like Tune's overrides (a choice list, no account data); on MORNING to decide |
| 11 | The read block's status region covers only the line, not the numbers | Low | **No change**: the numbers tick every page; announcing them would talk over everything. `data-screen` is the state's "whole screen" spacing |

**Gates:** typecheck, lint clean; unit tests 303 pass (artist score: ordering, smoothing, exclusions,
recency, batching, grouping, synthetic backtest; follows: bulk with skips, failure rollback and limit).
New e2e: e2e/first-run.spec.ts (4: read → pick → one POST → feed; Skip and its row across a reload; no
favorites; a failed read and Try again), e2e/artists.spec.ts (4: signed out; Following with dot, filter,
sort, Unfollow and Undo; Suggested with Follow kept in place and Not interested with Undo; Follow from
favorites as a sheet, one POST). Full e2e: 183 passed, 1 failed (the old "following nobody" test, which the
first run replaces: updated), 2 skipped. Found by the e2e and fixed: the ranking ran before the tag counts
came (counts missing from rows), suggestions cut before the follow list loaded (a followed artist offered),
and a re-entrant `follows.ensure` loop.
Visual check at 375×812: the read, the pick list, the skipped row, Artists › Following, Suggested, the sheet.

**Budgets** (production build, mock e621): JS cold load of `/following` **197.1 KB** (≤ 200; R3 194.5);
274.3 KB with the idle prefetch; CLS 0.0000; first feed content 0.37 s; 12 cards in the DOM; 0 long tasks
at 4× CPU. `E6_BUDGET_FILES=1` now lists the first-load files by size.

## Slice 6 review (2026-11-26): the artist page

**code-review skill (high), 3 findings: 1 fixed, 2 skipped**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | Following's "keep Popular artists up after a follow" flag outlived the account: the next account could land on the first run | Med | Kept per account |
| 2 | A name e621 doesn't know still starts its posts search | Low | **Skipped**: one wasted request, never shown |
| 3 | Popular artists pops in below a 120 px blank | Low | **Skipped**: below the fold; slice 9 polish |

**Fresh reviewer, 9 findings**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | A hand-typed `/artist/Some%20One` searched two tags, never matched e621's `some_one`, and Follow did nothing | High | The page folds the name to e621's form (lower case, `_` for spaces) and uses it for everything |
| 2 | `/tags.json` leaves out tags with no posts, so an artist with none read "No artist called…" | Med | The page's lookup asks with `search[hide_empty]=false` |
| 3 | "last post" followed the chips (Sort: Oldest gave "9y") and could come from a post you never see | Med | Its own one-post search, newest first, kept for the visit |
| 4 | A chip change remounts the page and the hero blanked while the lookup re-answered | Low | Answers already in seed the remount |
| 5 | While loading, a non-artist tag first shows an artist's mark and "Follow" | Low | **No change**: most pages are artists; #4 removes it after the first visit |
| 6 | The observer read the oldest entry of a batch: the compact bar could stick | Low | Reads the newest |
| 7 | "2h" froze at mount on a screen kept alive while hidden | Low | Counts from when the screen was last shown |
| 8 | The compact bar's pill follows without the mark's spin | Low | **No change**: the bar has no big mark; as drawn |
| 9 | The loading placeholder was a real `<dd>` with a blank | Low | The placeholder well is `aria-hidden` and outside the list's terms |

**Gates:** typecheck, lint clean; unit tests pass (routes: the artist page's params). New e2e:
e2e/artist-page.spec.ts (7: pasted signed out with Follow → sign-in; signed in with the compact bar and
Unfollow from it; a hand-typed name; chips in the URL across a reload and a remount without blank wells;
Share and ⋯; no such artist; a tag that isn't an artist). follow.spec's 500 test reads the new copy.
Full e2e before the fixes: 192 passed, 2 skipped; the affected specs after: 65 passed.
Visual check at 375×812: hero, compact bar, ⋯, a species tag, no such artist.

**Budgets** (production build, mock e621): JS cold load of `/following` **196.1 KB** (≤ 200; slice 5
197.1); 281.3 KB with the idle prefetch; CLS 0.0000; 0 long tasks at 4× CPU. The artist page is its own chunk.


## Slice 7 review: Settings' pages and the sign-in sheet

**Code review (high), 6 findings**

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 1 | A sign-in that answered after the sheet was closed still ran Back, leaving the screen under it | High | Back only while the sign-in sheet is still the current entry |
| 2 | Closing the sheet kept a signed-out Follow armed for 5 min; a later sign-in followed by surprise | High | A real close drops it (StrictMode's practice unmount doesn't); e2e covers it, checked against a mutant |
| 3 | "Change" API key started with Remember on even for a session kept without it | Low | Starts from the session's Remember |
| 4 | On a shared link the sheet prefilled the sharer's username | Low | No prefill from a link's sign-in |
| 5 | A blacklist line twice: duplicate keys, one Remove took both | Low | Shown once |
| 6 | Stale doc comment on openSignIn | Low | Removed |

**Fresh reviewer, 10 findings** (1–3 are #2, #1 and #4 above)

| # | Finding | Sev | Outcome |
|---|---|---|---|
| 4 | Signing in as another account through "Change" left the first account's caches on the device | Med | The account before is purged, as on a sign-out |
| 5 | Sign-out leaves `hiddenArtists:<user>` | Low | **No change**: kept on the device like Tune's pins (MORNING Decide 5) |
| 6 | A hand-edited `choose:constructor` sheet name could throw | Low | Own-key check |
| 7 | Sync said "Synced 0 lines" when you signed out during it | Low | `importBlacklist` returns null then; no toast |
| 8 | A clipboard error marked the key field invalid; focus started on the external link | Low | The clipboard note is its own status line; focus starts on the first empty field |
| 9 | Two quick rating taps could overwrite each other | Low | Built from the store, not the render |
| 10 | Tests: no dismiss-then-sign-in case; Escape not asserted | Low | Both added |

Also found while testing: "1 follows" → "1 follow".

**Gates:** typecheck, lint clean; unit 304 pass. New e2e: e2e/settings.spec.ts (9: the sheet's flow with a
wrong then a right key and no Remember; the username draft; a signed-out Follow followed once you're in;
a backed-out Follow not followed; Account; Content; Slideshow; For You; App). Specs that reached the old
panel for sign-in or sign-out now use the sheet or the new Account page; the old panel is at
`/settings/classic`. Full e2e: 199 passed, 2 failed (both still walked the old panel; fixed), 2 skipped;
the affected specs after the fixes: 66 passed. Visual check at 375×812: the sheet, Account, Content,
Slideshow, the shortcuts sheet.

**Budgets** (production build, mock e621): JS cold load of `/following` **197.2 KB** (≤ 200; slice 6
196.1); 297.3 KB with the idle prefetch; CLS 0.0000; budgets test passes. The Settings pages and the sheet
are their own chunks.
