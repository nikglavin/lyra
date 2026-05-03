# AI Slop Patterns — Extended Reference

This file tracks "beginner" or "AI-generated" negative patterns. It is used to audit designs for generic, low-effort, or
"statistical mean" outputs that lack intentional craftsmanship.

---

## 1. Color & Gradient Patterns

### slop:gradient-purple-blue

**What:** Hero backgrounds fading from mid-purple (~`#7c3aed`) to mid-blue (~`#3b82f6`) at a 135° angle. **Why:** The default
Midjourney/Stable Diffusion palette of 2023. Signals "I used the first suggestion." **Fix:** Replace with a solid brand color
or a subtle gradient between two shades of the same hue.

### slop:gradient-pink-orange

**What:** Pink-to-orange "sunset" gradients, usually as CTA button backgrounds. **Why:** Instagram-era default. Carries
"vibes" but does no work for differentiation. **Fix:** Pick a single accent color tied to the brand.

### slop:the-llm-glow-aura

**What:** Diffuse radial gradients or "blobs" placed behind hero images or text. **Why:** A visual crutch used to create
depth without building a layout. Often creates muddy contrast. **Fix:** Use 100% solid backgrounds. Create depth through
layering, grids, or distinct border treatments.

### slop:default-tailwind-blue

**What:** Primary color is strictly `#3b82f6` (Tailwind `blue-500`) with no supporting theme. **Why:** Signals "I didn't
configure a brand palette." **Fix:** Define a custom primary palette and replace generic `blue-*` references.

---

## 2. Shape, Surface & Border Patterns

### slop:rounded-everything

**What:** Uniform `rounded-2xl` or `3xl` applied to every surface—cards, buttons, inputs, images. **Why:** Collapses shape
hierarchy. If everything is rounded the same, nothing reads as primary. **Fix:** Define roles: `sm` for inputs, `md` for
cards, `lg` for feature tiles.

### slop:inconsistent-radii

**What:** Small components (search bars, buttons, chips) having "near-miss" radii (e.g., 8px vs 10px). **Why:** Makes the
design feel unpolished and amateur. **Fix:** Standardize corner radii for all small UI components (e.g., set all to 10px) for
consistency.

### slop:unnecessary-strokes

**What:** outlines or strokes around every element, often used to "fix" contrast issues. **Why:** Adds massive visual noise.
Signals a lack of confidence in the layout. **Fix:** "Rip them out." If contrast is needed, use a very faint, subtle
background shift.

### slop:excessive-dividers

**What:** dividers used between every section. **Why:** Adds massive visual noise and reduces the flow of content. **Fix:**
"Rip them out." Use margins or backgrounds to create separation between content.

### slop:uniform-card-shadow

**What:** Every card has the same harsh drop shadow at the same offset. **Why:** Shadows encode elevation. Uniformity makes
elevation meaningless. **Fix:** Define 3 elevation levels. Use a light gray shadow, increase blur significantly, and lower
opacity.

### slop:glassmorphism-navbar

**What:** `backdrop-blur` semi-transparent panel with near-zero information density. **Why:** A 2021 trend used as a default
for "modern." Often lacks functional decision-making. **Fix:** Use a solid background and add navigation density (sections,
search, account menu).

---

## 3. Layout & Flow Patterns

### slop:dead-end-flows

**What:** Selection screens (categories, allergies, filters) that lack a Search bar or a Skip/None option. **Why:** Forces
users into a box. Signals a lack of real-world UX planning. **Fix:** Always include a search bar for unlisted items and a
"Skip" option for users who don't fit presets.

### slop:cramped-mobile-stack

**What:** Elements packed too tight, especially on mobile, without enough vertical white space. **Why:** Beginner UIs often
fear "empty space." **Fix:** Use a column grid and increase vertical spacing. Mobile requires more "breath" than desktop.

### slop:bento-grid-hero

**What:** Landing page "features" using a bento-grid where every tile is equally loud. **Why:** Imitates Apple's aesthetic
without hierarchy. **Fix:** One tile must be the primary hero (larger, higher contrast), while others support it.

### slop:generic-feature-grid

**What:** Three identical icon-headline-blurb cards in a row. **Why:** The 2019 SaaS template. Every feature is sold with the
same weight, so nothing is memorable. **Fix:** Pick the most differentiating feature and give it a unique treatment
(screenshot or demo).

---

## 4. Iconography & Component Patterns

### slop:mismatched-icons

**What:** Icons in the same section with different stroke widths, fill styles, or corner roundness. **Why:** Signals icons
were grabbed from random free sets without curation. **Fix:** Use a single library (e.g., Phosphor). Match stroke width
(e.g., all 2px) and style across the app.

### slop:unlabeled-bizarre-icons

**What:** Using abstract icons without text labels for navigation (beyond Home/User/Search). **Why:** Slows down the browsing
process. **Fix:** Use tooltips or text labels. If icons are well-known, ensure they are visually separate from functional
icons.

### slop:redundant-indicators

**What:** Including UI arrows (e.g., "Next" arrows) on sections where the user can clearly swipe. **Why:** Visual clutter
that adds nothing to the UX. **Fix:** Remove redundant arrows and rely on clean, interactive feedback.

---

## 5. Copy & Typography Patterns

### slop:gpt-body-copy

**What:** "In today's fast-paced world," "Unlock the power of," "Seamlessly integrate." **Why:** High word count, zero info
density. GPT's default for "professional speak." **Fix:** Replace with concrete claims. "Seamlessly integrate" → "Works with
Google Docs in 2 clicks."

### slop:eyebrow-text-overload

**What:** All-caps labels placed above every heading (e.g., **FEATURES**). **Why:** A visual crutch used to make a page feel
"designed" when the copy is weak. **Fix:** Only use eyebrow text for genuine categorization. If the heading is clear, delete
the eyebrow.

### slop:semantic-overload-headings

**What:** Bold or italics applied to specific words inside a primary heading. **Why:** Creates a "double highlight" that
breaks reading rhythm. **Fix:** Let the heading typeface do the work. Avoid mixing weights/styles in a single line.

---

## 6. Interaction & Data Patterns

### slop:interactive-feedback-void

**What:** Clicking an icon or button yields no visual change until the next screen loads. **Why:** Makes the app feel broken
or laggy. **Fix:** Add micro-interactions (e.g., a button graying out, a Red Dot appearing on a tab when saved).

### slop:the-dribbble-chart

**What:** Charts with rounded bar tops, no vertical axis, or mismatched data points. **Why:** Prioritizes aesthetics over
useful information. **Fix:** Use a vertical axis. Use flat bar tops for readability. Ensure data logic (e.g., 7
