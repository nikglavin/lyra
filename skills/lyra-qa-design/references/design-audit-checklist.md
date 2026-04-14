# Design Audit Checklist

Use this checklist during the baseline and final audit phases. Each category points at the corresponding `lyra-*` principle
skill — invoke it via the Skill tool for detailed guidance when making close calls.

---

## Phase 1: First impression (≤ 5 seconds)

Take the full-page screenshot at desktop width (1280 × 720). Before analyzing anything specific, answer three questions:

1. **Where does the eye land first?** Is that the intended focal point?
2. **Does this feel intentional or generated?** Trust your gut — this is the seed of the AI-slop score.
3. **What brand signals do you read?** Can you name the product category, the audience, the emotional tone? Or does it read
   as "generic SaaS"?

Record one-sentence answers. They frame every finding that follows.

---

## Phase 2: Typography

**Consult:** `lyra-typography-system`

Check for:

- **Type scale coherence.** Are heading sizes on a consistent mathematical scale (1.25, 1.333, golden, etc.)? Or do they land
  on arbitrary pixel values?
- **Body readability.** Line length 45–75ch, line height 1.4–1.6 for body, larger for display. Contrast ≥ 4.5:1.
- **Hierarchy collapse.** When H2 and H3 look visually similar, hierarchy collapses and scanning breaks.
- **Font pairing.** If more than one font, do they serve distinct roles?
- **Weight usage.** Are weights used to differentiate importance, or are they random?

---

## Phase 3: Color

**Consult:** `lyra-color-theory`

Check for:

- **Palette coherence.** Can you name the primary, secondary, and neutral family? Or is every element a different random
  color?
- **Contrast.** Text/background pairs meet WCAG AA (4.5:1 body, 3:1 large).
- **Brand anchoring.** Is there a single dominant brand color that earns the eye, or is the page a rainbow?
- **State colors.** Error red, success green, warning yellow — are they used consistently and distinct from brand colors?

---

## Phase 4: Layout & grid

**Consult:** `lyra-grid-system`

Check for:

- **Grid alignment.** Do elements align to a consistent grid, or are they freely placed?
- **Spacing rhythm.** Gaps between sections, cards, inline elements — do they land on a consistent scale (4 / 8 / 12 / 16 /
  24 / 32)? Or are there arbitrary values?
- **Alignment consistency.** Does every section use the same content width / gutter / breakpoint? Mixed widths look
  unintentional.
- **Whitespace discipline.** Is whitespace used as a design element, or is every available pixel filled?

---

## Phase 5: Interaction & hierarchy

**Consult:** `lyra-ux-principles`

Check for:

- **Primary action clarity.** On every screen, can you identify the single primary action in ≤ 2 seconds? Are competing CTAs
  visually dampened?
- **Fitts' law.** Are important tap/click targets at least 44 × 44 px and near the edges where possible?
- **Feedback.** Does every interactive element respond to hover, focus, and press? Are loading states visible within 100 ms?
- **Affordance.** Do buttons look clickable? Do non-interactive elements avoid looking clickable?

---

## Phase 6: Responsive

**Consult:** `lyra-responsive-design`

Resize to:

- 375 × 812 (mobile)
- 768 × 1024 (tablet)
- 1280 × 720 (desktop-mid)

Check for:

- **Hierarchy preservation.** The primary action stays primary at every breakpoint.
- **Horizontal scroll.** No page should horizontal-scroll at any breakpoint except intentional carousels.
- **Touch targets on mobile.** 44 × 44 px minimum; adjacent targets have ≥ 8 px spacing.
- **Tap-not-hover.** Mobile does not reveal content that only appears on desktop hover.

---

## Phase 7: Brand consistency

**Consult:** `lyra-brand-storytelling`

Check for:

- **Voice consistency.** Does the copy across pages sound like the same author?
- **Narrative flow.** Does the page tell a story (problem → solution → proof → action)?
- **Content differentiation.** Does each section earn its place, or is there filler?
- **Photo / illustration tone.** Are images stylistically consistent?

---

## Phase 8: Design system coherence

**Consult:** `lyra-design-system`

Check for:

- **Token drift.** Are spacing, color, radius values consistent, or do you see "almost 16px" (14, 15, 17) values suggesting
  no token architecture?
- **Component reuse.** Are similar elements (buttons, cards, inputs) visually identical when they should be, or do they drift
  between pages?
- **Exception density.** How many one-off styles are there? Many one-offs → no design system.

---

## Phase 9: AI slop scan

Walk the checklist in `lib/ai-slop/ai-slop.md`. Refer to `references/ai-slop-patterns.md` for extended prose on each pattern.

---

## Finding severity guide

Each severity corresponds to a score deduction on both the `design_score` and the `ai_slop_score` (when the finding is tagged
`slop:*`). Both scores start at 100 and are floored at 0. See Phase 9 of `SKILL.tmpl.md` for the full scoring formula.

| Severity     | Deduction | When to use                                                              |
| ------------ | --------- | ------------------------------------------------------------------------ |
| **Critical** | −25       | Breaks brand trust on first impression; the user would close the tab.    |
| **High**     | −15       | Meaningful quality hit a first-time visitor would feel within 5 seconds. |
| **Medium**   | −8        | Polish issue felt subconsciously; erodes trust over repeated visits.     |
| **Low**      | −3        | Nice-to-have; invisible to most users but would fail a design review.    |
