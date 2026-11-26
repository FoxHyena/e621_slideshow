# Goal: rebuild e621 Slideshow as a scroll-first app with Following and Artists

You are taking this app (repo: `FoxHyena/e621_slideshow`, a client-only Next.js 16.3 app deployed at
https://e621.cumdump.dog) from "a slideshow with a feed bolted on" to **a scroll-first app with tabs —
Following · For You · Artists · Settings — where the slideshow is a full-screen player you launch from any
feed.** The finished app should feel **playful, cute, and slightly premium**: soft, bouncy, considered,
never cluttered, and smooth on a phone.

The end state is a **draft PR** that went through several rounds of UX and design planning and review,
was code-reviewed by subagents slice by slice, was manually tested in a real browser at phone size, and is
**running locally** for the owner to try, with the URL handed to them.

This is a long job. It will outlive your context window. **The files in `docs/path-a/` are your memory.**

---

## 0. Before anything else, every time

1. Read `docs/path-a/STATE.md`. If it doesn't exist, this is the first run: create it from the template in
   §3, then start Phase 1.
2. Read the latest entries in `docs/path-a/DECISIONS.md` and any open questions in `docs/path-a/QUESTIONS.md`.
3. Continue from STATE.md's "Next step". Don't redo finished phases.

After every meaningful step (a phase gate, a slice committed, a review round, a question answered), update
STATE.md **before** moving on. If you were cut off mid-step, the next you must be able to resume from
STATE.md alone.

---

## 1. What already exists (verify, don't trust blindly)

- `src/components/App.tsx` (~1,300 lines) holds almost all state: settings, credentials, the active
  queue, slideshow timer, grid/feed overlays (`browse`, `browseFrom`, `feedPlace`), artist feeds stacked
  with `history.pushState` hacks, keyboard, swipe, toasts. **This is the main thing to break apart.**
- `src/components/SettingsPanel.tsx` (~1,200 lines) is currently the home screen: Source
  (Search / Favs / Recommended), search, filters, date, saved searches, blacklist, playback, account,
  keyboard, userscript.
- `src/components/Feed.tsx`, `Gallery.tsx`, `Stage.tsx` + `stages/*` (5 slideshow styles), `InfoOverlay`,
  `TagActions` (hold-a-tag → drag to Search/Blacklist), `Avatar` (kaleidoscope avatars), `Loader`.
- Data layer is already view-agnostic: `src/lib/slideshow/queue.ts` (`PostQueue`, cursor paging),
  `src/lib/recommend/stream.ts` (`RecommendedQueue`), `src/lib/e621/client.ts` (throttled to stay under
  e621's 2 req/s hard limit), `src/lib/bigStorage.ts`, `src/lib/storage.ts`.
- Recommendations: `src/lib/recommend/*`. The favorites **profile** already stores per-tag counts with
  categories (artist tags included), and the **tag cache** has site-wide post counts per tag. Artist
  affinity is nearly free from these.
- Tests: `pnpm test` (vitest, `src/lib/__tests__`), `pnpm typecheck`, `pnpm lint`, `pnpm e2e`
  (Playwright against a mocked e621 in `e2e/mock.ts`), `pnpm screenshots` (README shots, blurred
  placeholder art only — never real posts).
- **Read `AGENTS.md`.** This Next.js version differs from your training data: read the relevant guide in
  `node_modules/next/dist/docs/` before writing routing/layout/metadata/PWA code.

### e621 tag subscriptions (from the e621ng source, `e621ng/e621ng` on GitHub)

e621.net itself is behind a Cloudflare bot check — you can't load its pages. Read the e621ng source with
`gh api repos/e621ng/e621ng/contents/<path>` instead.

- Subscriptions are to **any tag** (artists in practice), **limit 500** per user.
- The feed is a plain posts search: **`search:subscriptions`** — one tag slot regardless of list size,
  any-of semantics, works with `-`/`~`, ratings, `id:>N`, and the client-side blacklist. `PostQueue` can
  run it as-is.
- `GET /tag_subscriptions.json` → list. `POST /tag_subscriptions.json` with `tag_names="a b c"` →
  bulk subscribe, returns `{ added, skipped: [{name, reason}] }`. `DELETE /tag_subscriptions/:id.json`.
  Files: `app/controllers/tag_subscriptions_controller.rb`, `app/models/tag_subscription.rb`.
- "New since last visit": a hidden saved search (`is_subscription: true`, name `subscriptions`) carries
  a watermark. `GET /saved_searches.json` returns it with `last_seen_post_id` and `new_count`.
  `SavedSearch#mark_seen!` / `visit` advances it; `mark_all_seen` (JSON, 204) advances **all** tracked
  searches. Files: `app/models/saved_search.rb`, `app/controllers/saved_searches_controller.rb`,
  `app/blueprints/saved_search_blueprint.rb`, `config/routes.rb`.

---

## 2. Decisions already made by the owner

- **Home tab (signed in): Following.** New posts since the last visit at the top. Following is also the
  natural place to surface artist recommendations (an inline "Artists you might like" card/row, and the
  empty state when you follow no one). Signed out → a friendly landing that explains sign-in and still lets
  you search.
- **"New since last visit": share e621's marker if it's clean to do so, otherwise keep our own.**
  Investigate first: is there a JSON route that advances *only* the subscription anchor (not every
  tracked saved search)? Does API-key basic auth work on it cross-origin? If yes, use it (read
  `last_seen_post_id` on open, advance it when the user has scrolled past the new posts). If it would
  also clear the user's other tracked searches or needs an HTML redirect, use a local marker per account
  and note why in DECISIONS.md.
- **Phone first.** Bottom tab bar, thumb reach, swipes, safe areas. Desktop gets a sidebar version of the
  same layout plus the existing keyboard shortcuts.
- **Extras in scope:**
  1. **Artist profile pages** — avatar, post count, how many of their posts you've favorited, last post
     date, Subscribe button, then their feed. Replaces the stacked-overlay artist feed.
  2. **Install as an app (PWA)** — manifest, icons, splash, standalone display, service worker caching
     the app shell and thumbnails (never the API key; never cache authenticated API responses to disk
     without thinking about it — write the decision down).
  3. **Pull to refresh + "N new posts" pill** — no feed jumps when new posts arrive.
  4. **Bulk-subscribe from favs** — first-run Following screen: "You've favorited these artists a lot.
     Follow them?" with checkboxes, one button, one bulk POST.

### Must not regress

- All 5 slideshow styles, playback settings, the info overlay, gallery, hold-a-tag actions, blacklist
  (client-side, account sync), saved searches, Recommended (pins, mutes, breadth, rebuild).
- **Share links** (`?…` query + optional `#creds` fragment) and **launch links** from the userscript
  (`public/e621-slideshow.user.js` opens the site with an e621 search). Old URLs must keep working —
  they're in the wild. A launch link should still start a slideshow (or ask: see questions).
- Credentials never leave the browser except to e621. Never put them in URLs you create (except the
  existing opt-in share-with-sign-in fragment).

---

## 3. Working files (`docs/path-a/`)

Create and keep these current. Short, dated, skimmable.

- `STATE.md` — the one file a fresh you reads first:
  ```
  # State
  Phase: <n — name>          Updated: <date time>
  Branch: <branch>           PR: <url or none>
  ## Next step
  <one concrete action>
  ## Checklist
  - [x] Phase 1 …
  - [ ] Slice 3: Artists tab …
  ## Blocked on
  <open question ids, or "nothing">
  ```
- `DECISIONS.md` — append-only: date, decision, why, alternatives rejected.
- `QUESTIONS.md` — questions for the owner: id, question, options, your recommendation, status
  (open/answered + answer).
- `UX.md` — information architecture, flows, screen-by-screen spec including empty / loading / error /
  signed-out states, gestures, transitions.
- `DESIGN.md` — visual system: tokens (color, radius, spacing, type, shadow, motion curves/durations),
  component inventory, personality notes, references.
- `ENGINEERING.md` — architecture plan: state, routing, data/caching/paging, performance budgets.
- `REVIEWS.md` — every review round (UX, design, plan, code): who reviewed, findings, what you changed,
  what you declined and why.
- `TESTING.md` — manual test script and results per run, with screenshot paths
  (`docs/path-a/shots/`, placeholder art only).

These are committed on the branch so the PR shows the reasoning. Before marking the PR ready (not your
job — leave it draft) the owner can decide whether to keep them.

---

## 4. Phases and exit gates

Don't start a phase until the previous gate is met. Record each gate in STATE.md.

### Phase 1 — Orient and ask

1. Read the code listed in §1, the e621ng files, and the Next docs you'll need (app router, layouts,
   metadata/manifest, any PWA guidance).
2. Write a first `ENGINEERING.md` "current state" section: what lives where, what's tangled.
3. Brainstorm **peripheral features** that would make this nicer (examples to consider, not a mandate:
   haptics on favorite/subscribe, "caught up" divider in Following, per-artist new-post dots, snooze an
   artist, quick filter chips on feeds, remember scroll position per tab, offline "you're offline" state,
   share an artist, double-tap-to-fav heart burst). Rank them by value ÷ effort.
4. **Ask the owner** in one batch (use the question tool; max 4 per call, call again if needed). Always
   include your recommendation first. At minimum ask:
   - The peripheral features you'd add (multi-select).
   - Where the slideshow's settings live after the split (player sheet vs Settings tab).
   - What a userscript launch link should open (slideshow vs feed of that search).
   - Tab naming/labels, and whether "For You" (Recommended) and plain Search are one tab or two.
   - Anything in §2 that turned out not to be possible as stated.
   Keep working on non-blocked research while waiting. Log answers in QUESTIONS.md and DECISIONS.md.

**Gate:** questions answered, scope frozen in DECISIONS.md.

### Phase 2 — UX plan, reviewed (≥2 rounds)

1. Write `UX.md`: tab structure, every screen, navigation model (real URLs per tab/artist so Back and
   phone edge-swipe work natively — delete the history hacks), how the player opens/closes and keeps the
   feed position, all states, onboarding for signed-out and zero-subscriptions users, where artist recs
   appear.
2. **Review round:** spawn a fresh subagent (not a fork — it must not be anchored on your reasoning) with
   only `UX.md`, the README, and screenshots in `docs/screenshots/`. Ask it to critique as a picky mobile
   UX designer: confusing flows, dead ends, too many taps, missing states. Log in REVIEWS.md, revise.
3. Repeat at least once more, or until a round finds nothing material.
4. Show the owner a short summary of the IA and key flows (a published Artifact page with simple
   wireframes is ideal) and ask for sign-off.

**Gate:** owner OK on UX.

### Phase 3 — Visual design, reviewed (≥2 rounds)

Personality: **playful, cute, slightly premium.** Think soft rounded surfaces, a warm accent, gentle
springy motion, tiny delightful moments (heart burst, subscribe wiggle, a cute empty-state mascot or
doodle), but restrained — the art is the star, chrome stays out of the way. Dark by default (it's an
art-viewing app); consider a light theme only if it's cheap.

1. Load and use the design skills available: `impeccable`, `emil-design-eng`, `apple-design`,
   `mobile-native`, `animate`. Write `DESIGN.md` with tokens and motion specs.
2. Build mocks of the key screens (Following, Artists, artist profile, player, Settings, empty/sign-in
   states) — a published Artifact or a dev-only route — with placeholder art.
3. **Review round** with a fresh subagent using the `impeccable-finish-reviewer` or a general agent
   briefed as a senior product designer. Revise. Repeat ≥1 more time.
4. Show the owner and get sign-off.

**Gate:** owner OK on look and feel.

### Phase 4 — Engineering plan, reviewed

Write `ENGINEERING.md` "target" section, then have a `Plan` subagent critique it. Cover at least:

- **State:** split `App.tsx` into focused modules — e.g. a session/account store, settings store, a
  queue registry (one queue per feed key, reused across tab switches), player state, UI chrome. Prefer
  plain React (context + `useSyncExternalStore` over small stores) unless a library earns its weight;
  justify any dependency in DECISIONS.md.
- **Routing:** real routes per tab and artist (`/following`, `/for-you`, `/artists`, `/artist/[name]`,
  `/settings`, player as a route or URL state). It's client-only today (`ClientApp`) — keep static
  export/hosting compatibility; check what the deploy target needs.
- **Data & caching:** in-memory query cache keyed by normalized query (dedupe in-flight requests,
  stale-while-revalidate on tab return), persisted caches in IndexedDB via `bigStorage` with TTLs
  (subscriptions list, artist stats, tag counts), invalidation on subscribe/unsubscribe/favorite.
  Respect the throttle — never parallelize past e621's 2 req/s; batch tag lookups.
- **Paging:** cursor paging (`page=b<id>`), prefetch the next page at ~70% scroll, cap memory.
- **Rendering performance:** virtualize long feeds and grids (or window them — measure first), keep
  DOM card count bounded, lazy images with correct `sizes`/sample URLs, `decoding="async"`, poster
  frames for video, only the in-view video plays. Budgets: 60fps scroll on a mid phone, first feed
  content < 1.5s on a warm cache, no layout shift when images load (reserve aspect ratio).
- **Artist recommendations:** score = affinity (your favs of artist ÷ artist post count, smoothed) ×
  recency (last post date) blended with Recommended's learned weights; exclude subscribed; cache.
  Add unit tests; if you can, extend `scripts/rec-backtest.ts` to sanity-check the ranking.
- **Service worker:** what is cached, versioning, how updates roll out, never caching auth headers.
- **Migration:** localStorage keys keep working; old share/launch URLs route correctly.

**Gate:** plan reviewed, revisions logged.

### Phase 5 — Build in slices

Suggested order (adjust in ENGINEERING.md): (1) state split + routing shell with tab bar, no feature
change; (2) Feed tab parity (search/For You), player route; (3) Following feed + new-post marker + pull to
refresh + pill; (4) subscriptions API + Subscribe buttons; (5) Artists tab + recommendations + bulk
subscribe onboarding; (6) artist profile pages; (7) PWA; (8) polish/motion pass; (9) peripheral extras.

For **every slice**:
1. Implement. Keep components small and named for what they do.
2. Unit tests for logic (`src/lib/__tests__`), Playwright e2e for flows (extend `e2e/mock.ts` with
   `tag_subscriptions` and `saved_searches` mocks).
3. `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` — all green.
4. **Code review:** run the `code-review` skill on the slice's diff (level `high`), and for the state
   split, routing and caching slices also spawn a fresh reviewer subagent given only the diff and
   `ENGINEERING.md`, asked to look for bugs, wasted renders, leaks, race conditions, and cache
   invalidation mistakes. Fix what's real; log every finding and outcome in REVIEWS.md.
5. Quick manual check in the browser (Phase 6 style, just this slice).
6. Commit with a clear message (attribution trailer as your harness instructs). Update STATE.md.

### Phase 6 — Manual testing, for real

1. Start the dev server via the preview tooling (`.claude/launch.json`) and drive the built-in browser
   at **phone size (375×812)** and desktop. Walk every flow in `TESTING.md`: first run signed out, sign in,
   zero subscriptions → bulk subscribe, Following new posts + marker, pull to refresh, Artists tab,
   artist page subscribe/unsubscribe, favorite, hold-a-tag, play slideshow from a feed and back to the same
   scroll spot, every slideshow style, share link, launch link, old URLs, Back/edge swipe everywhere,
   offline, PWA install prompt.
2. Signed-in testing against real e621 needs the owner's API key: **never type it yourself** — ask the
   owner to sign in in the browser pane, or test signed-in flows against the e2e mock.
3. Run the `break-ui` skill on the new screens (long artist names, 0 / 500 subscriptions, huge counts).
4. Log results and screenshots in TESTING.md. Fix, retest.

**Gate:** every flow in TESTING.md passes; no console errors.

### Phase 7 — Ship to draft

1. Final `code-review` at `high` on the whole branch diff vs `main`; fix; log.
2. Update README (features, screenshots via `pnpm screenshots` with placeholder art, keyboard table).
3. Push: SSH auth on this machine is the wrong GitHub account, so push over HTTPS with gh's credentials:
   `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push https://github.com/FoxHyena/e621_slideshow.git HEAD:refs/heads/<branch>`
4. Open a **draft** PR against `main`: summary, before/after screenshots, the list of decisions, known
   gaps, and a test plan. Don't merge.
5. Start `pnpm dev` (or a production build with `pnpm build && pnpm start` if that's closer to reality)
   and give the owner the local URL plus a 5-step "try this" list. Also note how to open it on their
   phone over the LAN.

---

## 5. How to work

- **Ask, don't guess, on product questions.** Batch them, recommendation first, and keep doing unblocked
  work meanwhile. Don't ask about things you can find out from the code or the e621ng source.
- **Stay on scope.** New ideas go into QUESTIONS.md as proposals, not straight into code.
- **Small, reviewable commits**, each passing all checks.
- **No real e621 art in anything committed** — screenshots use the blurred placeholder fixtures.
- If something in this file is wrong (an API behaves differently, a file moved), trust what you observe,
  fix it here, and log it in DECISIONS.md.

## 6. Done means

- [ ] Draft PR open, CI green, description complete.
- [ ] App running locally; owner has the URL and a try-it list.
- [ ] REVIEWS.md shows ≥2 UX rounds, ≥2 design rounds, a plan review, and a code review per slice.
- [ ] TESTING.md shows a full manual pass at phone and desktop sizes.
- [ ] No regressions in §2's must-not-regress list.
- [ ] STATE.md says "Phase: done" with links to the PR and local URL.
