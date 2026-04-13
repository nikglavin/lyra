# lyra-qa-design — Design Spec

**Date:** 2026-04-14 **Status:** Draft — awaiting review **Related work:** Requires targeted updates to `skills/lyra-qa` as
part of the same project.

## Summary

Port gstack's `design-review` skill into lyra as `lyra-qa-design`: a designer's-eye visual-QA skill that audits a live web
app, scores design quality and AI-slop presence, fixes findings in source code with atomic commits, and re-verifies. Driven
entirely by the Playwright MCP server.

Along the way, fix `lyra-qa`'s broken `computer_use` tool references (they map to nothing in Claude Code and cause the skill
to error on invocation), and extract the logic genuinely shared between both skills into new `lib/` modules.

## Goals

1. Ship a working `lyra-qa-design` skill that drives Playwright MCP, follows lyra conventions, and integrates cleanly with
   existing lyra skills.
2. Unbreak `lyra-qa` by replacing its `computer_use` references with real Playwright MCP tool invocations.
3. Reduce duplication between the two skills by extracting shared mechanical phases into `lib/` modules, matching the
   existing `lib/preflight` and `lib/output-dir` pattern.
4. Reuse lyra's existing design-principles skills (`lyra-typography-system`, `lyra-color-theory`, etc.) as sources of truth
   for audit criteria rather than reinventing them in the new skill.

## Non-goals

- **Native / React Native / Expo support.** XcodeBuildMCP is real and suitable, but out of scope for v1 — web only via
  Playwright MCP. Adding native surface support is a follow-up project.
- **Multi-target runs.** One skill invocation tests one surface. No combined web + native reports.
- **AI slop image library.** The lib ships with a text-only checklist. No reference-image directory. Can be added later
  without breaking changes.
- **`lyra-learn` skill.** Managing the `learnings.jsonl` store as a first-class skill is out of scope. The existing
  read/write behavior in `lyra-qa` is preserved and extracted to `lib/` so both skills share it.
- **Building any new gstack-style template engine.** Follows lyra's existing `{{lib/<path>/<file>.md}}` transclusion
  convention only.
- **Copying any gstack-specific content:** no preamble tiers, no telemetry, no persona blocks, no "outside voices" phase, no
  `$B`/`$D` binaries, no `~/.gstack/` paths, no target-mockup generation, no CDP-mode detection, no gstack slug setup.

## Architecture

### Carve-up

Pragmatic middle-ground sharing (option C from brainstorming): extract the mechanical scaffolding that is genuinely identical
between `lyra-qa` and `lyra-qa-design` into reusable `lib/` modules, but keep per-skill phase orchestration inline so each
`SKILL.tmpl.md` remains readable top-to-bottom.

### File tree

```
lyra/
├── lib/
│   ├── preflight/                    (existing, untouched)
│   ├── output-dir/                   (existing, untouched)
│   ├── clean-tree/                   NEW
│   │   └── clean-tree.md
│   ├── playwright-primitives/        NEW
│   │   └── playwright-primitives.md
│   ├── plan-discovery/               NEW
│   │   └── plan-discovery.md
│   ├── fix-discipline/               NEW
│   │   └── fix-discipline.md
│   ├── prior-learnings/              NEW
│   │   └── prior-learnings.md
│   ├── capture-learnings/            NEW
│   │   └── capture-learnings.md
│   └── ai-slop/                      NEW
│       └── ai-slop.md
├── skills/
│   ├── lyra-qa/
│   │   └── SKILL.tmpl.md             MODIFIED — replace computer_use refs, transclude new libs
│   └── lyra-qa-design/               NEW
│       ├── SKILL.tmpl.md
│       ├── references/
│       │   ├── design-audit-checklist.md
│       │   ├── ai-slop-patterns.md
│       │   └── design-report-template.md
│       └── templates/                (reserved, empty)
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-14-lyra-qa-design-design.md   (this file)
```

### New `lib/` modules

Each module follows the existing `lib/preflight/preflight.md` convention: a short, self-contained markdown fragment that
skills transclude via `{{lib/<name>/<name>.md}}`. Parameterization is done in prose ("replace `X` with your skill's value"),
matching how `lib/output-dir/output-dir.md` handles `SKILL_NAME`.

**`lib/clean-tree/clean-tree.md`**

The clean-working-tree gate. Runs `git status --porcelain`; if dirty, invokes `AskUserQuestion` with A) commit, B) stash, C)
abort; executes the choice. Verbatim from existing `lyra-qa` lines ~217–235. Zero per-skill variation.

**`lib/playwright-primitives/playwright-primitives.md`**

The "how to drive a browser" reference. Maps QA actions to Playwright MCP tool names
(`mcp__plugin_playwright_playwright__browser_navigate`, `browser_take_screenshot`, `browser_click`, `browser_type`,
`browser_fill_form`, `browser_console_messages`, `browser_resize`, `browser_snapshot`, `browser_hover`,
`browser_network_requests`, `browser_handle_dialog`, `browser_close`). Includes two guidance notes:

1. Use `browser_snapshot` to get semantic element refs — don't guess selectors from DOM inspection.
2. Screenshots come back inline in tool results — don't `Read` them separately the way the current lyra-qa template does.

This is the largest prose delta applied to lyra-qa: its entire "Browser Primitives" section and every inline `computer_use:`
pseudo-action gets rewritten.

**`lib/plan-discovery/plan-discovery.md`**

Phase 0 from current `lyra-qa` lines ~35–125 — scan for plan/spec docs via a `find`/`ls` combo, present via
`AskUserQuestion`, load the selected file, print a "QA Context Loaded" summary. Moves verbatim.

**`lib/fix-discipline/fix-discipline.md`**

The commit-per-fix discipline + risk heuristic + self-regulation rules. This is the substantive dedup.

Contents:

- "One commit per fix; never bundle" rule
- Commit-message format — parameterized: caller substitutes `FIX_PREFIX` with `fix(qa)` (for `lyra-qa`) or `style(design)`
  (for `lyra-qa-design`)
- Risk heuristic table, parameterized:
  - `lyra-qa`: +15% per revert, +5% per non-test file touched, +20% for unrelated files
  - `lyra-qa-design`: +15% per revert, +0% for CSS-only changes, +5% per JSX/TSX/component file, +20% for unrelated files
- "Stop and evaluate" rule: recompute every 5 fixes; if risk > 20%, stop and `AskUserQuestion` whether to continue
- Hard cap: parameterized as `FIX_CAP` — `lyra-qa-design` sets 30, `lyra-qa` leaves `FIX_CAP` unset (no cap, matching current
  behavior)
- Revert-on-regression: if a fix makes things worse, `git revert HEAD` and mark the finding deferred

**`lib/prior-learnings/prior-learnings.md`**

Extracted from current `lyra-qa` lines ~128–170. Reads `~/.lyra/projects/$SLUG/learnings.jsonl`, counts entries, parses the
JSONL, prints a summary grouped by type, applies relevant learnings throughout the session. Verbatim — both skills share the
same file, so learnings cross-pollinate.

**`lib/capture-learnings/capture-learnings.md`**

Extracted from current `lyra-qa` lines ~907–961. The "Capture Learnings" phase: reflect on what was genuinely non-obvious in
the session, log as JSONL to `~/.lyra/projects/$SLUG/learnings.jsonl`. Caller sets `SKILL_NAME` so the `"skill"` field in
each log entry is `"qa"` or `"qa-design"` as appropriate — filtering and provenance remain intact.

**`lib/ai-slop/ai-slop.md`**

A compact checklist of AI-generated-design smells used by `lyra-qa-design`'s audit phase. Text only — no reference images.
Patterns to include (initial list, to be refined when drafting the file):

- Purple-blue and pink-orange gradient hero backgrounds
- Abstract blob / gradient-orb hero imagery
- Default Tailwind blue (`#3b82f6`) used as primary with no other brand color
- `rounded-lg` / `rounded-2xl` on every single element regardless of context
- Bento-grid landing pages with no clear information hierarchy
- Generic stock-glyph feature grids (three icons + three headlines + three body blurbs with no differentiation)
- Body copy that reads like GPT output: "In today's fast-paced world…", "Unlock the power of…", "Seamlessly integrate…"
- Trailing emoji on every section heading
- Forgotten lorem ipsum in production
- Empty-state illustrations that are all the same "person with laptop" SVG style
- Feature-card hover effects that lift + scale + add shadow simultaneously
- Navbar that's a glassmorphism backdrop-blur with no information density

The file is drafted in the implementation plan, not this spec. `lyra-qa-design` transcludes it into its audit phase.
`lyra-qa` does not transclude it in v1 — can opt in later by adding `{{lib/ai-slop/ai-slop.md}}` to its audit phase if a
lightweight visual-smell pass is wanted in functional QA.

## `lyra-qa-design` — phase structure

Each phase is either a lib transclusion or inline prose. The phase list maps to the gstack `design-review` flow with all
gstack-specific content removed and the lib references wired in.

```
Phase 0:  Preflight                       {{lib/preflight/preflight.md}}
Phase 1:  Plan context discovery          {{lib/plan-discovery/plan-discovery.md}}
Phase 2:  Prior learnings                 {{lib/prior-learnings/prior-learnings.md}}
Phase 3:  Setup                           inline — parse URL/scope/tier/auth/mode args
Phase 4:  Clean tree gate                 {{lib/clean-tree/clean-tree.md}}
Phase 5:  DESIGN.md detection             inline
Phase 6:  Browser primitives reference    {{lib/playwright-primitives/playwright-primitives.md}}
Phase 7:  Initialize output dir           {{lib/output-dir/output-dir.md}} (SKILL_NAME=lyra-qa-design)
Phase 8:  Authenticate (if needed)        inline
Phase 9:  Baseline design audit           inline — unique to this skill
Phase 10: Triage                          inline — impact-sort findings
Phase 11: Fix loop                        inline header + {{lib/fix-discipline/fix-discipline.md}}
                                          (FIX_PREFIX=style(design), FIX_CAP=30)
Phase 12: Final design audit              inline — recompute scores, warn if regressed
Phase 13: Report                          inline — uses references/design-report-template.md
Phase 14: TODOS.md update                 inline — annotate fixed, add deferred
Phase 15: Capture learnings               {{lib/capture-learnings/capture-learnings.md}}
                                          (SKILL_NAME=qa-design)
```

### Phase 3 — Setup

Parses the user's invocation. Parameters match `lyra-qa` conventions for consistency:

| Parameter  | Default                                     | Override                                          |
| ---------- | ------------------------------------------- | ------------------------------------------------- |
| Target URL | auto-detect in diff-aware mode, or required | `https://myapp.com`, `http://localhost:3000`      |
| Tier       | Standard                                    | `--quick`, `--exhaustive`                         |
| Mode       | full                                        | `--regression .lyra/lyra-qa-design/baseline.json` |
| Output dir | `.lyra/lyra-qa-design/`                     | `Output to /tmp/…`                                |
| Scope      | full site                                   | `Focus on the checkout page`                      |
| Auth       | none                                        | `Sign in as user@example.com`                     |

Tier semantics mirror `lyra-qa`:

- **Quick** — fix critical + high only
- **Standard** (default) — fix critical + high + medium
- **Exhaustive** — fix all, including low/cosmetic

Diff-aware mode: if no URL is given and the current branch ≠ main/master, auto-enter diff-aware. Same logic as `lyra-qa` —
`git diff main...HEAD --name-only`, map changed files to routes, test only the affected pages.

### Phase 5 — DESIGN.md detection

Look for `DESIGN.md`, `design-system.md`, `STYLE.md`, `BRAND.md` in repo root and `docs/`. If found: read fully; treat
deviations from the documented system as higher-severity findings; cite the relevant section in each finding. If not found:
fall back to the following lyra design-principle skills as sources of truth — the skill invokes them via the Skill tool
during Phase 9 as needed:

| Category                                           | Skill                     |
| -------------------------------------------------- | ------------------------- |
| Typography, type scale, readability                | `lyra-typography-system`  |
| Color palette, contrast, harmony                   | `lyra-color-theory`       |
| Layout, grid alignment, spacing                    | `lyra-grid-system`        |
| Interaction affordance, visual hierarchy, feedback | `lyra-ux-principles`      |
| Responsive breakpoints, mobile usability           | `lyra-responsive-design`  |
| Brand consistency, narrative, voice                | `lyra-brand-storytelling` |
| Token architecture, coherence                      | `lyra-design-system`      |

At the end of the run, if no DESIGN.md was found, offer to draft one inferred from the codebase (tokens, spacing units, type
scale, color palette). No automatic writes without user consent.

### Phase 9 — Baseline design audit

This is the phase that most differs from `lyra-qa`. For each in-scope page:

1. **First impression** — navigate, take a full-page screenshot, assess: does this look intentional? Is there a clear focal
   point? Does the brand feel consistent?
2. **Per-category audit** — work through `references/design-audit-checklist.md`. For each category, consult the corresponding
   lyra design-principles skill if judgment calls are needed.
3. **AI slop scan** — walk the patterns listed in `{{lib/ai-slop/ai-slop.md}}`. Each positive match becomes a finding tagged
   `slop:<pattern-name>`.
4. **Responsive check** — resize to 375×812 (mobile) and 1280×720 (desktop-mid) via `browser_resize`. Screenshot each.
   Compare hierarchy at different sizes.
5. **Record baseline** — compute `design_score` and `ai_slop_score`, write to `.lyra/lyra-qa-design/baseline.json`.

### Phase 11 — Fix loop

Steps per finding, in impact order:

1. **Locate source** — use `Glob`/`Grep` to find the file(s) responsible. CSS/token files first.
2. **Fix minimally** — the smallest change that resolves the finding. CSS-only is preferred; component-structural changes are
   last resort. Never refactor unrelated code.
3. **Commit** — one commit per fix. Format: `style(design): FINDING-NNN — short description` (FIX_PREFIX applied by
   `lib/fix-discipline`).
4. **Re-test** — `browser_navigate` back to the affected page, `browser_take_screenshot`, `browser_console_messages`. Compare
   before/after.
5. **Classify** — `verified` / `best-effort` / `reverted`.
6. **Self-regulate** — every 5 fixes, recompute risk per `lib/fix-discipline`. If > 20%, stop and ask. Hard cap at 30 fixes.

No regression-test generation for CSS-only fixes (CSS regressions are caught by re-running `lyra-qa-design`). For the rare
fix involving JS behavior, follow `lyra-qa`'s Phase 8e.5 pattern — study existing test conventions, write a regression test,
commit separately with prefix `test(design):`.

### Scoring

Two independent scores, each 0–100, each computed at baseline and again after fixes.

**`design_score`** — starts at 100, deducts per finding:

- Critical: −25
- High: −15
- Medium: −8
- Low: −3 Minimum 0. Matches `lyra-qa`'s per-category deduction curve for consistency.

**`ai_slop_score`** — starts at 100, same deductions but only for findings tagged `slop:*` from the Phase 9 AI slop scan.
Separate axis so "design is fine but it looks generated" shows up clearly in the report.

No weighted category rollup (`lyra-qa` has weighted categories for console / links / visual / functional / UX / perf / a11y;
design review is a single-axis judgment and doesn't need the same structure).

**Severity model for findings:**

- **Critical** — breaks brand trust on first impression (broken hero, unreadable body text, inconsistent nav across pages)
- **High** — meaningful quality hit (wrong spacing scale, type hierarchy collapse, contrast failures)
- **Medium** — polish issues felt subconsciously (inconsistent corner radii, off-grid alignment, color drift)
- **Low** — nice-to-have

### `references/` contents

**`design-audit-checklist.md`** — the per-page checklist, structured by category with pointers to the corresponding `lyra-*`
skills. Drafted during implementation.

**`ai-slop-patterns.md`** — extended prose rationale for each pattern in `lib/ai-slop/ai-slop.md`, with examples and common
fix approaches. The lib file has the short checklist for transclusion; this file has the long form for reference during
scoring.

**`design-report-template.md`** — markdown skeleton for the final report. Mirrors `lyra-qa/references/qa-report-template.md`
structure but substitutes design-specific sections (design score delta, AI slop score delta, per-finding before/after
screenshots, deferred findings, "top 3 things to fix").

## Changes to `lyra-qa`

Strictly the minimum needed to (a) unbreak the skill and (b) enable lib sharing. Do not expand scope, do not refactor
unrelated phases, do not alter the health-score rubric or QA-specific audit logic.

1. **Browser primitives section** (lines ~174–192) — replace with `{{lib/playwright-primitives/playwright-primitives.md}}`.
2. **Every inline `computer_use:` pseudo-action** throughout Phases 2–5 (auth, orient, explore, document) — rewrite to
   reference Playwright MCP tools by name. ~30–50 replacements.
3. **Clean-tree block** (lines ~217–235) — replace with `{{lib/clean-tree/clean-tree.md}}`.
4. **Plan discovery block** (lines ~35–125) — replace with `{{lib/plan-discovery/plan-discovery.md}}`.
5. **Prior learnings block** (lines ~128–170) — replace with `{{lib/prior-learnings/prior-learnings.md}}`.
6. **Capture learnings block** (lines ~907–961) — replace with `{{lib/capture-learnings/capture-learnings.md}}`
   (SKILL_NAME=qa).
7. **Commit discipline + risk heuristic + self-regulation sections** — replace with
   `{{lib/fix-discipline/fix-discipline.md}}` (FIX_PREFIX=fix(qa), FIX_CAP unset).

**Not changed in `lyra-qa`:**

- Health-score rubric (lines ~555–595)
- Framework-specific notes (Next.js, Rails, WordPress, etc.)
- Full / Quick / Regression / Diff-aware mode descriptions
- Issue severity taxonomy
- `references/issue-taxonomy.md`, `references/qa-report-template.md`
- TODOS.md update phase
- Test framework bootstrap phase
- Completion status format

Expected post-change file length: ~650 lines (from current 985), almost entirely due to transcluded lib content replacing
inline blocks.

## Frontmatter for `lyra-qa-design`

```yaml
---
name: lyra-qa-design
description: |
  Autonomous visual-QA agent with a designer's eye. Audits live web applications
  for hierarchy, spacing, typography, color, responsive breakpoints, and AI slop
  patterns — then fixes findings in source code with atomic commits, re-verifies,
  and produces a report with design score and AI slop score deltas.
  Drives a real browser via Playwright MCP. Three tiers: Quick (critical/high),
  Standard (+ medium), Exhaustive (+ low/cosmetic).
  Use when asked to "design review", "audit the design", "visual QA",
  "check if it looks good", "design polish", or "does this look AI-generated?".
  Proactively suggest when the user mentions visual inconsistencies or polish.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
metadata:
  version: 1.0.0
---
```

Matches `lyra-qa`'s frontmatter style. No `preamble-tier`, no gstack-era fields.

## Risks and mitigations

**Risk — Playwright MCP assumes a fresh browser each session.** Auth must be re-performed every run (no persistent cookies
across sessions). Mitigation: document this in Phase 8 and suggest users script their login flow or use test accounts.
Acceptable cost for avoiding a new dependency.

**Risk — Lib transclusion is prose-level, not build-time.** If a lib file has a syntax issue or drifts from what the skill
expects, the failure is silent until runtime. Mitigation: (a) follow the existing `lib/preflight` and `lib/output-dir`
convention exactly — they already work; (b) each new lib module is copied from a block that already works in `lyra-qa`, so
the risk surface is in the transclusion wiring, not in the content.

**Risk — `lyra-qa` regression.** The lyra-qa edits touch ~30–50 inline `computer_use:` references, the browser primitives
table, and six block replacements. That's a large surface for accidental breakage. Mitigation: review the updated lyra-qa
end-to-end as part of this project before shipping, and run it against a known-good test app to confirm the Playwright MCP
rewiring works.

**Risk — Finding-to-source mapping is unreliable in component-heavy codebases.** A design finding on a rendered page may
trace back to multiple components, tokens, or utility classes. Mitigation: the fix loop's "locate source" step is allowed to
fail — if the skill can't confidently locate the source, the finding is marked deferred rather than guessed-at. Matches how
`lyra-qa` handles untraceable bugs.

**Risk — AI slop scoring is subjective and may surface false positives.** A legitimate minimal-modern site could get flagged
for "generic feature grid." Mitigation: the AI slop score is reported separately from the design score, so users can see the
split and decide whether a slop flag was earned. The skill's default severity for slop findings is Medium, not Critical —
it's a concern, not a blocker.

## Open questions

None blocking. All decisions locked through brainstorming:

- Carve-up: pragmatic middle (option C) ✓
- Tier modes: mirror lyra-qa's three tiers ✓
- Diff-aware: yes by default on feature branch ✓
- DESIGN.md: detect → use if found → fall back to lyra-\* design skills → offer to draft ✓
- Learnings: share prior-learnings and capture-learnings via lib; same `learnings.jsonl` file for both skills ✓
- AI slop: text-only lib, no image library ✓
- Fix cap: 30 for lyra-qa-design, no cap for lyra-qa ✓
- Browser driver: Playwright MCP only, no computer-use MCP, no XcodeBuildMCP ✓

## Acceptance criteria

1. A new skill directory `skills/lyra-qa-design/` exists with `SKILL.tmpl.md`, `references/design-audit-checklist.md`,
   `references/ai-slop-patterns.md`, `references/design-report-template.md`.
2. Seven new lib modules exist (`clean-tree`, `playwright-primitives`, `plan-discovery`, `fix-discipline`, `prior-learnings`,
   `capture-learnings`, `ai-slop`) each with a single `<name>.md` file following the `{{lib/<name>/<name>.md}}` transclusion
   convention.
3. `skills/lyra-qa/SKILL.tmpl.md` has zero `computer_use` references after the project lands.
4. `skills/lyra-qa/SKILL.tmpl.md` transcludes all applicable new lib modules (playwright-primitives, clean-tree,
   plan-discovery, prior-learnings, capture-learnings, fix-discipline with FIX_PREFIX=fix(qa)).
5. `skills/lyra-qa-design/SKILL.tmpl.md` transcludes all applicable lib modules including `ai-slop` and `fix-discipline` with
   FIX_PREFIX=style(design) and FIX_CAP=30.
6. `skills/lyra-qa-design/references/design-audit-checklist.md` references each of the seven `lyra-*` design-principle skills
   by name in its respective category.
7. Running `lyra-qa-design` against a live test site drives Playwright MCP, produces a report in `.lyra/lyra-qa-design/`, and
   applies + commits at least one fix with the `style(design):` prefix.
8. Running the updated `lyra-qa` against a live test site drives Playwright MCP without erroring (regression check — the
   skill currently fails on invocation due to `computer_use` references).
9. No new gstack dependencies or paths (`~/.gstack/`, `gstack-slug`, `$B`, `$D`) exist anywhere in the new or modified files.
