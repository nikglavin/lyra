# lyra-qa-design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `lyra-qa-design` skill (designer's-eye visual QA with fix loop) that drives Playwright MCP, extract the
mechanically-shared logic between `lyra-qa` and `lyra-qa-design` into seven `lib/` modules, and unbreak `lyra-qa`'s
`computer_use` references along the way.

**Architecture:** New lib modules live at `lib/<name>/<name>.md` and are transcluded into skill templates via the existing
`{{lib/<name>/<name>.md}}` mechanism implemented in `scripts/build.ts`. `lyra-qa-design` is a new skill directory with its
own references; `lyra-qa` is modified in place to replace its broken `computer_use` pseudo-tool references with real
Playwright MCP tool names and to transclude the new lib modules where blocks used to be inline.

**Tech Stack:** Lyra skill build system (`bun scripts/build.ts`), skill validator (`bun scripts/lint-skill.ts`), Playwright
MCP server (`mcp__plugin_playwright_playwright__*` tool family), markdown skill templates with `{{...}}` transclusion.

**Spec:** `docs/superpowers/specs/2026-04-14-lyra-qa-design-design.md`

**Important — how transclusion works:** `scripts/build.ts:17-40` resolves every `{{path/to/file.md}}` at build time by
literal file inclusion. There is **no parameter substitution** — templates cannot do
`{{fix-discipline.md FIX_PREFIX=fix(qa)}}`. Where per-skill parameterization is needed (e.g. commit prefix, fix cap), the lib
file uses literal placeholder tokens and includes prose instructions telling the model to substitute them in the calling
skill's context. This matches how `lib/output-dir/output-dir.md` handles `SKILL_NAME` today.

---

## File Structure

### New files

| Path                                                         | Purpose                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `lib/clean-tree/clean-tree.md`                               | Clean working-tree gate; AskUserQuestion if dirty.                   |
| `lib/playwright-primitives/playwright-primitives.md`         | Mapping of QA actions to Playwright MCP tool names.                  |
| `lib/plan-discovery/plan-discovery.md`                       | Phase 0 plan/spec discovery and AskUserQuestion picker.              |
| `lib/prior-learnings/prior-learnings.md`                     | Read `~/.lyra/projects/$SLUG/learnings.jsonl` and apply.             |
| `lib/capture-learnings/capture-learnings.md`                 | Reflect on session, write new entries to learnings.jsonl.            |
| `lib/fix-discipline/fix-discipline.md`                       | Commit-per-fix, root-cause gate, WTF-likelihood heuristic, hard cap. |
| `lib/ai-slop/ai-slop.md`                                     | Compact checklist of AI-generated design smells.                     |
| `skills/lyra-qa-design/SKILL.tmpl.md`                        | The new skill template.                                              |
| `skills/lyra-qa-design/references/design-audit-checklist.md` | Per-category audit checklist pointing at `lyra-*` principle skills.  |
| `skills/lyra-qa-design/references/ai-slop-patterns.md`       | Extended prose rationale for the slop patterns.                      |
| `skills/lyra-qa-design/references/design-report-template.md` | Markdown report skeleton.                                            |

### Modified files

| Path                           | Changes                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/lyra-qa/SKILL.tmpl.md` | Remove every `computer_use:` pseudo-action, rewrite browser primitives, transclude all seven new lib modules where matching inline blocks used to be. |

### Untouched

- `lib/preflight/preflight.md`, `lib/output-dir/output-dir.md`
- `skills/lyra-qa/references/*`, `skills/lyra-qa/templates/`
- Every other skill in `skills/`

---

## Task 0: Read the spec end-to-end

**Files:**

- Read: `docs/superpowers/specs/2026-04-14-lyra-qa-design-design.md`
- Read: `scripts/build.ts` (to understand the transclusion resolver)
- Read: `scripts/lint-skill.ts` (to understand frontmatter validation rules)
- Read: `lib/output-dir/output-dir.md` (parameterization-by-prose convention)
- Read: `lib/preflight/preflight.md` (lib file conventions)
- Read: `skills/lyra-qa/SKILL.tmpl.md` fully (you will be editing this)

- [ ] **Step 1: Read the spec.** All decisions are already locked — do not revisit non-goals (no native, no image library, no
      lyra-learn, no build-time parameter substitution).

- [ ] **Step 2: Read the build system.** Confirm `scripts/build.ts` resolves `{{foo/bar.md}}` via literal file inclusion and
      fails hard if the referenced file is missing.

- [ ] **Step 3: Read the existing lib files.** Note the frontmatter-less markdown shape. Note that
      `lib/output-dir/output-dir.md` has a literal `SKILL_NAME` token and prose instruction "Replace `SKILL_NAME` with the
      skill's `name` value from its frontmatter." This is the pattern to follow for any parameterization.

- [ ] **Step 4: Read `skills/lyra-qa/SKILL.tmpl.md` end to end.** There are 985 lines; you will be touching roughly 40% of
      them. Note every occurrence of `computer_use`, the clean-tree block (~217–235), the plan-discovery block (~35–125), the
      prior-learnings block (~128–170), the browser-primitives table (~174–192), the capture-learnings block (~907–961), and
      the fix-loop discipline sections (~644–840).

- [ ] **Step 5: Verify the build is currently clean.**

```bash
cd /Users/nickg/claude/lyra
bun run build
bun run lint:skill
```

Expected: both commands succeed. Record any pre-existing warnings — you must not introduce new ones.

- [ ] **Step 6: No commit.** This task is read-only orientation.

---

## Task 1: Write `lib/clean-tree/clean-tree.md`

**Files:**

- Create: `lib/clean-tree/clean-tree.md`

- [ ] **Step 1: Create the file.**

````markdown
## Clean Working Tree Gate

Before any phase that will produce commits, confirm the working tree is clean.

```bash
git status --porcelain
```
````

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

````

- [ ] **Step 2: Verify the build still compiles.**

```bash
bun run build
````

Expected: exit 0. The new file is not transcluded anywhere yet, but build must not fail on its mere existence.

- [ ] **Step 3: No commit yet.** Commit after Task 7 when all lib modules exist.

---

## Task 2: Write `lib/playwright-primitives/playwright-primitives.md`

**Files:**

- Create: `lib/playwright-primitives/playwright-primitives.md`

- [ ] **Step 1: Create the file.**

```markdown
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
```

- [ ] **Step 2: Verify the build compiles.**

```bash
bun run build
```

Expected: exit 0.

- [ ] **Step 3: No commit yet.**

---

## Task 3: Write `lib/plan-discovery/plan-discovery.md`

**Files:**

- Create: `lib/plan-discovery/plan-discovery.md`
- Reference: `skills/lyra-qa/SKILL.tmpl.md` lines 35–125 (source material)

- [ ] **Step 1: Create the file.** Copy the existing Phase 0 block from lyra-qa almost verbatim. The content below is the
      extracted block — verify it matches what's currently in lyra-qa before committing.

````markdown
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
````

Also check common dedicated directories:

```bash
ls docs/superpowers/plans/*.md docs/*.md plans/*.md specs/*.md .plans/*.md .specs/*.md 2>/dev/null | sort
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

````

- [ ] **Step 2: Verify the build compiles.**

```bash
bun run build
````

- [ ] **Step 3: No commit yet.**

---

## Task 4: Write `lib/prior-learnings/prior-learnings.md`

**Files:**

- Create: `lib/prior-learnings/prior-learnings.md`
- Reference: `skills/lyra-qa/SKILL.tmpl.md` lines 128–170 (source material)

- [ ] **Step 1: Create the file.** Extracted verbatim from lyra-qa's existing Prior Learnings section.

````markdown
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
````

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

````

- [ ] **Step 2: Verify the build compiles.** `bun run build` → exit 0.

- [ ] **Step 3: No commit yet.**

---

## Task 5: Write `lib/capture-learnings/capture-learnings.md`

**Files:**
- Create: `lib/capture-learnings/capture-learnings.md`
- Reference: `skills/lyra-qa/SKILL.tmpl.md` lines 907–961 (source material)

- [ ] **Step 1: Create the file.** The literal `SKILL_NAME` token is substituted in prose by the calling skill, matching the `lib/output-dir` convention.

```markdown
## Capture Learnings

Before closing the session, reflect on what you discovered that wasn't obvious from the
code alone. Log genuine insights so future sessions start smarter.

**Ask yourself:**

- Did any commands fail in unexpected ways specific to this project?
- Did you discover a non-standard port, env var, auth flow, or build step?
- Did a fix reveal a recurring architectural pattern worth knowing?
- Did something take longer because of a missing flag or project quirk?
- Is there a flaky UI element (animation timing, lazy load) that caused false positives?
- (For design-review sessions) Did you discover a repeated design smell that the codebase
  can't easily fix (e.g. third-party widget that looks generated)?

**Only log it if:** knowing this would save 5+ minutes in a future session.

**Never log:** obvious things, one-time network blips, things the user already knows.

**For each genuine discovery, run:**

```bash
_SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
mkdir -p "$HOME/.lyra/projects/$_SLUG"
echo '{"skill":"SKILL_NAME","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"TYPE","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"files":["path/to/relevant/file"]}' \
  >> "$HOME/.lyra/projects/$_SLUG/learnings.jsonl"
````

**Replace `SKILL_NAME` with the calling skill's short identifier** — use `"qa"` for `lyra-qa` and `"qa-design"` for
`lyra-qa-design`. This lets future sessions filter by source.

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

````

- [ ] **Step 2: Verify the build compiles.** `bun run build` → exit 0.

- [ ] **Step 3: No commit yet.**

---

## Task 6: Write `lib/fix-discipline/fix-discipline.md`

**Files:**
- Create: `lib/fix-discipline/fix-discipline.md`
- Reference: `skills/lyra-qa/SKILL.tmpl.md` lines 644–840 (source material — combines 8a Root Cause, 8b Fix, 8c Commit, 8d Re-test, 8e Classify, 8e.5 Regression Test, 8f Self-Regulation)

- [ ] **Step 1: Create the file.** This is the substantive dedup block. It combines lyra-qa's existing Iron Law (root-cause gate), Verification Gate, classification, and WTF-likelihood heuristic — with `FIX_PREFIX` and `FIX_CAP` as prose-substituted tokens.

```markdown
## Fix Discipline

The rules in this section apply to every fix loop. They are parameterized by two tokens
that each calling skill must substitute:

- **`FIX_PREFIX`** — the commit-message prefix for fixes. Use `fix(qa)` for `lyra-qa`,
  `style(design)` for `lyra-qa-design`.
- **`FIX_CAP`** — the hard upper bound on fixes per run. Use `30` for `lyra-qa-design`,
  leave unset for `lyra-qa` (no cap).

Before entering the fix loop, the calling skill MUST print which values it uses so the
reader sees the substitution concretely.

---

### The Iron Law — no fix without root cause

> [!IMPORTANT]
> **NO FIX WITHOUT ROOT CAUSE FIRST.** You cannot write a single line of fix code until you
> have completed the root-cause investigation below. Skipping to a fix is the most common
> cause of WTF-likelihood climbing. Quick patches mask underlying issues.

**Root-cause investigation steps (all required):**

1. **Read the error carefully.** Don't skim — error messages and stack traces usually
   contain the exact answer. Check any browser console screenshot you took when
   documenting the issue.
2. **Reproduce it consistently.** Can you trigger it reliably with specific steps? If not
   reproducible, gather more data — do NOT guess.
3. **Check recent changes.**
   ```bash
   git log --oneline -10
   git diff main...HEAD --name-only
````

What changed that could cause this? New dependencies, config changes, env differences? 4. **Trace the data flow** (for
multi-component failures). Log what enters and exits each component boundary. Identify WHERE it breaks before investigating
WHY. 5. **Form a single hypothesis.** Write it out: `"I think [X] is the root cause because    [Y]."` Be specific. "Something
is broken" is not a hypothesis.

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

````

- [ ] **Step 2: Verify the build compiles.** `bun run build` → exit 0.

- [ ] **Step 3: No commit yet.**

---

## Task 7: Write `lib/ai-slop/ai-slop.md` and commit all lib modules

**Files:**
- Create: `lib/ai-slop/ai-slop.md`
- Commit: all seven new lib files

- [ ] **Step 1: Create `lib/ai-slop/ai-slop.md`.**

```markdown
## AI Slop Checklist

Walk this checklist during the design audit phase. Each positive match is a finding tagged
`slop:<pattern-id>` with default severity **Medium** unless context makes it worse (e.g.
lorem ipsum in a production checkout flow is Critical, not Medium).

Scoring: each confirmed pattern deducts from `ai_slop_score` using the standard scale —
−25 Critical / −15 High / −8 Medium / −3 Low.

### Color & gradient smells

- **slop:gradient-purple-blue** — Hero background is a purple-to-blue or blue-to-purple
  linear gradient with no brand justification.
- **slop:gradient-pink-orange** — Hero or CTA uses a pink-to-orange sunset gradient. Same
  generic energy as purple-blue.
- **slop:gradient-orb-hero** — Large abstract blob / gradient-orb / mesh-gradient fills
  the hero and does no work (not a product shot, not an illustration, just vibes).
- **slop:default-tailwind-blue** — Primary color is `#3b82f6` (Tailwind's default blue)
  used with no supporting brand color anywhere on the page.

### Shape & surface smells

- **slop:rounded-everything** — `rounded-lg` / `rounded-2xl` / `rounded-3xl` applied
  uniformly to every surface: cards, buttons, inputs, images, modals, avatars. No shape
  hierarchy.
- **slop:glassmorphism-navbar** — Navbar is a `backdrop-blur` semi-transparent panel with
  near-zero information density and no clear brand anchor.
- **slop:uniform-card-shadow** — Every card on the page has the same single drop shadow
  at the same offset — no depth hierarchy.

### Layout smells

- **slop:bento-grid-hero** — Landing page uses a bento-grid pattern (variable-sized
  feature tiles) with no clear information hierarchy — every tile is equally loud.
- **slop:generic-feature-grid** — Three identical icon-headline-blurb cards in a row.
  Each blurb is ~2 lines. Icons are all from the same set. No differentiation by
  importance.
- **slop:empty-state-laptop-person** — Empty-state illustration is a generic "person with
  laptop" SVG from a stock illustration set (Humaaans, unDraw default palette, etc.).

### Copy smells

- **slop:gpt-body-copy** — Body copy reads like direct GPT output: "In today's
  fast-paced world…", "Unlock the power of…", "Seamlessly integrate…", "Elevate your
  workflow…", "Empower your team…", or similar filler phrases.
- **slop:lorem-ipsum-prod** — Lorem ipsum or placeholder text survived into a deployed
  environment. Always at least High severity.
- **slop:heading-emoji-everywhere** — Every H2/H3 has a trailing decorative emoji. Not
  "one emoji for tone" — every single heading.

### Interaction smells

- **slop:hover-lift-scale-shadow** — Every card hover triggers simultaneous
  lift + scale + shadow-bloom + color-shift. Five effects where one would do.
- **slop:transition-on-everything** — `transition: all 0.3s` applied globally, causing
  unwanted animation on color, width, padding changes that should be instant.

### How to decide severity

A pattern that a first-time visitor would notice within 5 seconds → High.
A pattern that erodes trust on a second visit → Medium.
A pattern that a designer would flag but most users wouldn't → Low.

Refer to `references/ai-slop-patterns.md` in the calling skill for extended rationale on
each pattern and typical fixes.
````

- [ ] **Step 2: Verify the build compiles and lint is clean.**

```bash
bun run build
bun run lint:skill
bun run format:check
```

Expected: all three exit 0. Seven new lib files exist; nothing transcludes them yet.

- [ ] **Step 3: Commit all seven lib modules in one commit.**

```bash
git add lib/clean-tree lib/playwright-primitives lib/plan-discovery lib/prior-learnings lib/capture-learnings lib/fix-discipline lib/ai-slop
git status
git commit -m "$(cat <<'EOF'
feat(lib): add shared lib modules for qa and design-review skills

Adds seven new transcludable lib modules that will be consumed by
lyra-qa and the new lyra-qa-design skill:

- clean-tree: git-status clean-working-tree gate
- playwright-primitives: Playwright MCP tool reference
- plan-discovery: Phase 0 plan/spec discovery and selection
- prior-learnings: load per-project learnings.jsonl and apply
- capture-learnings: reflect and log session learnings
- fix-discipline: iron law, verification gate, WTF heuristic
- ai-slop: AI-slop checklist for design audits

Following the existing lib/preflight and lib/output-dir convention.
No callers wired up yet — that happens in follow-up commits.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```

Expected: one new commit.

---

## Task 8: Write `skills/lyra-qa-design/references/design-audit-checklist.md`

**Files:**

- Create: `skills/lyra-qa-design/references/design-audit-checklist.md`

- [ ] **Step 1: Create the file.** This is the per-category audit checklist. Each category explicitly references the
      corresponding `lyra-*` principle skill.

```markdown
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

- **Critical** — breaks brand trust on first impression; the user would close the tab.
- **High** — meaningful quality hit a first-time visitor would feel within 5 seconds.
- **Medium** — polish issue felt subconsciously; erodes trust over repeated visits.
- **Low** — nice-to-have; invisible to most users but would fail a design review.
```

- [ ] **Step 2: Verify no build errors.** `bun run build` → exit 0.

- [ ] **Step 3: No commit yet.** Commit at end of Task 12 with the whole skill.

---

## Task 9: Write `skills/lyra-qa-design/references/ai-slop-patterns.md`

**Files:**

- Create: `skills/lyra-qa-design/references/ai-slop-patterns.md`

- [ ] **Step 1: Create the file.** Extended prose rationale for each pattern in `lib/ai-slop/ai-slop.md`, with typical fixes.
      Structure follows the pattern IDs exactly so the skill can look up "slop:gradient-purple-blue" and jump to the right
      section.

```markdown
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
```

- [ ] **Step 2: Verify no build errors.** `bun run build` → exit 0.

- [ ] **Step 3: No commit yet.**

---

## Task 10: Write `skills/lyra-qa-design/references/design-report-template.md`

**Files:**

- Create: `skills/lyra-qa-design/references/design-report-template.md`

- [ ] **Step 1: Create the file.** Mirrors `skills/lyra-qa/references/qa-report-template.md` structure with design-specific
      sections substituted.

```markdown
# Design Review Report: {APP_NAME}

| Field             | Value                         |
| ----------------- | ----------------------------- |
| **Date**          | {DATE}                        |
| **URL**           | {URL}                         |
| **Branch**        | {BRANCH}                      |
| **Commit**        | {COMMIT_SHA} ({COMMIT_DATE})  |
| **Tier**          | Quick / Standard / Exhaustive |
| **Scope**         | {SCOPE or "Full site"}        |
| **Duration**      | {DURATION}                    |
| **Pages audited** | {COUNT}                       |
| **Screenshots**   | {COUNT}                       |
| **DESIGN.md**     | {"Found" or "Not found"}      |

## Design Score: {DESIGN_SCORE}/100 • AI Slop Score: {AI_SLOP_SCORE}/100

**Baseline → Final:** design {BASELINE_DESIGN}→{FINAL_DESIGN} • ai-slop {BASELINE_SLOP}→{FINAL_SLOP}

## Top 3 Things to Fix

1. **{FINDING-NNN}: {title}** — {one-line description}
2. **{FINDING-NNN}: {title}** — {one-line description}
3. **{FINDING-NNN}: {title}** — {one-line description}

## Severity summary

| Severity | Count | Fixed | Deferred |
| -------- | ----- | ----- | -------- |
| Critical | {N}   | {N}   | {N}      |
| High     | {N}   | {N}   | {N}      |
| Medium   | {N}   | {N}   | {N}      |
| Low      | {N}   | {N}   | {N}      |

## First Impression

{One paragraph capturing your 5-second read of the site. Does it feel intentional? Where does the eye land? Can you name the
product category and audience from the visual design alone?}

## Findings

### FINDING-001: {title}

- **Severity:** {Critical/High/Medium/Low}
- **Category:** {typography/color/layout/interaction/responsive/brand/system/slop:{pattern-id}}
- **Page:** {URL}
- **Fix Status:** {verified/best-effort/reverted/deferred}
- **Commit:** {SHA or "—"}
- **Files Changed:** {paths or "—"}

**What I saw:**

{Describe the finding objectively. Reference the relevant `lyra-*` principle skill if applicable. If the project has
DESIGN.md, cite the specific section that's being violated.}

**Before:**

![before](screenshots/finding-001-before.png)

**After (if fixed):**

![after](screenshots/finding-001-after.png)

**Why it matters:**

{One or two sentences on the impact. Trust, scannability, brand coherence, etc.}

---

### FINDING-002: …

(repeat the template for each finding)

---

## DESIGN.md coverage (if found)

If a DESIGN.md was found: list the sections and note which findings violated which section. If not found: note whether the
user accepted the "offer to draft DESIGN.md" prompt.

## Deferred findings

| ID          | Title   | Severity | Why deferred                      |
| ----------- | ------- | -------- | --------------------------------- |
| FINDING-NNN | {title} | {level}  | {reason, e.g. third-party widget} |

## PR Summary line

> Design review found {N} findings, fixed {M}. Design score {BASELINE}→{FINAL}. AI slop score {BASELINE}→{FINAL}.
```

- [ ] **Step 2: Verify no build errors.** `bun run build` → exit 0.

- [ ] **Step 3: No commit yet.**

---

## Task 11: Write `skills/lyra-qa-design/SKILL.tmpl.md`

**Files:**

- Create: `skills/lyra-qa-design/SKILL.tmpl.md`
- Depends on: Tasks 1–10 (all libs and references must exist — the build will fail otherwise)

- [ ] **Step 1: Create the skill template.** This is the main deliverable. Transclusions pull in the lib content at build
      time; references/ files are pointed at by path (not transcluded) and copied to the compiled skill by `mirrorDir` in
      `scripts/build.ts`.

````markdown
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

{{lib/preflight/preflight.md}}

# Design Review Agent: Visual QA & Fix Engine

You are a senior product designer AND a frontend engineer. Review live web applications with exacting visual standards — then
fix what you find. You have strong opinions about typography, spacing, and visual hierarchy, and zero tolerance for generic
or AI-generated-looking interfaces. Test with a browser, fix in source code, commit atomically, re-verify with evidence.

---

## Phase 1: Plan context discovery

{{lib/plan-discovery/plan-discovery.md}}

---

## Phase 2: Prior learnings

{{lib/prior-learnings/prior-learnings.md}}

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

{{lib/clean-tree/clean-tree.md}}

---

## Phase 5: DESIGN.md detection

Look for `DESIGN.md`, `design-system.md`, `STYLE.md`, `BRAND.md` in the repo root and `docs/`.

```bash
ls DESIGN.md design-system.md STYLE.md BRAND.md \
   docs/DESIGN.md docs/design-system.md docs/STYLE.md docs/BRAND.md \
   2>/dev/null
```
````

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

{{lib/playwright-primitives/playwright-primitives.md}}

---

## Phase 7: Initialize output directory

{{lib/output-dir/output-dir.md}}

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
3. **AI slop scan** — walk `{{lib/ai-slop/ai-slop.md}}`. Tag each confirmed match as `slop:<pattern-id>` and reference
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

{{lib/fix-discipline/fix-discipline.md}}

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

{{lib/capture-learnings/capture-learnings.md}}

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

````

- [ ] **Step 2: Run the build and confirm the new skill compiles.**

```bash
bun run build
````

Expected: output includes `Compiled (N+1): ..., lyra-qa-design, ...` — the new skill is in the compiled list.

- [ ] **Step 3: Run the skill linter.**

```bash
bun run lint:skill
```

Expected: exit 0. If it complains about frontmatter, forbidden characters, or description length, fix in place before
continuing. The `description` field above is within the 1024- character limit but check.

- [ ] **Step 4: No commit yet.** Commit after Task 12 confirms the compiled skill is well-formed.

---

## Task 12: Inspect compiled lyra-qa-design and commit

**Files:**

- Read: `.agents/skills/lyra-qa-design/SKILL.md` (the compiled output)
- Commit: everything under `skills/lyra-qa-design/`

- [ ] **Step 1: Read the compiled SKILL.md.**

```bash
wc -l .agents/skills/lyra-qa-design/SKILL.md
head -60 .agents/skills/lyra-qa-design/SKILL.md
```

Expected: roughly 700–900 lines (skill prose + transcluded lib content). Spot-check that the transclusion points have been
replaced with real content — search for `{{lib/` in the compiled file and confirm zero matches (the build would have failed,
but double-check).

```bash
grep -n '{{lib/' .agents/skills/lyra-qa-design/SKILL.md
```

Expected: no output (zero matches).

- [ ] **Step 2: Check references/ were copied.**

```bash
ls .agents/skills/lyra-qa-design/references/
```

Expected: `design-audit-checklist.md`, `ai-slop-patterns.md`, `design-report-template.md`.

- [ ] **Step 3: Run all lints and format checks.**

```bash
bun run format:check
bun run lint:skill
bun x tsc
```

Expected: all exit 0.

- [ ] **Step 4: Commit the new skill.**

```bash
git add skills/lyra-qa-design
git status
git commit -m "$(cat <<'EOF'
feat(lyra-qa-design): add visual-QA skill driven by Playwright MCP

New skill that audits live web applications for design quality and AI
slop patterns, then fixes findings in source with atomic commits and
re-verifies. Follows the same three-tier model as lyra-qa
(Quick/Standard/Exhaustive), transcludes shared lib modules for
plan discovery, prior/capture learnings, clean-tree gate, Playwright
browser primitives, and fix discipline. References lyra's existing
design-principle skills (lyra-typography-system, lyra-color-theory,
lyra-grid-system, etc.) as sources of truth rather than restating them.

Hard cap: 30 fixes per run. CSS-first bias. DESIGN.md-aware.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```

---

## Task 13: Rewrite lyra-qa browser primitives and every `computer_use:` reference

**Files:**

- Modify: `skills/lyra-qa/SKILL.tmpl.md`

This is the biggest edit to lyra-qa. Replace the inline Browser Primitives table and every `computer_use:` pseudo-action
throughout phases 2–5 with real Playwright MCP references.

- [ ] **Step 1: Replace the "Browser Primitives" section** (approximately lines 174–192).

Find this block:

```markdown
## Browser Primitives (computer_use)

Use `computer_use` for all browser interactions. Reference these patterns throughout:

| Action                    | How                                                       |
| ------------------------- | --------------------------------------------------------- |
| Navigate to URL           | `computer_use`: open/navigate browser to URL              |
| Take annotated screenshot | `computer_use`: screenshot, save to path                  |
| Click element             | `computer_use`: click on [element description]            |
| Fill a form field         | `computer_use`: click field → type "[value]"              |
| Open DevTools console     | `computer_use`: Cmd+Option+J (mac) or F12 → Console tab   |
| Check for JS errors       | `computer_use`: screenshot console after each interaction |
| Set mobile viewport       | `computer_use`: resize browser window to 375×812          |
| Scroll                    | `computer_use`: scroll down/up on page                    |
| Hover                     | `computer_use`: hover over [element]                      |
| Check network tab         | `computer_use`: DevTools → Network tab → screenshot       |

Always show screenshots to the user inline using Read after taking them so they can see evidence.
```

Replace with:

```markdown
{{lib/playwright-primitives/playwright-primitives.md}}
```

Nothing else in this section.

- [ ] **Step 2: Replace every inline `computer_use:` pseudo-action throughout the file.**

First, enumerate all occurrences so you know the work surface:

```bash
grep -n 'computer_use' skills/lyra-qa/SKILL.tmpl.md
```

Expected: roughly 30–50 matches across Phases 2 (Authenticate), 3 (Orient), 4 (Explore), 5 (Document), 8d (Verification
Gate), and the "Important Rules" list. Walk each match and apply the conversion table below.

Find each block of the shape:

```
computer_use: navigate to ...
computer_use: screenshot ...
computer_use: click ...
```

And rewrite as prose that references Playwright MCP tools. Example conversions:

| Old                                                                                           | New                                                                                                        |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `computer_use: navigate to target URL`                                                        | Use `browser_navigate` to the target URL.                                                                  |
| `computer_use: screenshot with annotation — save to .lyra/qa-reports/screenshots/initial.png` | Use `browser_take_screenshot`; the image returns inline in the tool result (do NOT `Read` the saved path). |
| `computer_use: open DevTools console — screenshot for any landing errors`                     | Call `browser_console_messages` to read any console errors from the page load.                             |
| `computer_use: inspect all nav links — document each destination`                             | Use `browser_snapshot` to get the accessibility tree; enumerate links from the snapshot.                   |
| `computer_use: click on [element description]`                                                | Use `browser_snapshot` to get the element's ref, then `browser_click` with that ref.                       |
| `computer_use: click field → type "[value]"`                                                  | Use `browser_type` with the field's ref (from `browser_snapshot`).                                         |
| `computer_use: resize browser to 375×812 (mobile)`                                            | Call `browser_resize` to 375×812.                                                                          |
| `computer_use: screenshot — save mobile screenshot`                                           | Call `browser_take_screenshot`.                                                                            |
| `computer_use: DevTools → Network tab → screenshot`                                           | Call `browser_network_requests` to list requests; no tab-switching needed.                                 |

Rule of thumb: every `computer_use:` line maps 1:1 to a single Playwright MCP tool call, described in prose. Do NOT invent
new shorthand (e.g. "playwright: navigate to …"); write real tool names.

- [ ] **Step 3: After the rewrite, confirm zero `computer_use` references remain.**

```bash
grep -n 'computer_use' skills/lyra-qa/SKILL.tmpl.md
```

Expected: no output.

- [ ] **Step 4: Also remove the old reminder to `Read` screenshot files inline** (it's obsolete under Playwright MCP since
      screenshots come back inline).

Search for:

```bash
grep -n 'Read.*screenshot' skills/lyra-qa/SKILL.tmpl.md
```

For each match, either delete the reminder entirely or rewrite to say "screenshots return inline in the tool result".

- [ ] **Step 5: Build and verify.**

```bash
bun run build
bun run lint:skill
```

Expected: both exit 0. The compiled lyra-qa SKILL.md now uses Playwright references.

- [ ] **Step 6: Commit.**

```bash
git add skills/lyra-qa/SKILL.tmpl.md
git commit -m "$(cat <<'EOF'
fix(lyra-qa): replace broken computer_use refs with Playwright MCP

The lyra-qa skill template referenced a `computer_use` pseudo-tool that
is not exposed inside Claude Code — only the Anthropic API's beta
computer-use tool has that name, and it's not wired into skills. The
skill errored on every invocation.

Rewrites the Browser Primitives section to transclude the new
lib/playwright-primitives/playwright-primitives.md module, and converts
every inline computer_use: pseudo-action throughout Phases 2-5 and the
Verification Gate into prose references to real
mcp__plugin_playwright_playwright__browser_* tools.

No behavioral changes to the phase flow, health rubric, framework
notes, or report template.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Transclude shared libs into lyra-qa

**Files:**

- Modify: `skills/lyra-qa/SKILL.tmpl.md`

Replace the remaining inline blocks with lib transclusions. Each replacement is a distinct step so that if something breaks
you can bisect.

- [ ] **Step 1: Replace the Plan Context Discovery block** (lines ~35–125 in the current file — verify line numbers after the
      Task 13 rewrite shifted the file).

Find the block starting with `## Phase 0: Plan Context Discovery` and ending at the `---` before `## Prior Learnings`.
Replace the entire block (including the `## Phase 0:` header) with:

```markdown
## Phase 0: Plan context discovery

{{lib/plan-discovery/plan-discovery.md}}
```

- [ ] **Step 2: Replace the Prior Learnings block** (currently lines ~128–170).

Find the block starting with `## Prior Learnings` and ending at the `---` before `## Browser Primitives`. Replace with:

```markdown
## Prior learnings

{{lib/prior-learnings/prior-learnings.md}}
```

- [ ] **Step 3: Replace the clean-tree block** (currently around lines 217–235, inside the Setup section).

Find the block starting with `**Check for clean working tree:**` and ending just before `**Detect the git branch:**`. Replace
with:

```markdown
{{lib/clean-tree/clean-tree.md}}
```

- [ ] **Step 4: Replace the fix-discipline content in Phase 8.**

Phase 8 currently has subsections 8a–8f (Root Cause / Fix / Commit / Re-test / Classify / Regression Test / Self-Regulation).
The entire content of Phase 8 from the subsection headings downward is what `lib/fix-discipline` now covers. Replace
everything from the `> [!IMPORTANT] **THE IRON LAW: NO FIX WITHOUT ROOT CAUSE FIRST.**` line through the end of the
`### 8f. Self-Regulation` block with a short skill-specific header plus the transclusion:

```markdown
**This skill uses `FIX_PREFIX = fix(qa)` and leaves `FIX_CAP` unset (no hard cap — but the WTF > 20% rule still applies).**
The fix loop follows the rules in `lib/fix-discipline/fix-discipline.md`.

{{lib/fix-discipline/fix-discipline.md}}
```

Keep the `## Phase 8: Fix Loop` header and the leading sentence (`For each fixable issue, in severity order:`) above the
transclusion.

- [ ] **Step 5: Replace the Capture Learnings block** (currently lines ~907–961).

Find the block starting with `## Capture Learnings` and ending just before `## Completion Status`. Replace with:

```markdown
## Capture learnings

{{lib/capture-learnings/capture-learnings.md}}

**For this skill, use `SKILL_NAME = "qa"`** when writing entries.
```

- [ ] **Step 6: Build and lint.**

```bash
bun run build
bun run lint:skill
bun run format:check
bun x tsc
```

Expected: all exit 0.

- [ ] **Step 7: Confirm the compiled lyra-qa has no unresolved transclusions.**

```bash
grep -n '{{lib/' .agents/skills/lyra-qa/SKILL.md
```

Expected: no output.

- [ ] **Step 8: Spot-check the compiled file length.**

```bash
wc -l .agents/skills/lyra-qa/SKILL.md
```

Expected: roughly 700–900 lines. Should be meaningfully shorter than the pre-extraction 985 lines, offset by the transcluded
lib content. Exact number depends on how much prose was removed versus inlined.

- [ ] **Step 9: Read the first 100 lines of the compiled file** to sanity-check that transclusion produced sensible output
      and that no stray headings got orphaned.

```bash
head -100 .agents/skills/lyra-qa/SKILL.md
```

- [ ] **Step 10: Commit.**

```bash
git add skills/lyra-qa/SKILL.tmpl.md
git commit -m "$(cat <<'EOF'
refactor(lyra-qa): transclude shared lib modules

Replaces five inline blocks in lyra-qa with transclusions from the new
shared lib modules:

- Phase 0 plan discovery → {{lib/plan-discovery/plan-discovery.md}}
- Prior learnings → {{lib/prior-learnings/prior-learnings.md}}
- Clean working tree gate → {{lib/clean-tree/clean-tree.md}}
- Phase 8 fix discipline (root cause, verification gate, WTF heuristic,
  regression tests) → {{lib/fix-discipline/fix-discipline.md}} with
  FIX_PREFIX=fix(qa) and FIX_CAP unset
- Capture learnings → {{lib/capture-learnings/capture-learnings.md}}
  with SKILL_NAME=qa

No behavioral changes — the lib content was extracted verbatim from
lyra-qa's existing blocks so future sessions see the same prose after
the build pass.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: End-to-end validation

**Files:**

- No new files; read-only validation of the whole repo state

- [ ] **Step 1: Full build from clean.**

```bash
rm -rf .agents/skills
bun run build
```

Expected: `Compiled (N): ...` includes both `lyra-qa` and `lyra-qa-design`. No errors about missing transclusion targets.

- [ ] **Step 2: Full lint.**

```bash
bun run format:check
bun run lint:skill
bun x tsc
```

Expected: all exit 0.

- [ ] **Step 3: Shell-lint the build artifacts.**

```bash
bun scripts/lint-sh.ts
```

Expected: exit 0.

- [ ] **Step 4: Confirm zero `computer_use` references anywhere in skills.**

```bash
grep -rn 'computer_use' skills/ lib/ .agents/skills/
```

Expected: no output. If anything appears in `.agents/` but not in `skills/` or `lib/`, the compiled output is stale — re-run
`bun run build`.

- [ ] **Step 5: Confirm zero unresolved `{{lib/` references in compiled output.**

```bash
grep -rn '{{lib/' .agents/skills/
```

Expected: no output.

- [ ] **Step 6: Confirm the acceptance criteria from the spec.**

Walk each criterion from `docs/superpowers/specs/2026-04-14-lyra-qa-design-design.md` section "Acceptance criteria":

1. ✓ `skills/lyra-qa-design/` exists with `SKILL.tmpl.md` and three references.
2. ✓ Seven new lib modules exist.
3. ✓ Zero `computer_use` references in lyra-qa.
4. ✓ lyra-qa transcludes: playwright-primitives, clean-tree, plan-discovery, prior-learnings, capture-learnings,
   fix-discipline.
5. ✓ lyra-qa-design transcludes those plus `ai-slop`, with `FIX_PREFIX = style(design)`, `FIX_CAP = 30`,
   `SKILL_NAME = qa-design` substituted in prose.
6. ✓ `references/design-audit-checklist.md` names each of the seven `lyra-*` principle skills.
7. ⚠ Live-site smoke test of lyra-qa-design — **can only be done manually against an actual test site**. Note this as a
   post-implementation task for the user.
8. ⚠ Live-site smoke test of lyra-qa regression check — **same, manual**.
9. ✓ No `~/.gstack/`, `gstack-slug`, `$B`, `$D` references anywhere new or modified:

   ```bash
   grep -rn 'gstack\|\$B\b\|\$D\b' lib/ skills/lyra-qa-design/ skills/lyra-qa/SKILL.tmpl.md
   ```

   Expected: no output.

- [ ] **Step 7: No commit.** This task is validation only. If any step fails, fix in place and amend the last commit, OR
      create a new fix-up commit — whichever is cleaner.

---

## Task 16: Manual smoke test (user-driven)

**Files:**

- No code changes. This task is a checklist for the human to run before merging.

- [ ] **Step 1: Start a known test web app** (e.g. any local dev server with a landing page — doesn't matter which). Note the
      URL.

- [ ] **Step 2: Invoke `lyra-qa-design` against the URL.** Confirm that:
  - Phase 1 plan discovery works (either finds a plan or offers "No plan — run general").
  - Phase 2 prior-learnings block runs without shell errors.
  - Phase 4 clean-tree gate runs and AskUserQuestion fires if the tree is dirty.
  - Phase 6 browser primitives transclusion is visible in the compiled skill.
  - Phase 9 audit actually navigates via Playwright MCP, takes screenshots, and returns findings.
  - Phase 11 fix loop applies at least one fix with a `style(design):` commit prefix.
  - Phase 12 final audit recomputes scores.
  - Phase 13 report lands at `.lyra/lyra-qa-design/report-<date>.md`.
  - Phase 15 capture-learnings writes at least one entry to `~/.lyra/projects/<slug>/learnings.jsonl` with
    `"skill": "qa-design"`.

- [ ] **Step 3: Invoke `lyra-qa` against the same URL** to verify the regression. Confirm it runs to completion without
      `computer_use`-related errors. Any commits it creates should use the `fix(qa):` prefix.

- [ ] **Step 4: Final manual sign-off.** If both skills ran end to end, the project is done.

---

## Post-implementation notes

- Acceptance criteria 7 and 8 require a live test app and cannot be validated by CI alone. Task 16 captures the manual
  verification steps.
- The `ai-slop-patterns.md` reference file is opinionated — expect the user to adjust wording and add/remove patterns over
  time. Those edits should stay in that one file and in `lib/ai-slop/ai-slop.md`; nothing else depends on specific pattern
  text.
- If a future project adds native (iOS/Android/RN) support, the natural extension is a second lib
  `lib/xcodebuild-primitives/xcodebuild-primitives.md` mirroring `lib/playwright-primitives` and a skill parameter for
  target-surface selection.
