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
