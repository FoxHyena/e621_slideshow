# Duolingo design study

Purpose: learn why Duolingo feels playful yet clean, then apply the lessons to e621 Slideshow in its own style (navy, gold, iOS system font, art first). Nothing here is a spec to copy.

## Source quality (read this first)

- `design.duolingo.com` (the official brand guidelines) now 301-redirects every page to `https://blog.duolingo.com/hub/design/`. I could not fetch the official colour, type, motion or voice pages. Anything attributed to them below came from search-result snippets only.
- Duolingo's blog posts on design are about process and principles. They give almost no numbers (no radii, hex codes or durations).
- The numeric values in this file mostly come from one third-party page that reconstructs Duolingo's CSS. Its author says the values are illustrative and not verified against production. I tag them **[3P]**. Treat them as a plausible model of the style, not as facts.
- Tags: **[S]** = fetched from a Duolingo or credible press source. **[3P]** = third-party reconstruction. **[unverified]** = from memory or a single weak source.
- Not found anywhere: official sound-design write-up, official haptics write-up, official dark mode documentation, official button spec.

Sources used:
- Shape language: https://blog.duolingo.com/shape-language-duolingos-art-style/
- Character design: https://blog.duolingo.com/building-character/
- Search snippet of the official illustration rules: https://design.duolingo.com/illustration and https://design.duolingo.com/illustration/characters
- Core tabs refresh: https://blog.duolingo.com/core-tabs-redesign/
- Streak milestone animation: https://blog.duolingo.com/streak-milestone-design-animation
- Rive character animation: https://blog.duolingo.com/world-character-visemes
- Rive on Duolingo's workflow: https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff
- Rebrand (type): https://creativebloq.com/news/feather-bold and https://www.designweek.co.uk/duolingo-rebrand-avoids-silicon-valley-tropes-and-reflects-companys-quirky-personality/ (search snippets; the Design Week page itself returned 403)
- Fonts in use: https://fontsinuse.com/uses/59497/duolingo-app
- Reconstructed CSS values **[3P]**: https://blakecrosley.com/guides/design/duolingo
- Voice, search snippet only: https://design.duolingo.com/writing/voice
- Behavioural analysis: https://uxplanet.org/analyzing-duolingo-from-product-design-perspective-after-400-days-of-non-stop-practice-c4d4809bdb37 (403, snippet only)

## 1. Buttons and tactile depth

What is known:
- The 2018 redesign moved the app to rounded buttons on a white background **[S]** (shape-language post).
- The "chunky" look is a flat button face with a solid, hard-edged darker bottom edge and no blur. It reads as a physical key. **[unverified]** as a Duolingo statement, but it matches every third-party reconstruction.

Reconstructed primary button **[3P]**:

| Property | Value |
|---|---|
| Bottom lip | 4px solid, a darker shade of the face colour |
| Radius | 16px |
| Padding | 14px 24px |
| Label | 700 weight, 17px, uppercase, 0.8px letter-spacing |
| Press | lip goes to 0, button moves down 4px, brightness 0.95 |
| Press timing | 100ms, `ease` |

Takeaways:
- The lip is the same hue as the face, only darker. It is not a grey drop shadow. That keeps saturated buttons looking solid rather than dirty.
- On press the button travels the full height of the lip, so the lip "gets used up". The change is physical, tiny and instant.
- Uppercase, tracked labels make short commands feel like stamped keys. They only work because labels are one to three words.
- Only one primary button per screen gets the full treatment. Secondary actions are flatter (outlined or ghost) **[unverified]**.

## 2. Typography

| Font | Role | Source |
|---|---|---|
| Feather Bold | Headlines and brand moments. Custom, by Fontsmith (Krista Radoeva, 2019). Letterforms were drawn from the owl's curves | **[S]** Creative Bloq, Monotype via search |
| DIN Next Rounded (some sources say "DIN Round") | Subheads, body, UI | **[S]** Fonts in Use, Creative Bloq; variant naming disagrees across sources |

- Feather Bold is proprietary and cannot be reused. Do not try to imitate it.
- The pairing logic: one expressive face for a few big moments, one neutral rounded workhorse for everything else. The rounded terminals echo the rounded shapes.
- Uppercase plus positive tracking is used on buttons and small labels (see section 1 **[3P]**). Body copy stays sentence case.
- Weight is high (bold) almost everywhere in the app UI. The playfulness comes from weight and roundness, not from decorative type.

## 3. Colour system

Reconstructed palette **[3P]** (Feather Green `#58CC02` is also confirmed by several brand-palette sites):

| Colour | Hex | Meaning |
|---|---|---|
| Green | `#58CC02` (lip `#58A700`) | Success, primary action, correct |
| Blue | `#1CB0F6` | Information, progress |
| Red | `#FF4B4B` | Hearts, mistakes |
| Orange | `#FF9600` | Streak |
| Yellow | `#FFC800` | XP, rewards |
| Purple | `#CE82FF` | Leagues, premium |
| Pink | `#FF86D0` | Events |
| Text primary / secondary | `#4B4B4B` / `#AFAFAF` | Body, quiet text |
| Track grey | `#E5E5E5` | Bars, disabled surfaces |

How saturation stays calm:
- **One hue, one meaning.** Green means go/right. Orange always means streak. Learners decode state by colour before reading.
- **Big neutral field.** Colour sits on white (light mode) with generous negative space, so a saturated object is a small island, not the whole screen. The illustration post stresses white space so art does not "interrupt the app experience" **[S]**.
- **Few colours per illustration.** Official rule, via search snippet: illustrations use only a few colours **[S]**.
- **Text is dark grey, not black** **[3P]**. Contrast stays high without harshness.
- **Large coloured headers were questioned.** In the core-tabs refresh the team tried "punchy" solid headers (pink, deep blue, orange) against a "soft" version, then shipped a bold, high-contrast header bar and flatter cards. They dropped header artwork because it took space without carrying information **[S]**. This is Duolingo itself pulling playfulness back.
- The brand moved from a muted palette to bold, bright colour in 2018 **[S]**, but only after fixing structure (white space, rounded UI).

## 4. Shape language

Official rules (search snippet of the design site) **[S]**:
- Every shape has rounded edges. Pointy shapes are off-brand.
- Pathfinder cuts are fine, but corners must be rounded afterwards.
- Shadows under characters are pill shapes, never ovals.
- Eyes are geometric (no ovals). Noses are one or two rounded rectangles. Mouths are the least geometric and are usually asymmetric.
- Characters use one or two basic shapes for head and body. Shape repetition keeps a character cohesive.
- Shape signals personality: Vikram moved from a circle body to a pill with straight sides and rounded top and bottom **[S]**.
- A "rhythm of simple shapes" keeps art interesting. Each shape must matter **[S]**.

UI values **[3P]**:

| Element | Value |
|---|---|
| Button radius | 16px |
| Wrong-answer banner | 16px top corners, square bottom |
| Progress bar | 16px tall, 8px radius (full pill) |
| Cards | Outlined chips and cards, about 2px border in a neutral grey **[unverified]** |

- The core-tabs post tried "modular" soft rounded cards and chose flatter cards with less clutter and whitespace separating sections instead of boxes **[S]**. Rounded does not mean boxed.

## 5. Icons and illustration

- Stat icons (streak flame, gems, hearts, XP) are filled, chunky, single-colour-family objects with a highlight and a darker shade. They are the main place colour is allowed to be loud **[unverified]**, consistent with the colour-meaning table above.
- Navigation icons were kept constant while everything around them was explored **[S]**. Stability in nav, play in content.
- Illustration style: minimal vector forms, bold bright colour, clear silhouettes, white space around key objects, "just enough detail", exaggeration to the edge of caricature **[S]**.
- Character principles **[S]**: Duo is the template. Human characters reuse his geometric build, large eyes and detached feet so the cast feels like one world. Characters are "quirky but relatable". The cast took about 18 months.
- Characters are rarely static. Idle motion (blinks, nods, eyebrows) is built in **[S]**.
- The design system is a **kit**: a few primitives recombined, so a small team can make a lot of art fast **[S]**.

## 6. Motion and feedback

Reconstructed timings **[3P]**:

| Moment | Duration | Easing | Notes |
|---|---|---|---|
| Button press | 100ms | ease | lip to 0, 4px move |
| Wrong-answer banner | 200ms | ease-out | slides up from bottom |
| Progress fill | 300ms | ease-out | width only |
| Streak flame idle | 2s loop | ease-in-out | scale 1 to 1.05, plus or minus 2 degrees |
| Streak flame at risk | 0.8s loop | ease-in-out | scale to 1.1, saturate 1.3 |

Confirmed behaviour **[S]**:
- Each character has its own correct-answer animation. After a run of correct answers an interstitial reward plays. Lessons end with a short character animation (Duo and Lily walking).
- Streak milestones are staged as a "power up": Duo transforms (phoenix, flame, balloons earlier). The team ran several rough passes to tune "rhythm and energy" and stresses that "timing is everything".
- Rive is the animation runtime. Its state machine blends states, mouths run alongside body poses, one small runtime file ships to iOS, Android and web, and the character stops talking or reacts when the learner answers early **[S]**. Principles listed: small file size, scalable combinations from few assets, responsiveness, idle life.
- Sound and haptics: Duolingo has distinct correct and wrong sounds, a lesson-end sound and haptics paired with them. I found only secondary commentary, no official write-up **[unverified]**. The commonly reported pattern is a bright rising note for correct and a deflated descending tone for wrong, with the wrong state still gentle.

Pattern: motion is reserved for state change and reward. Ordinary navigation is calm.

## 7. Copy voice

From a search snippet of the voice guide **[S]**: supportive, plain language. Wrong answers get a soft line such as "Not quite correct. Try again!" instead of a harsh label. The rebrand's tone work (Johnson Banks) aimed at quirky and personable, avoiding Silicon Valley tropes **[S]** (Design Week snippet).

What makes it work (observed, **[unverified]** as official policy):
- One idea per line, short, verb-first on buttons.
- Humour lives in notifications and characters. Instructions and errors stay literal.
- Praise is specific and scaled to effort.
- Errors blame the situation, not the person.

## 8. Dark mode

- Duolingo ships an official dark mode with a settings toggle on mobile. A browser-extension page says the extension was retired because of it **[S, weak]**.
- No official documentation of its colour decisions was found. Anything beyond that is inference, so I do not draw rules from it. The inference worth keeping: the semantic hues (green, orange, red) stay recognisable and surfaces go dark, so meaning survives the theme swap **[unverified]**.

## 9. Pitfalls and accessibility

Where playfulness tips over:
- **Childishness.** Saturated hues everywhere, bouncy motion on every tap, and a mascot interrupting routine tasks. Duolingo gets away with it because its users are learners being coached. A browsing app is not.
- **Noise.** Large colour headers and header art were removed in the tabs refresh because they used space without information **[S]**.
- **Guilt loops.** Streak flames that turn urgent (saturate, faster loop) are effective but manipulative. The streak redesign posts and third-party critique (for example uxdesign.cc "Reframing streaks") show the tension.
- **Colour-only meaning.** Green/red correctness relies on hue. It needs a second cue (icon, text, banner position). Duolingo pairs colour with banner text and sound **[unverified]**.
- **Contrast.** Light grey text `#AFAFAF` on white is roughly 2.2:1 **[3P value, my calculation]**, below WCAG 4.5:1. White text on a bright green button is also low contrast. Do not inherit either.
- **Uppercase and tracking** reduce reading speed. Fine for one to three words, bad for sentences.
- **Motion.** Looping idle animation and confetti need a `prefers-reduced-motion` fallback.
- **Haptics and sound** need an off switch and must default off or subtle in a quiet-use context.

## Lessons for e621 Slideshow

Context: dark navy chrome, gold `#E8C446` accent, iOS system font, adult art that must never be decorated.

1. **Make controls feel like objects.** Duolingo's lip makes a tap feel physical. Translate it as a 2 to 3px darker-gold or darker-navy edge on primary controls (Play, Follow), with a press that closes the edge in about 100ms. Use a darker shade of the same hue, never a grey shadow. Apply to a few controls only, never to anything overlapping art.
2. **One hue, one meaning.** Gold means "yours / active / primary". Keep a short second tier for state (followed, new, error) and stop there. On navy, a small set of meanings read faster than many accents.
3. **Colour is an island, not a flood.** Duolingo keeps saturated colour small against a large calm field. Here the art is the field. Keep chrome navy and quiet, and spend gold only on the current action, active tab and one badge at a time.
4. **Play with weight and roundness, not decoration.** Duolingo's personality comes from heavy weights and rounded terminals. With the iOS system font, use heavier weights and slightly rounded containers for headings and counts (the system rounded design is available on Apple devices **[unverified]**), and keep body text regular. No custom display font is needed.
5. **Round everything, consistently.** Pick one radius family (for example 12, 16, pill) and apply it to buttons, chips, cards and the player. Rounded containers should be calm: separate by space before borders, as Duolingo did in its tabs refresh.
6. **Reserve motion for state change and reward.** Taps get a 100ms press. New items in the feed, follow confirmed and slideshow start get one small moment. Navigation and scrolling stay plain. Respect reduced motion and keep every moment under about 400ms.
7. **Give the chrome a tiny character, not a mascot.** Duolingo's cast works because it is a few shapes recombined. A small set of geometric marks (a paw, a pill-shaped badge, an empty-state shape) in navy and gold can carry personality in empty states, loading and "all caught up". Keep them out of the player and off the art.
8. **Celebrate quiet milestones, once.** Streak milestones are staged as a power-up with tuned rhythm. Do the same for rare events (first follow, 100th favourite, finished feed) with a short gold flourish in the chrome. Never repeat on every session and never guilt (no urgency timers).
9. **Copy: warm, short, literal when it matters.** Soft errors, verb-first buttons, humour only in empty states and confirmations. One-to-three-word uppercase labels only on primary buttons; sentence case elsewhere.
10. **Pair colour with a second cue.** Never rely on hue alone for followed/unfollowed or error. Add an icon, a fill versus outline change or a text label. Check text contrast on navy (4.5:1 for text, 3:1 for large text and icons).
11. **Constrain the kit.** Duolingo's speed comes from few primitives reused everywhere. Define a small token set (radii, lip heights, durations, gold shades) and ban one-off values. This also keeps the slideshow chrome from competing with the art.
12. **Remove playfulness near the art.** The tabs refresh deleted header artwork that did not inform. Apply the test everywhere the art appears: grid, artist header, player. Chrome frames; it does not decorate. Overlay controls auto-hide, stay neutral and carry no mascots or confetti.

## Don't copy

- The owl, any Duolingo character or its pose language.
- Feather Green `#58CC02`, the full Duolingo hue set, or the same hue-to-meaning map.
- Feather Bold or any imitation of it. DIN Rounded is also their pairing.
- The exact button recipe (4px lip plus 16px radius plus uppercase 17px tracked label) as a one-to-one clone.
- Streak flames, hearts, gems, leagues and XP bars.
- Guilt notifications and urgency animation.
- Uppercase labels for anything longer than three words.
- Light grey text on a dark or light field that fails contrast.
