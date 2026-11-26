# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** the owner and their friends, using it daily. The public site is open to anyone, including
  people who arrive from the e621 userscript, so first run and sign-in must be friendly to strangers.
- **Situations (owner-confirmed):**
  - Phone, one hand, in bed or on the couch, often in a dark room: short sessions catching up on new
    posts from followed artists, finding new artists, favoriting.
  - Desktop or TV: lean-back slideshow on a big screen, keyboard or no input.

## Product Purpose

A client for e621 (a furry art booru) that turns the site's search results into a calm, scroll-first
feed and a full-screen slideshow player. It lets you follow artists (e621 tag subscriptions), see what's
new since your last visit, discover artists from your own favorites, and play any feed as a slideshow.
Success: Following is the first thing the owner opens each day, and catching up feels quick and pleasant.

## Positioning

- Runs entirely in the browser and talks to e621 directly; the API key never touches another server.
- Recommendations (For You, suggested artists) are learned in the browser from the user's own favorites.
- Shares e621's own "new since last visit" marker, so the app and e621.net agree.
- Five slideshow styles for lean-back viewing, launched from any feed.

## Operating Context

- e621's API: 2 requests/second hard limit; e621.net pages are behind a Cloudflare bot check, so the
  e621ng source is the reference for behavior.
- The userscript adds "▶ Slideshow" to e621 search pages and opens this app with that search.
- Share links (query + optional sign-in fragment) and launch links are in the wild and must keep working.
- Content is adult art; most users browse explicit content. Ratings and a client-side blacklist control
  what is shown.

## Capabilities and Constraints

- Next.js 16 client-only app on Vercel; Tailwind 4; lucide-react icons.
- Data: localStorage (`e6ss:v1:` prefix) and IndexedDB (`e6ss`).
- e621 tag subscriptions: max 500 per user; feed via `search:subscriptions`.
- e621 has no artist pictures; artist avatars are generated kaleidoscopes.
- No real e621 art in anything committed (screenshots use blurred placeholder art).

## Brand Commitments

- Name: "e621 Slideshow" (kept for now).
- Kaleidoscope artist avatars stay.
- Colors and type are free to restyle, **but** the owner wants a side-by-side comparison of a couple of
  options against e621's own colors (navy panels, yellow-orange accent, as the app uses today) to show
  the new choice is better before adopting it.
- Personality (owner brief): playful, cute, slightly premium; the art is the star.

## Evidence on Hand

- README screenshots (`docs/screenshots/`) of today's UI with generated placeholder art.
- No testimonials, metrics or user research beyond the owner's own use; don't invent any.

## Product Principles

1. The art is the star; the interface stays out of its way.
2. Never lose the user's place, and never move content they're reading.
3. Honest about e621: rate limits, hidden posts and irreversible actions are stated plainly.
4. The user's credentials and data stay in their browser.
5. Old links keep working.

## Accessibility & Inclusion

- Dark rooms: low-glare dark UI by default, text contrast AA over any art.
- Reduced motion respected throughout, including slideshow styles.
- One-handed phone use: primary actions in thumb reach, 44 px targets.
