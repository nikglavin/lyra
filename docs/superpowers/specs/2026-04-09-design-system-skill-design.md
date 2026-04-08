# Design System Skill — Spec

**Date:** 2026-04-09  
**Status:** Approved  
**Skill location:** `~/.claude/skills/design-system/SKILL.md`  
**Invocation:** `/design-system`

---

## Overview

A personal Claude Code skill that acts as a Senior Design Architect & System Consultant. When invoked, it interviews the user
to understand their product's aesthetic vision and context, proposes a specific design direction for approval, then generates
two artifacts: a `DESIGN.md` Architect's Ledger and a self-contained `moodboard.html` that is itself styled to embody the
proposed design system.

The skill combines Audi-grade precision (clarity, technical intelligence, emotional resonance) with Uber Base utility
(accessibility, systematic consistency). It is a **Technique skill** — follow exactly, do not adapt.

---

## Experience Principles

- **Proposer, not asker.** After gathering mission context, the skill synthesizes and proposes a specific aesthetic direction
  rather than asking open-ended questions about color and feel. Discovery is front-loaded; judgment is exercised by the
  skill.
- **Benchmark-driven logic.** The Audi/Uber/Bespoke choice is the primary signal for all downstream decisions. It is asked
  second, immediately after mission context.
- **Reject the Generic Middle.** If the output could belong to any product, the skill has failed. Every design system must
  have a distinct identity.
- **The mood board is a design artifact, not a reference grid.** Its visual treatment must embody the proposed system —
  background, typography, atmosphere, and layout all reflect the direction.

---

## Skill Flow

### Phase 1: Discovery (5 AskUserQuestion calls)

Questions are asked **one at a time** using the `AskUserQuestion` tool.

#### Q1 — Mission (open-ended, consolidated)

Combines product type, primary user, and primary action into one question:

> "Tell me about what you're building: what is it, who uses it, and what's the single most important thing they need to
> accomplish?"

This is an open-ended text input. The answer feeds all downstream logic.

**Contextual logic:** If the Mission answer implies a marketing or editorial surface (landing page, brand site, campaign),
the skill auto-weights toward Visual Storytelling / Editorial aesthetic regardless of the benchmark chosen in Q2.

---

#### Q2 — Benchmark (elevated, AskUserQuestion)

Options:

- **Audi** — Precision, luxury, technical intelligence, emotional resonance
- **Uber Base** — Utility, accessibility, systematic consistency, high-velocity
- **Blend** — Both paradigms, balanced
- **Bespoke** — Fully custom direction, no benchmark

This is the "design logic" signal — the strongest single input into the system.

---

#### Q3 — Information Density / Intensity (new, AskUserQuestion)

Options:

- **Single-focus** — Landing page, onboarding flow, one primary action
- **Standard app** — Nav + content, moderate complexity
- **High-density** — Multi-pane SaaS, dashboard, data-heavy interface

Determines spatial rhythm, information architecture, and typographic hierarchy intensity.

---

#### Q4 — Design Tension (replaces brand adjectives, AskUserQuestion)

User picks one pole from opposing tensions. Options (pick the pair most relevant after Q1–Q3, or present all):

- Invisible & Utility-first vs. Technical & Expressive
- Structured & Systematic vs. Editorial & Breathing
- Reserved & Restrained vs. Bold & Ownable

Multi-select is off — the user commits to one tension direction.

---

#### Q5 — Anti-Persona (AskUserQuestion)

> "What's one thing this interface must never look like?"

Options:

- Generic SaaS blue + rounded cards
- Bubbly, friendly, consumer-app softness
- Flat/minimal to the point of emptiness
- Corporate enterprise grey
- Other (free text)

This creates trust by demonstrating the skill understands "design slop." The answer becomes a hard guardrail in `DESIGN.md`.

---

### Phase 2: Proposer Mode

After Q5, the skill synthesizes Phase 1 answers internally and makes a **specific, opinionated proposal**. No code, no files
yet. Delivered as an `AskUserQuestion`:

> _"Because you're building [X] for [Y users] using the [Benchmark] paradigm at [Intensity] density, leaning [Tension pole],
> I'm proposing:_
>
> - _[Specific color direction, e.g. High-contrast dark mode with warm amber accents]_
> - _[Specific typographic hierarchy, e.g. Monospace display headers + humanist body]_
> - _[Spatial approach, e.g. Tight 4px grid with deliberate negative space punctuation]_
> - _[Signature move description]_
>
> _Does this feel right, or should we pivot?"_

Options:

- **Confirm** — Proceed to Safe/Risk package and artifacts
- **Pivot** — One follow-up AskUserQuestion to recalibrate direction, then re-propose
- **Modify** — Free text to adjust specific elements, then re-propose

**If user confirms:** proceed to Phase 3.  
**If pivot/modify:** one recalibration question, then synthesize again and re-propose. Maximum one pivot cycle. If the user
rejects the second proposal, the skill proceeds with the closest matching direction and notes the unresolved tension in the
DESIGN.md Decision Log.

---

### Phase 3: Safe / Risk Package

Before writing files, the skill presents the Safe/Risk package as text output (not a question):

**Safe (2–3 decisions):**  
Table-stakes choices the system must make regardless of aesthetic direction (e.g., high-contrast accessibility ratios,
keyboard navigation support, semantic color naming).

**Risk (2–3 decisions):**  
Deliberate departures from convention. Each entry states:

- The choice
- The aesthetic gain
- The trade-off

Example: _"Risk: Monospace display type at H1/H2. Gain: Technical authority, unmistakable brand signature. Trade-off:
Requires careful sizing — monospace reads dense at small scales."_

The user reads this as context before artifacts are generated. No approval gate here — it is informational.

---

### Phase 4: Artifact Generation

Generate both files. No other code output.

---

## Artifacts

### `DESIGN.md` — The Architect's Ledger

**Path:** `.design/DESIGN.md` (relative to current project root)

**Sections:**

1. **Experience Principles** — Why this specific aesthetic was chosen for this context. Grounded in Mission, Benchmark, and
   Tension answers. Not generic design theory.

2. **Token Map**
   - Typography: font faces, sizes (scale), weights, line heights, letter-spacing
   - Color: hex values with role labels (Primary, Surface, Accent, Semantic Error/Warning/Success, Text hierarchy)
   - Spacing scale (e.g., 4px base unit, named increments)
   - Border radius scale
   - Motion tokens (duration + easing for the signature interaction)

3. **Safe / Risk Decision Log** — Table format. Each Risk entry: choice, gain, trade-off.

4. **Anti-Persona Guardrails** — Derived from Q5. What this system must never become. Written as hard constraints, not
   suggestions.

5. **The Signature Move** — One "Unforgettable" interaction: what it is, when it fires, what emotional state it confirms.
   Described in enough detail to implement.

---

### `moodboard.html` — Visual System Artifact

**Path:** `.design/moodboard.html` (relative to current project root)

**Requirements:**

- Self-contained single HTML file — no external dependencies except Google Fonts (imported via `<link>`)
- Opens correctly with a double-click (no build step, no server required)
- **The mood board's own visual treatment embodies the proposed design system.** Background, typography, layout, atmosphere,
  and spacing all reflect the design direction. It is not a neutral white-background reference sheet.

**Sections (rendered on the page):**

1. **Color palette** — Swatches with hex values and role labels. Rendered against the system's own background color.

2. **Typography specimens** — H1 through H4 + body copy, rendered in the chosen typefaces at the full scale. Font constraint:
   **never Inter, Roboto, or Arial.** Always select from distinctive technical typefaces appropriate to the benchmark (e.g.,
   Satoshi, General Sans, IBM Plex Mono, DM Sans, Space Grotesk, Syne, Archivo).

3. **Spacing & radius token grid** — Visual ruler showing named spacing increments and border radius values as rendered
   boxes.

4. **Signature interaction** — One CSS-animated element demonstrating the proposed signature move. No JavaScript required.

5. **Two mobile layout previews** — 375px-wide frames rendered inline, showing the proposed spatial composition in context
   (e.g., a dashboard card + a detail view). Use the system's palette, typography, and spacing throughout. Must look like
   real screens from the product, not wireframes.

---

## Hard Constraints

| Constraint            | Rule                                                                |
| --------------------- | ------------------------------------------------------------------- |
| Typography            | Never Inter, Roboto, or Arial                                       |
| Generic output        | If the mood board could belong to any product, the skill has failed |
| Mood board neutrality | The mood board must be styled as a demonstration of the system      |
| HTML self-containment | No CDN dependencies beyond Google Fonts                             |
| Decision transparency | Every Safe/Risk choice must be explicitly reasoned                  |
| Pivot handling        | Re-synthesize fully on pivot — no partial patches                   |
| Skill type            | Technique — follow exactly                                          |

---

## File Structure

```
~/.claude/skills/
  design-system/
    SKILL.md

# Per invocation (in active project):
.design/
  DESIGN.md
  moodboard.html
```

---

## Out of Scope

- Component code (React, CSS, etc.)
- CSS custom property files / design token exports
- Figma integration
- Multi-brand or theme variants
- Accessibility auditing of generated output
