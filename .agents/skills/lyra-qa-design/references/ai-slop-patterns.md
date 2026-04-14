# AI Slop Patterns — Extended Reference

This file is the long-form companion to `lib/ai-slop/ai-slop.md`. The lib file has the short checklist for transclusion into
the audit phase; this file has the prose rationale and fix guidance. Use it when you need to explain a finding or want to
understand why something is on the list.

Each entry lists: what it is, why it reads as AI-generated, and what fixing it usually looks like.

---

## Color & gradient patterns

### slop:gradient-purple-blue

**What:** Hero backgrounds that fade from a mid-purple (~`#7c3aed`) to a mid-blue (~`#3b82f6`), usually at a 135° angle.

**Why it's slop:** This specific gradient became the Midjourney/Stable Diffusion default around 2023 and saturated the
AI-generated landing page corpus. When you see it without a product-specific justification (e.g. it's not a deliberate
reference to the product's brand colors), it signals "I used the first gradient suggestion."

**Typical fix:** Replace with a solid color tied to the brand identity, OR a subtle gradient between two shades of the same
hue (e.g. `#1e3a8a` → `#2563eb` — both blues, with a clear "same family" relationship).

---

### slop:gradient-pink-orange

**What:** Pink-to-orange "sunset" gradients, usually as CTA button backgrounds or section-divider treatments.

**Why it's slop:** Instagram-era default. Carries nostalgic "vibes" but does no work for differentiation. When every SaaS
uses it, it stops reading as "warm" and starts reading as "I didn't decide."

**Typical fix:** Pick a single accent color that ties to the brand. If you want warmth, tint a neutral background slightly
rather than using a full gradient.

---

### slop:gradient-orb-hero

**What:** Large soft blob / gradient orb / mesh gradient dominating the hero section with no purpose — not a product
screenshot, not an illustration, just abstract shape.

**Why it's slop:** It's the visual equivalent of filler words. The viewer's eye lands on a decorative shape instead of
product value.

**Typical fix:** Replace with an actual product screenshot, a relevant illustration, or empty space. Empty space is better
than a meaningless orb.

---

### slop:default-tailwind-blue

**What:** Primary color is `#3b82f6` (Tailwind's `blue-500`) used throughout the page with no supporting brand color.

**Why it's slop:** It's the "I installed Tailwind and didn't configure a theme" signal. It costs ~5 minutes to define a brand
color; skipping that step shouts "generic."

**Typical fix:** Define a custom `primary` palette in `tailwind.config.js` with at least 9 stops, tie it to an actual brand
color, and replace `blue-*` references with `primary-*`.

---

## Shape & surface patterns

### slop:rounded-everything

**What:** `rounded-lg` / `rounded-2xl` / `rounded-3xl` applied uniformly to every surface — cards, buttons, inputs, images,
modals, avatars. No shape hierarchy.

**Why it's slop:** When everything is rounded the same amount, nothing reads as primary. Shape hierarchy is a legitimate
design tool; collapsing it to one value loses signal.

**Typical fix:** Define at most three radius values (`sm` for inputs, `md` for cards, `lg` for feature tiles), apply them
consistently by component role. Never apply a radius to an element without asking "what role does this play?"

---

### slop:glassmorphism-navbar

**What:** Navbar is a `backdrop-blur` semi-transparent panel with near-zero information density (logo + 3 links + CTA), often
with a subtle white border.

**Why it's slop:** Glassmorphism peaked in 2021 and has since become a default for "make the navbar look modern." It signals
no real decision.

**Typical fix:** Use a solid background tied to the brand palette, add more navigation density (sections, search, account
menu), and drop the backdrop-blur unless it's solving an actual contrast problem.

---

### slop:uniform-card-shadow

**What:** Every card on the page has the same single drop shadow at the same offset. No depth hierarchy — primary cards look
identical to secondary cards.

**Why it's slop:** Shadows encode elevation. When everything is at the same elevation, elevation stops encoding anything.

**Typical fix:** Define 3 elevation levels (subtle / default / hover-lift) and apply by role. Primary cards get the highest
elevation; backgrounds get none.

---

## Layout patterns

### slop:bento-grid-hero

**What:** Landing page hero or "features" section uses a bento-grid layout (variable- sized tiles in a Mondrian-like pattern)
with every tile equally loud.

**Why it's slop:** Apple's iOS 17 keynote made bento grids inescapable in 2024. Without a genuine hierarchy (one hero tile,
several supporting tiles), it reads as "I wanted it to look like Apple."

**Typical fix:** If you're going to do a bento grid, assign roles: one tile is the hero (2× or 3× larger, highest contrast,
primary CTA), the rest support it. Or use a simpler grid — two rows of equal-sized cards work fine when the product is
simple.

---

### slop:generic-feature-grid

**What:** Three identical icon-headline-blurb cards in a row. Each blurb is ~2 lines. Icons are all from the same set. No
differentiation by importance.

**Why it's slop:** It's the SaaS landing-page template from 2019. Every feature is sold with the same weight, so nothing is
memorable.

**Typical fix:** Pick the single most differentiating feature and sell it hard with a screenshot, demo, or customer quote.
Push secondary features to a list below. Not every feature deserves a card.

---

### slop:empty-state-laptop-person

**What:** Empty-state illustration is a generic "person with laptop" SVG from a common free illustration set (Humaaans,
unDraw default palette, etc.).

**Why it's slop:** These sets saturated the market in 2019–2021. They're instantly recognizable and signal "I grabbed this
from a free library." They also fail at representing diverse audiences because the original sets were tuned to Silicon Valley
aesthetics.

**Typical fix:** Commission custom illustration, use a photo, use typography-only empty state, or use the actual product's
visual language (a dimmed UI preview, for example).

---

## Copy patterns

### slop:gpt-body-copy

**What:** Body copy reads like direct GPT output. Common offenders:

- "In today's fast-paced world…"
- "Unlock the power of…"
- "Seamlessly integrate…"
- "Elevate your workflow…"
- "Empower your team to…"
- "Revolutionize the way you…"
- "Built for the modern [thing]"

**Why it's slop:** These phrases became GPT's default openers because they were safe and impressive-sounding in the training
data. They carry zero specific information.

**Typical fix:** Replace with concrete, verifiable claims. "Unlock the power of collaboration" → "Works with your existing
Google Docs setup — no migration." Specific beats impressive every time.

---

### slop:lorem-ipsum-prod

**What:** Lorem ipsum or other placeholder text survived into a deployed environment.

**Why it's slop:** It signals a broken process, not a design choice. Always at least High severity — often Critical if it's
on a checkout or pricing page.

**Typical fix:** Replace with real copy. If real copy isn't ready, remove the section rather than shipping lorem ipsum.

---

### slop:heading-emoji-everywhere

**What:** Every H2/H3 on the page has a decorative emoji. Not one strategic emoji, every single heading.

**Why it's slop:** It's what copilots and AI assistants do by default to "make it friendly." Over-emoji'd headings read as
unprofessional and actively harm scannability.

**Typical fix:** Remove all decorative emoji from headings. If the brand voice is casual, use emoji sparingly in body copy or
icons in place of emoji for structural headings.

---

## Interaction patterns

### slop:hover-lift-scale-shadow

**What:** Every card hover triggers simultaneous lift + scale + shadow-bloom + color-shift. Five effects where one would do.

**Why it's slop:** Over-specified hover states feel performative. The user's eye tracks the animation rather than the
content.

**Typical fix:** Pick ONE hover effect per component class. Cards: subtle lift (translate −2px). Buttons: subtle color shift.
Links: underline. Never more than one per element.

---

### slop:transition-on-everything

**What:** `transition: all 0.3s` applied globally to every element, causing unwanted animation on color, width, padding
changes that should be instant.

**Why it's slop:** It looks like tutorial code. Real designers specify transitions explicitly per property per component.

**Typical fix:** Replace global `transition: all` with explicit `transition: color 150ms, background-color 150ms` (or
whatever the actual intent is). Instant-update properties (padding, width) should not transition unless specifically designed
to.
