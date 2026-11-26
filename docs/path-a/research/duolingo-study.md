# Duolingo: a study for playfulness (not a template)

Owner, 2026-11-25: "We should also study and pull on duolingo design for a more playful feel and do research
about their design." This follows the same rule as the AllTrails study: learn principles, apply them in our own
style, and don't copy. Published-source research is in `duolingo-research.md`. This file covers what the
owner-shared screens show (splash, learning path, two translate exercises, onboarding language picker).

## What the screens show

| Observation | Principle |
|---|---|
| Buttons and word chips have a solid, darker bottom edge (a "lip") under a flat face. The green CHECK button is a full-width slab with a darker green base. | Tactile depth without shadows or gradients. Things you can press look pressable. |
| Word chips: white face, light grey outline, a thicker grey bottom edge, generous radius (~12). Empty slots are the same shape, filled flat grey. | One shape for "a thing you can pick up", and its empty state echoes it. |
| Labels: bold rounded type. Button text is UPPERCASE with wide tracking. Category labels ("NEW WORD", "HARD EXERCISE") are small caps-ish in a role colour with an icon. | A rounded typeface does most of the friendliness work. Caps are kept for short labels. |
| Status counters at the top (flag, streak, gems, energy): a filled colourful icon plus a bold number, with no labels. | Stats become small trophies: coloured icon + number. Each stat has its own colour. |
| Colour carries meaning: green = go/correct, orange = progress on a hard item, red = hard, blue = section/unit. Large areas stay white. | Saturated colour is reserved for meaning on a calm ground. |
| Progress bars are thick (~16), fully rounded, and have a lighter highlight stripe on top. | Progress is chunky and visible, never a hairline. |
| The path's round nodes have a lip too. The current node gets a ring. | The same depth language is used everywhere. "You are here" gets one extra ring. |
| The tab bar has filled, colourful icons. The selected one sits in a rounded square with an outline. | Selection is shown by a container shape, not only by colour. |
| Characters and the owl appear on exercise and empty screens, and never on top of content. | The mascot lives in moments (empty, celebrate, onboarding), not in the work area. |

## Ours (first pass; the research file may refine it)

1. **Lip on pressables.** The gold primary pill gets a darker-gold 3–4 px bottom edge. On press it moves down
   to cover the lip (≈100 ms). Navy secondary pills get a deeper-navy lip. Filter chips keep a 2 px lip.
   No drop shadows on controls.
2. **Rounded type.** iOS's own rounded system face (`ui-rounded`, SF Pro Rounded) for titles, names, numbers
   and buttons, with a self-hosted rounded face as the fallback off-iPhone. Body text stays on the regular
   system face. Short labels can be bold caps with tracking (for example the "NEW" and "CAUGHT UP" markers).
3. **Stats as small trophies.** e621's numbers (score, favourites, the "12 new" count, your fave count on
   artist pages) each get a filled icon in their own colour: score green, favourite pink, new gold.
4. **Meaning colours on navy.** Gold = primary and new. Green = score. Pink = favourite. e621 tag colours
   for tags. Everything else stays navy and muted.
5. **Chunky progress.** The player's progress bar and any "caught up" progress are thick and rounded, with
   a highlight stripe.
6. **Selection as a shape.** The selected tab sits in its own capsule (already in v4), plus a lip.
7. **Celebration moments, never over the art.** Following's "You're caught up" gets a small celebratory
   moment: a mascot pose and a short burst. So do the first follow and the 100th favourite. Respect
   reduced motion.
8. **Mascot.** Our own soft fox/dog (from PRODUCT and UX), in empty states, the caught-up moment,
   onboarding and errors only.

## Not taken (Duolingo's own)

- The owl, their characters and illustration style, their green, Feather / DIN Round, and their exact
  button proportions.
- Streak or gem mechanics, and any guilt-driven nudges. They don't fit an art browser, and the owner hasn't
  asked for them.
- Their white backgrounds. Ours stays e621 navy.
