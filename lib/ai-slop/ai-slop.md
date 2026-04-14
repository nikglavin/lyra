Walk this checklist during the design audit phase. Each positive match is a finding tagged `slop:<pattern-id>` with default
severity **Medium** unless context makes it worse (e.g. lorem ipsum in a production checkout flow is Critical, not Medium).

Scoring: each confirmed pattern deducts from `ai_slop_score` using the standard scale — −25 Critical / −15 High / −8 Medium /
−3 Low.

### Color & gradient smells

- **slop:gradient-purple-blue** — Hero background is a purple-to-blue or blue-to-purple linear gradient with no brand
  justification.
- **slop:gradient-pink-orange** — Hero or CTA uses a pink-to-orange sunset gradient. Same generic energy as purple-blue.
- **slop:gradient-orb-hero** — Large abstract blob / gradient-orb / mesh-gradient fills the hero and does no work (not a
  product shot, not an illustration, just vibes).
- **slop:default-tailwind-blue** — Primary color is `#3b82f6` (Tailwind's default blue) used with no supporting brand color
  anywhere on the page.

### Shape & surface smells

- **slop:rounded-everything** — `rounded-lg` / `rounded-2xl` / `rounded-3xl` applied uniformly to every surface: cards,
  buttons, inputs, images, modals, avatars. No shape hierarchy.
- **slop:glassmorphism-navbar** — Navbar is a `backdrop-blur` semi-transparent panel with near-zero information density and
  no clear brand anchor.
- **slop:uniform-card-shadow** — Every card on the page has the same single drop shadow at the same offset — no depth
  hierarchy.

### Layout smells

- **slop:bento-grid-hero** — Landing page uses a bento-grid pattern (variable-sized feature tiles) with no clear information
  hierarchy — every tile is equally loud.
- **slop:generic-feature-grid** — Three identical icon-headline-blurb cards in a row. Each blurb is ~2 lines. Icons are all
  from the same set. No differentiation by importance.
- **slop:empty-state-laptop-person** — Empty-state illustration is a generic "person with laptop" SVG from a stock
  illustration set (Humaaans, unDraw default palette, etc.).

### Copy smells

- **slop:gpt-body-copy** — Body copy reads like direct GPT output: "In today's fast-paced world…", "Unlock the power of…",
  "Seamlessly integrate…", "Elevate your workflow…", "Empower your team…", or similar filler phrases.
- **slop:lorem-ipsum-prod** — Lorem ipsum or placeholder text survived into a deployed environment. Always at least High
  severity.
- **slop:heading-emoji-everywhere** — Every H2/H3 has a trailing decorative emoji. Not "one emoji for tone" — every single
  heading.

### Interaction smells

- **slop:hover-lift-scale-shadow** — Every card hover triggers simultaneous lift + scale + shadow-bloom + color-shift. Five
  effects where one would do.
- **slop:transition-on-everything** — `transition: all 0.3s` applied globally, causing unwanted animation on color, width,
  padding changes that should be instant.

### How to decide severity

A pattern that a first-time visitor would notice within 5 seconds → High. A pattern that erodes trust on a second visit →
Medium. A pattern that a designer would flag but most users wouldn't → Low.

Refer to `references/ai-slop-patterns.md` in the calling skill for extended rationale on each pattern and typical fixes.
