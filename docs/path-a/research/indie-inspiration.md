# Indie / boutique inspiration: playful, cute, slightly premium (dark, art-first)

Research notes for Path A. Evidence tags: **[V]** = verified by fetching the cited page this session; **[M]** = from general knowledge or secondary summary, not verified here (treat as a pointer, check before copying). Many boutique sites (family.co, Cara, Raycast, Linear, Halide) expose no design specifics to a text fetcher, so visual claims about them are **[M]** and kept short. The motion/interaction numbers below are the solid part.

## 1. Sources and what to take from each

### Emil Kowalski (Sonner, Vaul, animations.dev) 
- [7 practical animation tips](https://emilkowal.ski/ui/7-practical-animation-tips) **[V]**: press = `scale(0.97)` on `:active`; never animate from `scale(0)`, start at 0.9+ (example 0.93); ease-out for enter/exit with custom curves ([easings.co](https://easings.co)); keep UI motion under 300ms (180ms select feels better than 400ms); make popovers origin-aware (`transform-origin` at the trigger); skip delay on subsequent tooltips (`transition-duration:0` via `[data-instant]`); `filter: blur(2px)` on crossfades masks imperfect transitions; drop animation on things done many times a day.
- [Building a toast component](https://emilkowal.ski/ui/building-a-toast-component) **[V]**: stacked toasts, each scaled 5% per depth step (0.95, 0.9), offset by index; enter from `translateY(100%)` using CSS *transitions* (interruptible, retargetable) not keyframes; `400ms ease`; swipe-to-dismiss by velocity (distance/time, cutoff ~0.11) not only distance; pointer capture; rubber-band friction when dragging against the dismiss direction; 4s default, timer pauses on hover/tab hidden; pseudo-elements bridge gaps so hover stays stable.
- [animations.dev](https://animations.dev) **[V, thin]**: course page; stresses easing/duration choice, "when not to animate", and a Dynamic Island spring walkthrough. No numbers on the page.
- Vaul ([site](https://vaul.emilkowal.ski), [repo](https://github.com/emilkowalski/vaul)) **[V, thin]**: drawer component; repo now marked unmaintained. Snap points / background-scale / velocity release are the known pattern **[M]**. Copy the behaviour, not necessarily the dependency.
- Toast visual look: Sonner's own site shows neutral default, optional "rich colors", plain terse copy ("Event has been created.") [sonner](https://sonner.emilkowal.ski) **[V]**.

### Rauno Freiberg ([Web Interface Guidelines](https://interfaces.rauno.me/), [craft](https://rauno.me/craft))
- Guidelines **[V]**: interaction animations under 200ms; scale in proportion to size (dialogs from ~0.8, buttons press to 0.9-0.96, never 0); hover only under `@media (hover: hover)`; replace `-webkit-tap-highlight-color` with a real press state; no dead space between list items (pad the item, not the gap); `pointer-events:none` on decorative glows; show feedback next to the trigger (inline checkmark after copy, not a toast); optimistic updates with rollback; 16px+ inputs to stop iOS zoom; no autofocus on touch; pause off-screen loops; disable transitions on theme switch.
- Craft index **[V, titles only]**: Toolbar Morph, Exclusion/Flashlight Tabs, Gooey Tooltip, Blur Reveal, Hold-to-confirm, Animated Checkboxes; essays "Invisible Details of Interaction Design", "Designing Depth", "Contrasting Aesthetics". Good source for tab-bar and toolbar morphs.

### Josh W. Comeau (whimsy)
- [Squash and stretch](https://www.joshwcomeau.com/animation/squash-and-stretch/) **[V]**: keep subtle (25-50% range); bottom-center transform-origin so objects stay "grounded"; spring config `stiffness 300, damping 12` for elastic feel; wrap in `@media (prefers-reduced-motion: no-preference)` or check `matchMedia` in JS.
- [3D button](https://www.joshwcomeau.com/animation/3d-button/) **[V]**: stacked shadow/edge/front layers, animate `transform` only; very fast press (~34ms), slow springy release with overshoot curve; edge gradient; `:focus-visible`; save flashy buttons for big moments, not routine ones.
- [Springs in CSS `linear()`](https://www.joshwcomeau.com/animation/linear-timing-function/) **[V]**: generate with a tool, ~50 points for convincing result, `@supports` + `cubic-bezier(0.34,1.4,0.64,1)` fallback, store as tokens; caveat: reversed mid-flight transitions don't carry momentum (use JS/WAAPI springs where interruptibility matters).
- [Spring physics intro](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/) **[V]**: mass/tension/friction; sandbox starts mass 1.75, tension 200, friction 12; "most of my springs aren't bouncy"; don't spring color/opacity.

### Benji Taylor / Family ([family.co](https://family.co), [bio](https://iq.wiki/wiki/benji-taylor.md))
- **[V, copy only]** Site sells "seamless animations between states", testimonials praise micro-animations and animated numbers; copy is short, warm, confident ("Family takes fun seriously."), jargon translated to plain language. Visual specifics (palette, fonts, radii) could not be fetched; widely cited for tactile haptic-paired springs and morphing sheets **[M]**. Take: motion between states (shared-element morphs) carries the "premium", copy carries the "playful".

### Things 3 / Cultured Code ([MacStories review](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/))
- **[V]** tap a row and it pops out into a card while the list recedes (spatial continuity); long-press lifts an item like a physical object; Magic Plus drags to a destination; Taptic feedback on drag, plus-button and pull-to-search; "thoughtful splashes of color" on a calm base; bold type. Lesson: one accent, color rationed, physics for everything draggable.

### Duolingo (mascot use) ([Reshaping Duo](https://blog.duolingo.com/reshaping-duo/), [design.duolingo.com](https://design.duolingo.com/illustration))
- **[V via search + fetch]** silhouette first, details later; very simple geometry (wings are half circles tucked behind the body); built for animation; one fixed brand color; unified geometric flat style; mouths are the one non-geometric, expressive shape; no fingers (creepy); pupils centered. Lesson for our mascot: 3-4 primitives, one signature color, expression carried by eyes/mouth/ears, never by clutter. (Duolingo's *usage* is loud; we should borrow construction, not volume.)

### Bluesky ([native-feel post](https://whtwnd.com/samuel.bsky.team/3l777nhz4h32w) failed to load; search snippets only) **[V, partial]**
- Hairline borders and scale-on-press added to make RN feel native, most visible on the bottom tab bar; animated like button honours reduced motion ([PR #5033](https://github.com/bluesky-social/social-app/pull/5033)). Visual identity (Inter-ish type, sky blue) **[M]**.

### Spotify heart ([article](https://open.spotify.com/article/bringing-the-spotify-heart-to-life))
- Fetch redirected and was not completed. Search snippet **[V]**: adding delight to the like action made people use it more. Burst design details **[M]**.

### Not verifiable here (listed so nobody assumes they were studied)
Cara (only press/user-growth coverage found: [TechCrunch author](https://techcrunch.com/author/jingna-zhang)), Halide/Lux, Arc, Linear, Raycast, Mercury, Amie, Daylight, Retro, Glass, VSCO, Tumblr, Pinterest, Paco Coursey/cmdk, Mariana Castilho, Jordan Singer, Not Boring. General knowledge **[M]**: Glass/Halide/Retro all use near-black neutrals, tiny chrome, content edge-to-edge; Raycast/Linear use restrained gradients and tight type; Amie/Daylight lean soft, pastel, rounded. Recommend a 30-minute manual pass through Mobbin/Godly on Cara, Glass, Retro, Bluesky before locking visuals.

## 2. Cross-source principles (the "why")
1. **Cute lives in shape and copy; premium lives in restraint and physics.** Round corners and a friendly voice, but few colors, few shadows, fast motion.
2. **Art is the star: chrome is neutral, recedes, and uses one accent.** Things 3 rations color; Bluesky uses hairlines not boxes; Rauno: feedback inline, not in toasts.
3. **Motion budget**: press ~100-150ms at 0.96-0.97; enter/exit 180-300ms ease-out; springs only for physical, draggable, or celebratory things; no motion on high-frequency actions.
4. **Interruptible by default** (CSS transitions or WAAPI/JS springs, not fire-and-forget keyframes).
5. **Origin-aware, spatially continuous** transitions (card to profile, tile to sheet).
6. **Haptic-like feedback** on the web = tiny scale + color change + `navigator.vibrate(8-10)` where supported (Android only; iOS Safari ignores it).

## 3. Three candidate visual directions (dark mode)

### A. "Warm Plum Night" (soft kawaii-premium)
- Concept: late-evening gallery lit by a peach lamp; cozy, soft, a little sparkly.
- Palette: bg `#141118`, surface-1 `#1C1822`, surface-2 `#25202D`, hairline `rgba(255,240,230,.08)`, text `#F4EEF2`, muted `#A79FB0`, accent peach-coral `#FF9C7A` (hover `#FFB195`), love `#FF6B8B`, success mint `#7FE0B5`.
- Type: **Nunito** (rounded, display 700/800) + **Inter** body; or **Fredoka** for the logo/empty-state headlines only. Tabular nums from Inter.
- Shape: 20-24px cards, 14px inputs, pills for chips/buttons, squircle-ish avatars (radius 38%); no hard borders, hairlines + tonal elevation.
- Motion: gentle springs (stiffness ~260, damping ~20, slight overshoot only on follow/heart), 200ms ease-out for sheets.
- Mascot: soft-geometry fox/dog head from 3-4 primitives, single peach accent, closed-eye smile; appears only in empty states/onboarding/pull-to-refresh.

### B. "Ink & Ember" (art-gallery minimal, playful details)
- Concept: near-black matte gallery, art uncropped, one ember-orange accent; cuteness only in micro-moments.
- Palette: bg `#0E0E10`, surface `#17171A`, raised `#1F1F23`, hairline `rgba(255,255,255,.07)`, text `#EDEDED`, muted `#8E8E96`, accent ember `#FF8A3D`, love `#FF5C7A`.
- Type: **Bricolage Grotesque** (display, quirky yet refined) + **Geist** or **Inter** body; optional **DM Mono** for tag/count microcopy.
- Shape: 16px cards, 12px controls, pill chips; mixed (rounded containers, sharp-ish art edges optional 12px).
- Motion: snappy, mostly ease-out 150-250ms; springs reserved for follow/heart/sheet release.
- Mascot: line-drawn single-stroke character with accent fill; small (64-96px), never animated beyond blink/tilt.

### C. "Bubblegum Arcade" (maximal cute)
- Concept: sticker-sheet energy, saturated pastels over deep navy, bouncy everything.
- Palette: bg `#12121F`, surface `#1B1B2E`, accent hot pink `#FF7AC6` + butter `#FFD36E` secondary.
- Type: **Baloo 2** or **Fredoka** display + **DM Sans** body.
- Shape: 28px+ blobs, thick 2px outlines, chunky icons.
- Motion: pronounced squash and stretch, springs everywhere.
- Mascot: full character with outfits/poses.

### Recommendation: **A, tuned toward B's restraint** ("Warm Plum Night, ink-quiet chrome")
Take A's warm peach accent, plum-tinted neutrals and Nunito/Inter pairing; take B's discipline (hairlines, 16-20px cards, springs only on 3 moments). C reads childish against explicit art and fights the content (see anti-patterns). Neutrals tinted ~3-5% warm/plum make art pop without looking sterile gray. Verify AA contrast on `#A79FB0`-on-`#1C1822` (about 6:1, fine) and accent-on-dark for text use.

## 4. Patterns to steal

| Element | Pattern | Source(s) |
|---|---|---|
| **Feed card header row** | 32-36px squircle avatar, name (600) + muted `@handle · 3h` on one line, trailing `…` and a compact Follow pill that *disappears* once following (reduce chrome); whole row is a 44px+ tap target to the profile; hairline separator, no card border; art edge-to-edge or 20px radius with 0 shadow. | Bluesky hairlines [V partial]; Rauno "no dead space / pad the item" [V]; Things "spatial continuity" [V] |
| **Artist suggestion tiles** | Prefer a horizontally snap-scrolling rail of *art-led* tiles: 3 thumbnails collage (1 large + 2 small, 16px radius) over avatar + name + one-line "why" ("because you like @x"), single Follow pill, dismiss `x`. Better than avatar-only circles because the art is the pitch. Snap with `scroll-snap-type:x mandatory`, peek next tile at 12%. | Pinterest/Cara/Tumblr pattern [M]; Rauno hit-target rules [V] |
| **Artist profile header** | Blurred, darkened banner derived from latest art (blur 40px, 60% scrim, `mask` fade into bg), 72px squircle avatar overlapping, display name in Nunito 800, stat row as tappable chips (works, followers), sticky compact header (avatar+name+Follow) that morphs in on scroll via shared-element transition. | Toolbar Morph [V title], Things card pop [V], Glass/Retro minimal-profile feel [M] |
| **Follow button states** | `Follow` (accent fill, pill) → press `scale(.96)` 100ms → morph width to `Following ✓` (tonal surface, accent text) with 260ms spring; check path draws 180ms; 6-8 tiny accent sparkles radiate once, 400ms, then settle. Tap again → confirm only via undo toast, no modal. Optimistic with rollback. | Josh 3D-button easing split [V]; Sonner/optimistic rule [V]; Spotify heart delight [V snippet] |
| **Tab bar** | 4 tabs, 56px + safe-area, translucent surface (`backdrop-filter: blur(20px) saturate(1.4)` on surface at 80% alpha), filled icon + accent for active, outline + muted for inactive, a sliding pill indicator behind active icon (spring, 280ms), press-scale 0.92 on icon, label only on active (optional). No badge dots except Following "new". | Bluesky scale-on-press tab bar [V partial]; Rauno Exclusion/Flashlight Tabs [V title] |
| **Chips** | 32-36px pills, surface-2 fill, hairline, selected = accent tint bg (accent @16%) + accent text + hairline accent @40%; tap = 0.96 press and instant state change (no animation on filter-heavy toggling beyond 120ms color). Horizontal scroll with edge fade mask, no scrollbars. | Rauno "skip animation on frequent actions" [V] |
| **Empty states with mascot** | Mascot 120px, one expressive pose per context (sleepy = nothing yet, peeking = no results, party = caught up), headline in rounded display font (max 6 words), 1-line body, ONE primary action. Idle: slow 4-5s breathe/ear-twitch, paused off-screen and under reduced-motion. | Duolingo geometry rules [V]; Family tone "short, warm" [V copy] |
| **Toasts** | Bottom, above tab bar; 16px radius, surface-2, hairline, 14px text, optional inline `Undo`; swipe-down dismiss by velocity; stack with 0.95 scale per depth; 4s, pauses on hold; cap at 1-2 visible; use inline feedback (check-swap) instead of toast where the trigger is visible. Copy: "Followed @name · Undo", not "Successfully followed!". | Sonner article [V], Rauno inline-feedback rule [V] |
| **Bottom sheet** | Handle 36x4 pill; top radius 28px; backdrop dims to 50% black; page behind scales to 0.96 and rounds (drawer feel); drag with velocity-based snap (peek / half / full), rubber-band past limits, scroll-lock handoff (content scrolls only at full & scrollTop 0); open 280ms ease-out spring-ish; origin = trigger. | Vaul [V thin + M]; Emil tips [V]; Things lift/pop [V] |
| **Heart / favorite burst** | Double-tap on art = big heart pop at tap point (scale 0.6→1.15→1, 450ms, fades), the small heart icon does fill + 1.25 pop; 6 tiny particles in love color + one accent, radiate 14-22px, 350ms; first favorite of the day gets slightly bigger burst. Optimistic. Under reduced-motion: instant fill + color change only. | Spotify heart [V snippet: delight raises usage], Bluesky animated like w/ reduced motion [V partial], Josh squash/stretch [V] |
| **Pull-to-refresh indicator** | Mascot-lite: ears/tail or a paw-print that fills with pull progress (0→1 tracks drag with resistance 0.5), snap-release spring; "wiggle" while loading; success = tiny nod then collapse 200ms. Don't hijack native PTR on iOS unless controlling `overscroll-behavior` deliberately. | Things pull-down haptic feel [V]; mobile-native PTR caveat [M] |
| **"You're caught up" divider** | Thin hairline with centered chip: small sparkle/check glyph + "You're all caught up" (muted, 13px), below it a soft "Older art you may have missed" label; sparkle does one 600ms twinkle when first scrolled into view (IntersectionObserver, once per session). | Common social pattern (Instagram/Bluesky) [M]; Family warm copy [V] |

## 5. Microinteraction ideas, ranked by delight ÷ effort

| # | Idea | Inspiration | Implementation note |
|---|---|---|---|
| 1 | Press-scale on every tappable (0.96-0.97) | Emil tip 1 [V], Rauno [V], Bluesky [V partial] | CSS `:active{transform:scale(.97)}` with 120ms ease-out; global utility class. Wrap hover rules in `@media (hover:hover)`. |
| 2 | Heart pop on favorite | Spotify/Bluesky | WAAPI keyframes `[scale 1, 1.3, 1]` 300ms with `linear()` spring easing; fill color swap; reduced-motion: no scale. |
| 3 | Follow → Following morph + check draw | Josh 3D button, Family | Animate width via FLIP or fixed-width swap; SVG check `stroke-dashoffset` 180ms; spring token. |
| 4 | Sliding tab indicator | Rauno tabs, Bluesky | One absolutely-positioned pill, `transform: translateX()` transition with spring `linear()`; reduced-motion: instant. |
| 5 | Double-tap big heart | Instagram pattern [M] | Spawn element at pointer coords, WAAPI scale/opacity 450ms, remove on `finish`; reduced-motion: brief opacity-only flash. |
| 6 | Toast with swipe + stack scale | Sonner [V] | CSS transitions on `transform`, pointer events with velocity cutoff ~0.11; no keyframes (interruptible). |
| 7 | Bottom sheet that scales the page behind | Vaul, iOS | Sheet `translateY` driven by pointer; page wrapper `scale(.96)` + radius; velocity snap; reduced-motion: fade only. |
| 8 | Chip select tint crossfade 120ms + haptic tick | Rauno [V] | `transition: background-color, color 120ms`; `navigator.vibrate?.(6)` guarded. |
| 9 | Mascot idle blink/ear-twitch in empty state | Duolingo [V construction] | Inline SVG, CSS keyframes on eyes/ears 4-6s loop with `animation-delay`; pause via `IntersectionObserver`; reduced-motion: static pose. |
| 10 | Image fade-in with blur-up (blurhash/dominant color) | Emil blur masking [V] | `opacity` + `filter: blur(8px→0)` 250ms on `onLoad`; skip for cached/instant loads. |
| 11 | Follow sparkle burst (6 dots) | Spotify delight, Josh squash [V] | 6 absolutely-positioned spans, WAAPI translate+opacity staggered 0-40ms, remove on finish; only on follow, not unfollow. |
| 12 | Pull-to-refresh paw fill | Things pull haptics [V] | Track `touchmove` delta with 0.5 resistance; map to SVG `stroke-dashoffset`; release springs; honor `overscroll-behavior`. |
| 13 | Caught-up sparkle twinkle once | Family warm copy [V] | IntersectionObserver once; 600ms `opacity/scale` keyframe; reduced-motion: none. |
| 14 | Slideshow next-art crossfade with tiny scale (1.02→1) | Things continuity [V], Emil blur trick [V] | Two stacked layers, 250ms crossfade; Ken Burns *off* by default; reduced-motion: cut. |
| 15 | Streak/"nth favorite today" micro-message in toast | Duolingo tone [M] | Counter in localStorage; copy variants; zero animation cost, never nag. |

All motion: gate with `@media (prefers-reduced-motion: no-preference)` (Josh [V]); provide one `--spring-*` token set with `cubic-bezier(0.34,1.4,0.64,1)` fallback.

## 6. Anti-patterns

**Cute tipping into childish/cluttered**
- Mascot on every screen or reacting to every tap; speech bubbles; confetti for routine actions (Josh: save flashy for big moments [V]).
- Saturated multi-color accents on dark art (accent should be one hue; art supplies the rest).
- Bounce on everything / springs on color and opacity (Josh: springs not for those [V]); overshoot above ~10% on routine UI.
- Thick outlines, drop-shadow stickers and emoji as icons; mixing icon weights.
- Cute copy that blocks clarity ("Oopsie woopsie!") or nags; exclamation overload. Keep cute in headlines, plain in errors.
- Animations >300ms on frequent actions; looping idle motion that never stops (pause off-screen [V]).

**Premium tipping into generic AI-template**
- Purple-to-blue gradient glows, glassmorphism everywhere, gradient text, Inter-only with 12px rounded-everything cards and identical shadow stacks.
- Uniform card grids with icon-in-circle headers; decorative blur blobs; neon borders.
- Pure `#000` bg with `#fff` text (harsh); gray neutrals with no hue tint.
- Chrome competing with art: heavy borders, drop shadows on art, labels/pills over the image, persistent overlays.
- Fake polish: every element animates on mount (staggered fade-up on a feed), parallax on art, tap-highlight flashes, hover states stuck on touch ([Rauno](https://interfaces.rauno.me/) [V]).
- No reduced-motion path; transitions that can't be interrupted.

## 7. Open items
- Manually review (screens, not text) Cara, Glass, Retro, Halide, Family on Mobbin/Godly; our fetcher could not extract their visuals.
- Confirm Vaul alternatives (unmaintained) or build the sheet with pointer events + WAAPI.
- Mascot concept: pick species/silhouette (fox? dog?) before illustration; derive from 3-4 primitives, one accent.
