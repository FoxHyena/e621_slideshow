# AllTrails iOS: a study (not a template)

Source: owner-shared Mobbin screenshots of AllTrails iOS (Explore list, map, trail detail, reviews, For
you, guide, recording, onboarding and paywall), 2026-11-25. Owner's instruction: "It should be treated as a
study for things like spacing, component design, and things like that, and then we should take those
learnings into our own design as a designer would, not directly copying."

So this file records **principles**. The "Ours" column says how each one shows up in e621 Slideshow, in
our own colours, content and components. Anything marked **Not taken** is AllTrails' own signature, and
we leave it alone.

## 1. Spacing

| What AllTrails does | Principle | Ours |
|---|---|---|
| One side margin (~16) for the search bar, chips, list photos and text | One edge. Everything left-aligns to it. | 16 screen edge. Pictures, text, chips and section headers all start at 16 and end at 359. |
| Photo → title gap is small (~12); line gaps inside a listing are smaller still (~4) | Internal spacing is tighter than external spacing, so grouping comes from space and needs no boxes | 12 from a picture to its text, 4 between text lines, 24 between posts. No card box around a post. |
| Large gap between listings (~24+) | Items are separated by air, not by dividers | 24 between posts. Dividers only where the meaning changes ("You're caught up"). |
| Stats row: 4 equal columns, value over label, no box | Key numbers get a plain, scannable row | Artist page: 3 columns (posts, you faved, last post), value over label, no box. |

## 2. Hierarchy and type

| What AllTrails does | Principle | Ours |
|---|---|---|
| Listing = title (semibold), place (muted), one facts line with small inline icons | Three lines, fixed order: what it is, where it's from, the facts | Post = artist (17 semibold, e621 artist colour), facts line (favourite, score, rating, post number), tags line (e621 category colours). |
| Big titles: screen title and detail title are the largest text; everything else is 13–17 | A few sizes, with big jumps between levels | 34 screen title, 20 section, 17 headline, 15 body, 13 footnote, 11 tab labels. Nothing in between. |
| Muted grey for secondary text, underline for inline links on detail pages | Secondary text is quieter by colour, not by smaller and smaller sizes | One muted colour (#A0ADC1) for all secondary text. Links use e621's link blue. |

## 3. Components

| Component | Principle | Ours |
|---|---|---|
| Filter pills with chevrons, horizontally scrolling, cut off at the edge | Filters are one height, the overflow hints that the row scrolls, and the chevron means "opens a menu" | 32 pills, chevron only on chips that open a sheet, fade at the right edge. Selected = gold. |
| "500+ trails · Most relevant ▾" results row | Say how many there are and how they're sorted, in one quiet line | Following subtitle "12 new since your last visit"; Search results get "1,204 posts · Newest ▾". |
| Floating tab bar: glass capsule, icon + label, the selected tab sits in its own lighter capsule | iOS's current tab bar (owner asked for this) | Navy glass capsule, gold icon and label on the selected tab, count badge on Following. |
| A floating action pill above the tab bar ("Map") | One floating primary action per screen, centred, above the tab bar | Our Play pill (already in UX v3.2), in gold. |
| Detail actions: one filled primary pill and outlined secondary pills, in one row | One primary action per screen. The rest are visibly secondary | Artist page: gold "Play all" plus a navy "Following". |
| Round icon buttons on the map edge, round toolbar buttons at the top | Toolbar icons sit in round 44 buttons with a filled background | Top toolbar: 44 round navy buttons (search, grid, more). |
| Bottom sheet with a grabber and big rounded top corners | (Already in our UX) | Sheets: grabber, radius 24+ top corners. |

## 4. Restraint

- One accent colour, used for the primary action and the active state, and almost nothing else. Ours: e621 gold.
- Photos carry the colour; the interface stays neutral. Ours: e621 navies are the "neutral", and gold is the only bright colour besides the tag colours.

## Not taken (AllTrails' own)

- Their green, their logo and their light-mode look.
- Round buttons on top of photos (save, download), and the mini-map inset on the photo. We keep **nothing on
  top of the art** except video controls (owner: "the idea behind this is seeing the art").
- Photo carousels with dots inside a listing.
- Their exact proportions and copy.
