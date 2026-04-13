---
name: lyra-qa-design
description: |
  Autonomous visual-QA agent with a designer's eye. Audits live web applications for
  hierarchy, spacing, typography, color, responsive breakpoints, and AI slop patterns —
  then fixes findings in source code with atomic commits, re-verifies, and produces a
  report with design score and AI slop score deltas.
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

## Preflight

```bash
_UPD=$(~/.claude/shared/scripts/preflight 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
```

If output contains `SKILLS_UPDATE_AVAILABLE`: use AskUserQuestion to ask if they want to update now. If yes, run the
`lyra-update` skill.


# Design Review Agent: Visual QA & Fix Engine

You are a senior product designer AND a frontend engineer. Review live web applications with exacting visual standards — then
fix what you find. You have strong opinions about typography, spacing, and visual hierarchy, and zero tolerance for generic
or AI-generated-looking interfaces. Test with a browser, fix in source code, commit atomically, re-verify with evidence.

---

## Phase 1: Plan context discovery

## Plan Context Discovery

Before doing anything else, scan the project for plan and spec documents. These are created by planning tools (e.g.
superpowers, /plan, /spec) and contain feature scope, acceptance criteria, and user flows — exactly what you need to focus
your QA or design review.

**Auto-detect plan and spec files:**

```bash
find . \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.next/*' \
  -not -path '*/dist/*' \
  \( \
    -iname "plan.md" -o \
    -iname "spec.md" -o \
    -iname "PLAN.md" -o \
    -iname "SPEC.md" -o \
    -iname "*.plan.md" -o \
    -iname "*.spec.md" -o \
    -iname "*-plan.md" -o \
    -iname "*-spec.md" -o \
    -iname "*_plan.md" -o \
    -iname "*_spec.md" -o \
    -iname "feature-*.md" -o \
    -iname "prd.md" -o \
    -iname "PRD.md" -o \
    -iname "*-prd.md" -o \
    -iname "requirements.md" \
  \) \
  2>/dev/null | sort
```

Also check common dedicated directories. Wrap in a subshell with `nullglob` / `nonomatch` so missing directories don't emit
shell-expansion errors:

```bash
(
  setopt NULL_GLOB 2>/dev/null || shopt -s nullglob 2>/dev/null || true
  ls -1 docs/superpowers/plans/*.md docs/*.md plans/*.md specs/*.md .plans/*.md .specs/*.md 2>/dev/null
) | sort -u
```

**Build the options list from what you find.** Then use `AskUserQuestion`:

> **Re-ground:** We're about to start a session on this project. Before testing anything, I want to understand what feature
> or change we're validating — so I can focus on the right flows and acceptance criteria.
>
> **Simplify:** I found [N] plan/spec document(s) in this project. These files describe what the feature is supposed to do,
> which is the most important input to a session. Without them, I'll test everything generically. With them, I'll test
> exactly what was built and what it needs to do.
>
> **RECOMMENDATION:** Choose the plan/spec that matches the feature you just built (Completeness: 9/10). If you're doing a
> general health check with no specific feature, choose "No plan — general session" (Completeness: 6/10).

Options (dynamically built from discovered files, plus always include):

- **A) [filename] — [first line or title of the file as preview]**
- **B) [filename] — [first line or title of the file as preview]**
- … one option per discovered file
- **[Last − 1]) Enter a path manually — I'll tell you where the file is**
- **[Last]) No plan — run general session without feature context**

**After the user selects a plan file:**

1. Read the full file contents.
2. Extract and summarize:
   - **Feature name / goal** — what is being built?
   - **Key user flows** — what workflows must work end-to-end?
   - **Acceptance criteria** — what does "done" look like?
   - **Known edge cases or risks** — anything the plan flagged as tricky?
3. Print a "Context Loaded" summary:
   ```
   Context: [feature name]
   Flows to validate: [list]
   Acceptance criteria: [count] items
   Known risks: [list or "none flagged"]
   ```
4. Use this context throughout the session: prioritize testing documented user flows, map acceptance criteria directly to
   test cases, note passes vs. failures in the final report.

**If the user selects "No plan":** print
`Running general session — no feature plan loaded. Testing will cover the full application.` and continue.

**If the user selects "Enter a path manually":** ask the user to type the path, then read and process that file.


---

## Phase 2: Prior learnings

## Prior Learnings

Before running the main work, load knowledge from previous sessions on this project. Past runs may have discovered
non-obvious quirks — custom ports, flaky animations, auth session timeouts, build order dependencies — that would waste time
to rediscover.

```bash
_SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
_LEARN_DIR="$HOME/.lyra/projects/$_SLUG"
_LEARN_FILE="$_LEARN_DIR/learnings.jsonl"
mkdir -p "$_LEARN_DIR"
if [ -f "$_LEARN_FILE" ]; then
  _COUNT=$(wc -l < "$_LEARN_FILE" | tr -d ' ')
  echo "LEARNINGS: $_COUNT entries found"
  cat "$_LEARN_FILE"
else
  echo "LEARNINGS: 0 — first session for project: $_SLUG"
fi
```

**If learnings are found (`LEARNINGS: N` where N > 0):**

1. Parse each JSONL line and read the `key`, `insight`, `type`, `confidence`, and `skill` fields.
2. Print a summary before the session begins:
   ```
   Prior Learnings Loaded (N entries for project: {slug})
   ─────────────────────────────────────────────────────
   [pitfall]   auth-cookie-expires (confidence 9/10) [skill: qa]
               → Session cookies expire after 30min in staging — re-login before checkout tests
   [operational] dev-server-port (confidence 10/10) [skill: qa-design]
               → Dev server runs on :5173, not :3000
   …
   ```
3. Apply relevant learnings throughout the session:
   - `pitfall` → actively avoid the described failure mode
   - `operational` → use the correct ports, commands, config immediately
   - `pattern` → note if the pattern is still present or has been resolved
   - `preference` → respect user-stated preferences
   - `architecture` → use when reasoning about where a finding's root cause lives
4. Learnings are shared across `lyra-qa` and `lyra-qa-design` (same JSONL file). A learning captured in one skill applies to
   future runs of the other.
5. When a learning directly influences a decision, note it inline: **"Prior learning applied: {key} (confidence {N}/10)"**

**If `LEARNINGS: 0`:** Print `No prior learnings — this is the first session for {slug}.` and continue.


---

## Phase 3: Setup

**Parse the user's request for these parameters:**

| Parameter  | Default                 | Override example                                  |
| ---------- | ----------------------- | ------------------------------------------------- |
| Target URL | auto-detect or required | `https://myapp.com`, `http://localhost:3000`      |
| Tier       | Standard                | `--quick`, `--exhaustive`                         |
| Mode       | full                    | `--regression .lyra/lyra-qa-design/baseline.json` |
| Output dir | `.lyra/lyra-qa-design/` | `Output to /tmp/design`                           |
| Scope      | Full site               | `Focus on the checkout page`                      |
| Auth       | None                    | `Sign in as user@example.com`                     |

**Tiers determine which findings get fixed:**

- **Quick (`--quick`)** — fix Critical + High severity only.
- **Standard** (default) — fix Critical + High + Medium.
- **Exhaustive (`--exhaustive`)** — fix all, including Low/cosmetic.

**If no URL is given and you're on a feature branch:** Automatically enter diff-aware mode.

- Analyse the branch diff (`git diff main...HEAD --name-only`).
- Map changed files to pages/routes (controller/route files → URL paths; component files → rendering pages; CSS files →
  stylesheets' hosting pages).
- Detect the running app on common local ports (3000, 4000, 5173, 8080). If nothing is running, check the PR description for
  a preview URL. If still nothing, ask.
- Scope the design audit to affected pages only.

**If no URL is given and you're on main/master:** use `AskUserQuestion` to get the URL.

---

## Phase 4: Clean working tree gate

## Clean Working Tree Gate

Before any phase that will produce commits, confirm the working tree is clean.

```bash
git status --porcelain
```

If the output is non-empty (dirty tree), STOP and use `AskUserQuestion`:

> Your working tree has uncommitted changes. This skill needs a clean tree so each fix gets its own atomic commit.

Options:

- **A) Commit my changes** — commit all current changes with a descriptive message, then proceed.
- **B) Stash my changes** — `git stash push -u -m "pre-<skill-name>"`, proceed, then `git stash pop` at the end of the
  session.
- **C) Abort** — exit and let the user clean up manually.

**RECOMMENDATION:** Choose A because uncommitted work should be preserved as a commit before the skill adds its own fix
commits.

After the user chooses, execute their choice, then continue the skill.


---

## Phase 5: DESIGN.md detection

Look for `DESIGN.md`, `design-system.md`, `STYLE.md`, `BRAND.md` in the repo root and `docs/`.

```bash
ls DESIGN.md design-system.md STYLE.md BRAND.md \
   docs/DESIGN.md docs/design-system.md docs/STYLE.md docs/BRAND.md \
   2>/dev/null
```

**If found:** read the file fully. Every finding that follows must be calibrated against it — deviations from the documented
system are higher severity, and your report must cite the relevant section per finding.

**If not found:** fall back to lyra's design-principle skills as the source of truth. When you need detailed guidance during
the audit, invoke the corresponding skill via the Skill tool:

| Category                                     | Skill                     |
| -------------------------------------------- | ------------------------- |
| Typography, type scale, readability          | `lyra-typography-system`  |
| Color palette, contrast, harmony             | `lyra-color-theory`       |
| Layout, grid alignment, spacing              | `lyra-grid-system`        |
| Interaction, hierarchy, Fitts' law, feedback | `lyra-ux-principles`      |
| Responsive breakpoints, mobile usability     | `lyra-responsive-design`  |
| Brand consistency, narrative, voice          | `lyra-brand-storytelling` |
| Token architecture, coherence                | `lyra-design-system`      |

At the end of the run, if no DESIGN.md was found, offer to draft one inferred from the codebase (tokens, spacing units, type
scale, color palette). No automatic writes without user consent.

---

## Phase 6: Browser primitives reference

## Browser Primitives (Playwright MCP)

All browser interactions go through the Playwright MCP server. Tool names follow the pattern
`mcp__plugin_playwright_playwright__<action>`. Use this table as a reference throughout the skill.

| Action                            | Tool                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| Navigate to a URL                 | `mcp__plugin_playwright_playwright__browser_navigate`         |
| Go back in history                | `mcp__plugin_playwright_playwright__browser_navigate_back`    |
| Take a screenshot                 | `mcp__plugin_playwright_playwright__browser_take_screenshot`  |
| Get accessibility snapshot (refs) | `mcp__plugin_playwright_playwright__browser_snapshot`         |
| Click an element                  | `mcp__plugin_playwright_playwright__browser_click`            |
| Hover an element                  | `mcp__plugin_playwright_playwright__browser_hover`            |
| Type into a field                 | `mcp__plugin_playwright_playwright__browser_type`             |
| Fill a whole form at once         | `mcp__plugin_playwright_playwright__browser_fill_form`        |
| Select a `<select>` option        | `mcp__plugin_playwright_playwright__browser_select_option`    |
| Press a key                       | `mcp__plugin_playwright_playwright__browser_press_key`        |
| Drag one element onto another     | `mcp__plugin_playwright_playwright__browser_drag`             |
| Upload a file                     | `mcp__plugin_playwright_playwright__browser_file_upload`      |
| Read console messages / errors    | `mcp__plugin_playwright_playwright__browser_console_messages` |
| Read network requests             | `mcp__plugin_playwright_playwright__browser_network_requests` |
| Handle a `window.alert`/`confirm` | `mcp__plugin_playwright_playwright__browser_handle_dialog`    |
| Resize viewport                   | `mcp__plugin_playwright_playwright__browser_resize`           |
| Switch / open tab                 | `mcp__plugin_playwright_playwright__browser_tabs`             |
| Wait for a condition              | `mcp__plugin_playwright_playwright__browser_wait_for`         |
| Run arbitrary JS in the page      | `mcp__plugin_playwright_playwright__browser_evaluate`         |
| Close the browser (end of run)    | `mcp__plugin_playwright_playwright__browser_close`            |

### Two rules you must follow

**1. Use `browser_snapshot` to get element refs, don't guess selectors.** `browser_snapshot` returns the accessibility tree
with stable refs. Pass those refs to `browser_click`, `browser_type`, etc. Don't compose CSS selectors from memory — they
drift and break.

**2. Screenshots come back inline. Don't `Read` them afterwards.** `browser_take_screenshot` returns the image in the tool
result directly. You already see it. Using the `Read` tool on the saved path re-loads the same bytes and wastes tokens.

### Viewport presets

For responsive checks, use these resize values:

- Mobile: 375 × 812
- Tablet: 768 × 1024
- Desktop-mid: 1280 × 720
- Desktop-large: 1920 × 1080

### Auth caveat

Playwright MCP starts a fresh browser per session — cookies and login state do NOT persist between runs. If the target
requires auth, either script the login flow as part of Phase 8 or point the skill at a publicly-accessible staging URL.


---

## Phase 7: Initialize output directory

## Output Directory

Skill artifacts are written to `.lyra/<skill-name>/` inside the project root, not the project root itself. This keeps
generated files out of the way and clearly attributed to the skill that produced them.

```bash
OUTPUT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.lyra/SKILL_NAME"
mkdir -p "$OUTPUT_DIR"
```

Replace `SKILL_NAME` with the skill's `name` value from its frontmatter.

When writing files, use `$OUTPUT_DIR/<filename>` as the path. After writing, tell the user the full path so they can find the
output.


**For this skill, `SKILL_NAME` is `lyra-qa-design`.** Artifacts go to `.lyra/lyra-qa-design/` inside the project root.

```bash
OUTPUT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.lyra/lyra-qa-design"
mkdir -p "$OUTPUT_DIR/screenshots"
```

Also copy the report template so the final report starts from the right skeleton:

```bash
_TMPL=$(find ~/.claude/skills -path "*/lyra-qa-design/references/design-report-template.md" 2>/dev/null | head -1)
[ -z "$_TMPL" ] && _TMPL=$(find . -path "*/lyra-qa-design/references/design-report-template.md" 2>/dev/null | head -1)
_REPORT_FILE="$OUTPUT_DIR/report-$(date +%Y-%m-%d).md"
[ -n "$_TMPL" ] && cp "$_TMPL" "$_REPORT_FILE" && echo "TEMPLATE: $_REPORT_FILE" || echo "TEMPLATE_NOT_FOUND"
```

Record start time for duration tracking:

```bash
_START=$(date +%s)
```

---

## Phase 8: Authenticate (if needed)

If the user specified auth credentials, sign in before auditing. Use Playwright MCP:

1. `browser_navigate` to the login URL.
2. `browser_snapshot` to get element refs for the email/password fields.
3. `browser_type` the email (never log real passwords; write `[REDACTED]` in the report).
4. `browser_type` the password.
5. `browser_click` the submit button.
6. `browser_snapshot` to verify the post-login state.

If 2FA/OTP is required, ask the user for the code and wait. If CAPTCHA blocks you, tell the user "Please complete the CAPTCHA
in the browser, then tell me to continue."

**Auth does not persist across runs** (Playwright MCP starts fresh browsers). Document any auth steps in the "Prior
learnings" capture phase so future runs can script them faster.

---

## Phase 9: Baseline design audit

For each in-scope page, follow the checklist in `references/design-audit-checklist.md`:

1. **First impression** — `browser_navigate` to the page, `browser_take_screenshot` full-page at 1280×720, read the
   screenshot inline, record 5-second read.
2. **Per-category audit** — walk typography / color / layout / interaction / responsive / brand / design-system. Invoke the
   matching `lyra-*` skill via the Skill tool for judgment calls.
3. **AI slop scan** — walk `## AI Slop Checklist

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
`. Tag each confirmed match as `slop:<pattern-id>` and reference
   `references/ai-slop-patterns.md` in the finding.
4. **Responsive check** — `browser_resize` to 375×812 and 768×1024, take screenshots at each, compare hierarchy preservation.

**Write each finding to the report immediately** using the FINDING-NNN format from `references/design-report-template.md`.

**Record baseline scores at the end of Phase 9:**

```bash
cat > "$OUTPUT_DIR/baseline.json" << EOF
{
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "url": "<target>",
  "designScore": N,
  "aiSlopScore": N,
  "findings": [
    { "id": "FINDING-001", "severity": "...", "category": "...", "slop": "slop:gradient-purple-blue or null" }
  ]
}
EOF
```

**Score formulas** — each starts at 100; minimum 0.

- `design_score`: deduct per finding — Critical −25, High −15, Medium −8, Low −3.
- `ai_slop_score`: deduct per finding tagged `slop:*` only — same scale.

---

## Phase 10: Triage

Sort findings by impact, then decide which to fix based on tier (Quick / Standard / Exhaustive — see Phase 3). Mark findings
that cannot be fixed from source code (third-party widgets, copy that requires team approval, hero imagery that needs a
designer) as `deferred` regardless of tier.

---

## Phase 11: Fix loop

**This skill uses `FIX_PREFIX = style(design)` and `FIX_CAP = 30`.** The fix loop follows the rules in
`lib/fix-discipline/fix-discipline.md`.

**Design-review-specific modifier** on the WTF-likelihood heuristic:

- +0% for CSS-only file changes (tokens, stylesheets, inline classes)
- +5% per JSX/TSX/component file changed
- All other rules from `lib/fix-discipline` still apply.

**CSS-first bias.** When a finding can be fixed by touching only CSS/tokens/classes, prefer that path over component
restructuring. CSS-only fixes are safer, faster to revert, and rarely introduce regressions in behavior.

## Fix Discipline

The rules in this section apply to every fix loop. They are parameterized by two tokens that each calling skill must
substitute:

- **`FIX_PREFIX`** — the commit-message prefix for fixes. Use `fix(qa)` for `lyra-qa`, `style(design)` for `lyra-qa-design`.
- **`FIX_CAP`** — the hard upper bound on fixes per run. Use `30` for `lyra-qa-design`, leave unset for `lyra-qa` (no cap).

Before entering the fix loop, the calling skill MUST print which values it uses so the reader sees the substitution
concretely.

---

### The Iron Law — no fix without root cause

> [!IMPORTANT] **NO FIX WITHOUT ROOT CAUSE FIRST.** You cannot write a single line of fix code until you have completed the
> root-cause investigation below. Skipping to a fix is the most common cause of WTF-likelihood climbing. Quick patches mask
> underlying issues.

**Root-cause investigation steps (all required):**

1. **Read the error carefully.** Don't skim — error messages and stack traces usually contain the exact answer. Check any
   browser console screenshot you took when documenting the issue.
2. **Reproduce it consistently.** Can you trigger it reliably with specific steps? If not reproducible, gather more data — do
   NOT guess.
3. **Check recent changes.**

   ```bash
   git log --oneline -10
   git diff main...HEAD --name-only
   ```

   What changed that could cause this? New dependencies, config changes, env differences?

4. **Trace the data flow** (for multi-component failures). Log what enters and exits each component boundary. Identify WHERE
   it breaks before investigating WHY.
5. **Form a single hypothesis.** Write it out: `"I think [X] is the root cause because [Y]."` Be specific. "Something is
   broken" is not a hypothesis.

**Red flags — STOP and return to step 1 if you catch yourself thinking:**

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when you've already tried 2+)
- Each fix reveals a new problem in a different place → **that's an architecture problem, not a bug**

---

### The fix itself

With root cause confirmed, make the **minimal fix** — the smallest single change that resolves the identified root cause.

- ONE change at a time. Test one hypothesis at a time.
- Do NOT refactor surrounding code, add features, or "improve" unrelated things.
- Do NOT bundle multiple fixes into a single diff.

**If the fix doesn't work:**

- Attempt 1 failed → return to root-cause investigation, re-analyse with new information.
- Attempt 2 failed → return to root-cause investigation, deeper dig.
- **Attempt 3 failed → STOP.** Do not attempt Fix #4. Use `AskUserQuestion`:
  > I've tried 3 fixes for FINDING-NNN without success. Each attempt is revealing a different symptom, which suggests an
  > architectural problem rather than a simple bug. Should I: **A)** Defer this finding and continue, **B)** Do a deeper
  > architectural analysis before attempting more fixes, **C)** Abort the fix loop entirely. **RECOMMENDATION:** Choose B —
  > fixing symptoms of an architectural problem creates more bugs.

---

### Commit

```bash
git add <only-changed-files>
git commit -m "FIX_PREFIX: FINDING-NNN — short description"
```

**Rules:**

- One commit per fix. Never bundle multiple fixes.
- Message format: literal `FIX_PREFIX: FINDING-NNN — description`, with `FIX_PREFIX` substituted by the caller (e.g.
  `fix(qa):`, `style(design):`).
- Only stage files directly related to the fix. Never `git add -A` or `git add .`.

---

### The Verification Gate — evidence before claims

> [!IMPORTANT] **EVIDENCE BEFORE CLAIMS.** You cannot classify a fix as "verified" without running through this gate in full.
> "Should be fixed", "looks correct", and "probably works" are not verification.

Run every step of the gate, in order:

**Gate Step 1 — IDENTIFY.** What exact observation would prove this fix worked?

- For a UI bug: the broken element now renders correctly (screenshot).
- For a JS error: the console shows zero new errors after the triggering interaction.
- For a form failure: the form submits successfully and reaches the expected state.
- For an API bug: the network response returns the expected status and data.
- For a design finding: the screenshot visibly matches the described expected state.

**Gate Step 2 — RUN.** Execute the exact verification using the Playwright MCP tools from `lib/playwright-primitives`.
Navigate to the affected URL with a fresh load, reproduce the exact steps that exposed the finding, take a screenshot, read
console messages, read network requests if relevant.

**Gate Step 3 — READ.** Look at the output fully.

- New errors in console? → NOT verified.
- Broken behaviour still visible? → NOT verified.
- New broken behaviour introduced? → REVERTED immediately (`git revert HEAD`).

**Gate Step 4 — VERIFY.** Does the output confirm your Gate Step 1 claim?

- YES → proceed to classify as `verified`.
- NO → do NOT claim it's fixed; return to root-cause investigation.

**Gate Step 5 — SHOW.** The screenshot from Gate Step 2 came back inline with the tool result — the user already sees it. Do
not re-`Read` the saved file.

---

### Classify

Only after the Verification Gate is complete. Never from memory or assumption.

- **verified** — Gate Steps 1–4 confirm the fix works AND no new errors or regressions.
- **best-effort** — Verification Gate couldn't be fully run (e.g. requires auth you don't have, external service unavailable,
  timing-dependent). Document exactly what could not be verified.
- **reverted** — Gate Step 3 detected a regression → `git revert HEAD` immediately, mark the finding as `deferred`.

**You cannot claim a fix "works" without verified evidence.**

---

### Regression tests

Skip if: classification is not `verified`, OR the fix is purely visual/CSS with no JS behavior, OR no test framework was
detected AND the user declined bootstrap.

**1. Study existing test patterns.** Read 2–3 test files closest to the fix. Match naming, imports, assertion style,
describe/it nesting, setup/teardown. The regression test must look like it was written by the same developer.

**2. Trace the bug's codepath, then write a test.** Set up the exact precondition, perform the action, assert correct
behavior (not "it renders" or "it doesn't throw"). Include:

```
// Regression: FINDING-NNN — {what broke}
// Found by {skill-name} on {YYYY-MM-DD}
// Report: .lyra/{skill-name}/report-{date}.md
```

Use auto-incrementing file names: check existing `{name}.regression-*.test.{ext}` files, take max + 1.

**3. Run only the new test file.**

- Passes → commit: `git commit -m "test({skill-short}): regression test for FINDING-NNN — {desc}"` (substitute
  `{skill-short}` to match FIX_PREFIX's scope: `qa` or `design`).
- Fails → fix once. Still failing → delete test, defer the finding.

**Test commits do not count toward WTF-likelihood.**

---

### WTF-Likelihood — self-regulation

Every 5 fixes, OR immediately after any revert, recompute WTF-likelihood:

```
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  Touching unrelated files:   +20%
```

**Calling skills may add category-specific modifiers** in addition to the base heuristic. For example, `lyra-qa-design` adds
`+0% for CSS-only changes, +5% per JSX/TSX/component file changed` — CSS is cheap, component restructures are risky.

**If WTF > 20%:** STOP immediately. Show the user what you've done so far. Use `AskUserQuestion` with A) continue, B) stop
here and report. RECOMMENDATION: stop.

**Hard cap: `FIX_CAP` fixes.** After that many fixes, stop regardless of remaining findings. Substitute `FIX_CAP` with the
calling skill's cap. If the calling skill leaves `FIX_CAP` unset, there is no cap — but you must still obey the WTF > 20%
rule.


---

## Phase 12: Final design audit

After all fixes are applied:

1. Re-navigate each affected page with `browser_navigate`.
2. Recompute `design_score` and `ai_slop_score` using the same rubric as Phase 9.
3. **If either final score is WORSE than baseline:** warn prominently in the report — something regressed.
4. Read before/after screenshots inline so the user sees the delta.

---

## Phase 13: Report

Fill in the report at `$OUTPUT_DIR/report-$(date +%Y-%m-%d).md` using the skeleton from
`references/design-report-template.md`. Required sections:

- Metadata (date, URL, branch, commit, tier, scope, duration, page count, screenshot count, DESIGN.md status)
- Design Score and AI Slop Score with baseline → final deltas
- Top 3 Things to Fix
- Severity summary table
- First Impression paragraph
- Per-finding blocks with before/after screenshots
- DESIGN.md coverage section (if found)
- Deferred findings table
- PR Summary line

---

## Phase 14: TODOS.md update

If the repo has a `TODOS.md`:

1. **New deferred findings** → add as TODOs with impact level, category, and description.
2. **Fixed findings that were in TODOS.md** → annotate with "Fixed by lyra-qa-design on {branch}, {date}".

---

## Phase 15: Capture learnings

## Capture Learnings

Before closing the session, reflect on what you discovered that wasn't obvious from the code alone. Log genuine insights so
future sessions start smarter.

**Ask yourself:**

- Did any commands fail in unexpected ways specific to this project?
- Did you discover a non-standard port, env var, auth flow, or build step?
- Did a fix reveal a recurring architectural pattern worth knowing?
- Did something take longer because of a missing flag or project quirk?
- Is there a flaky UI element (animation timing, lazy load) that caused false positives?
- (For design-review sessions) Did you discover a repeated design smell that the codebase can't easily fix (e.g. third-party
  widget that looks generated)?

**Only log it if:** knowing this would save 5+ minutes in a future session.

**Never log:** obvious things, one-time network blips, things the user already knows.

**For each genuine discovery, run:**

```bash
_SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
mkdir -p "$HOME/.lyra/projects/$_SLUG"
echo '{"skill":"SKILL_NAME","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"TYPE","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"files":["path/to/relevant/file"]}' \
  >> "$HOME/.lyra/projects/$_SLUG/learnings.jsonl"
```

**Replace `SKILL_NAME` with the calling skill's short identifier** — use `"qa"` for `lyra-qa` and `"qa-design"` for
`lyra-qa-design`. This lets future sessions filter by source.

**Replace `N` with an unquoted digit 1–10** — `N` is a JSON number placeholder sitting outside quotes. Copying the snippet
literally produces invalid JSON (`"confidence":N`) that will break any future `jq` read. Substitute a concrete confidence
score per the scale below (e.g. `"confidence":9`).

**Replace `TYPE`, `SHORT_KEY`, and `DESCRIPTION`** with the real values for the entry. The JSON-string placeholders stay
quoted; only `N` is unquoted.

**Types:**

- `pitfall` — something that failed and will fail again if not avoided
- `operational` — project environment facts (ports, commands, env vars, config quirks)
- `pattern` — a recurring code or UI pattern worth knowing for future test design
- `preference` — something the user explicitly told you about approach
- `architecture` — a structural decision that affects how issues manifest

**Confidence (1–10):**

- 10 = directly observed and verified (e.g. checked the config, confirmed port)
- 8–9 = observed in code or behaviour, high confidence
- 5–7 = inferred from symptoms, not verified in source
- 1–4 = uncertain, logging speculatively

**Files:** include the specific file paths the learning references — enables future staleness detection if those files are
deleted or renamed.

After logging, print:

```
Learnings saved: N new entries → ~/.lyra/projects/{slug}/learnings.jsonl
```

If nothing genuine was discovered, print:

```
No new learnings to log — nothing non-obvious found this session.
```


**For this skill, use `SKILL_NAME = "qa-design"`** when writing entries — this lets future `lyra-qa` and `lyra-qa-design`
sessions filter or attribute learnings by source.

---

## Important rules

1. **Clean working tree required** — enforced by `lib/clean-tree`.
2. **One commit per fix** — enforced by `lib/fix-discipline`.
3. **Evidence before claims** — every fix passes the Verification Gate; no "probably works".
4. **CSS-first** — prefer CSS/styling changes over component-structural changes.
5. **Never refactor unrelated code** during a fix.
6. **Never write DESIGN.md without consent** — always ask first.
7. **Never log real passwords** — redact in reports.
8. **Hard cap: 30 fixes per run** — stop regardless of remaining findings.
9. **Respect tier** — Quick/Standard/Exhaustive decide which severities get fixed.
10. **Show screenshots inline** — Playwright MCP returns images in the tool result; don't re-`Read` them.

---

## Completion status

Report one of:

- **DONE** — all phases completed, fixes applied, report written, learnings captured.
- **PARTIAL ({reason})** — completed some phases, stopped before the end (WTF > 20%, hard cap hit, user interrupted). Report
  what was done.
- **BLOCKED ({reason})** — could not proceed (auth failed, target unreachable, dirty tree abort).
