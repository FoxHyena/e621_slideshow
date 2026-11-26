---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Surface: the app shell (all tabs, artist page, player, sheets)

Mode: Operate. Build path: code-led (Operate surface). Approved composition: docs/path-a/mocks/feed-v6.html for the system, the feed and the shared chrome (owner sign-off 2026-11-25, v6); docs/path-a/mocks/screens-v6.html for the artist page, grid view, Artists, Search, Tune, Settings, Settings › Slideshow, the sign-in sheet, the player and its two sheets, the filter menus, the tag targets, the signed-out landing, the empty, error and offline states, Goo the mascot (owner sign-off 2026-11-25), and the first run after sign-in (owner sign-off 2026-11-26). Proposed overnight on 2026-11-26, not owner-approved (docs/path-a/MORNING-DESIGN.md): toasts, Artists › Suggested, Follow from favorites as a sheet, the Artists row menus, Popular artists; the "From a link" chip, the grid tile's hold menu, the artist page's edge states; Settings' Account, Content, For You and App pages; the install steps, the update toast and the app icon. Not drawn yet: desktop; build those from UX.md with DESIGN.md's parts and show the owner.

## Direction contract

THESIS: A calm e621 reading room where the art is the only bright thing. Each post is a navy e621 panel with the artist on top, the picture sunk into it, then tags, and score and favourite at the right end underneath. It refuses the category default of edge-to-edge photos with overlaid hearts and a centred creator ribbon.

OWN-WORLD: e621 Hexagon navies (#020F23 ground, #152F56 panels, #1F3C67 raised), link blue #B4C7D9, and one gold (#E8C446) reserved for the main action, "New" and the current tab. e621 tag category colours on tags. Fredoka (600 / 500) for titles, names, numbers and buttons; the system face for reading. Three materials lit from above: raised pressables with a darker same-hue lip that closes on press (3 px; 4 on Play, 2 on Follow), panels, and sunk wells for the picture and tags. No hairline outlines, no gradients. "Bends" artist marks hashed from the name; the kaleidoscope is the app mark. The tab bar is one solid bent tube with a sliding capsule; it collects white goo as you favourite and hides a secret fifth tab.

STORY: Open Following and see "12 new since your last visit". Catch up quickly, fave with one thumb, reach "You're caught up", find an artist to follow, and press the round gold ▶ to play it all lean-back.

FIRST VIEWPORT: a 52 row with the 34 large title "Following" and a 44 tools capsule (Search, Grid view, More), then a line with a pile of three artist marks and "12 new from 5 artists", and chips at 36. Then the first navy post panel at a 16 edge with one 8 inner edge and a 24 radius: the header (36 mark with a gold new dot, 17 name, gold "New" · time · #id, ⋯), the picture at a 16 radius, the tag row in 28 wells, then ↑ score and the ♥ pill at the right end. A 56 gold round ▶ with a count badge sits at the bottom left above the bent 64 tab bar.

FORM: e621 colours refined (direction A, position 1 on my ordered list; the assigned "plush hang tag" was shown and not chosen); seed:03339dd96a2c6b22. Signature interaction: the lip press (100 ms) plus favouriting: the heart pops, goo drips under the pill and a drop falls onto the tab bar. Motion grammar: touch feedback 100–200 ms ease-out with no overshoot; celebrations (favourite, follow, tab change) overshoot once within 720 ms; goo is the one slow thing. Under reduced motion everything is instant and the goo only updates in place.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
