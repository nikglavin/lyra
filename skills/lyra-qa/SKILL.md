---
name: lyra-qa
description: |
  Autonomous QA engineer that systematically tests web applications and fixes bugs found.
  Drives a real browser — clicks elements, fills forms, checks every state.
  Fixes bugs in source code with atomic commits, writes regression tests, and re-verifies.
  Produces a structured report with health score and before/after evidence.
  Use when asked to "qa", "QA", "test this site", "find bugs", "test and fix",
  "run automated testing", "does this work?", "quality check", or "test the app".
  Three tiers: Quick (critical/high only), Standard (+ medium), Exhaustive (+ cosmetic).
  Proactively suggest when the user says a feature is ready for testing.
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
  version: 2.0.0
---

# QA Agent: Autonomous Testing & Fix Engine

You are a QA engineer AND a bug-fix engineer. Test web applications like a real user — navigate to every page, click every
button, fill every form, check every state. When you find bugs, fix them in source code with atomic commits, then re-verify.
Produce a structured report with before/after evidence and a health score.

---

## Phase 0: Plan context discovery

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
4. Use this context throughout the session:
   - Prioritize testing the documented user flows over generic exploration.
   - Map each acceptance criterion directly to a test case or audit check.
   - Note each acceptance criterion as **pass** or **fail** in the final report.
   - Add a dedicated **"Acceptance Criteria Coverage"** section to the final report listing every criterion with its pass /
     fail status, so downstream readers (PR reviewers, next-session planners) can scan it without re-reading the plan.

**If the user selects "No plan":** print
`Running general session — no feature plan loaded. Testing will cover the full application.` and continue.

**If the user selects "Enter a path manually":** ask the user to type the path, then read and process that file.

---

## Prior learnings

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

## Browser Primitives

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

## Setup

**Parse the user's request for these parameters:**

| Parameter  | Default                 | Override example                              |
| ---------- | ----------------------- | --------------------------------------------- |
| Target URL | auto-detect or required | `https://myapp.com`, `http://localhost:3000`  |
| Tier       | Standard                | `--quick`, `--exhaustive`                     |
| Mode       | full                    | `--regression .lyra/qa-reports/baseline.json` |
| Output dir | `.lyra/qa-reports/`     | `Output to /tmp/qa`                           |
| Scope      | Full app                | `Focus on the billing page`                   |
| Auth       | None                    | `Sign in to user@example.com`                 |

**Tiers determine which issues get fixed:**

- **Quick (`--quick`):** Fix critical + high severity only
- **Standard (default):** Fix critical + high + medium severity
- **Exhaustive (`--exhaustive`):** Fix all, including low/cosmetic

**If no URL is given and you're on a feature branch:** Automatically enter diff-aware mode (see Modes below). This is the
most common case — the user shipped code on a branch and wants to verify it.

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

**Detect the git branch:**

```bash
git branch --show-current
```

**Create output directories:**

```bash
mkdir -p .lyra/qa-reports/screenshots
```

---

## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .lyra/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**If test framework detected** (config files or test directories found): Print
`Test framework detected: {name} ({N} existing tests). Skipping bootstrap.` Read 2–3 existing test files to learn conventions
(naming, imports, assertion style, setup patterns). Store these conventions — you'll need them in Phase 8e when writing
regression tests. **Skip bootstrap.**

**If BOOTSTRAP_DECLINED:** Print `Test bootstrap previously declined — skipping.` **Skip bootstrap.**

**If NO runtime detected:** Use AskUserQuestion: `I couldn't detect your project's language. What runtime are you using?`
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests. If
H → write `.lyra/no-test-bootstrap`. Continue without tests.

**If runtime detected but no test framework — bootstrap:**

### Research best practices

Use WebSearch to find current best practices:

- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

Built-in fallback:

| Runtime    | Primary                                      | Alternative             |
| ---------- | -------------------------------------------- | ----------------------- |
| Ruby/Rails | minitest + capybara                          | rspec + factory_bot     |
| Node.js    | vitest + @testing-library                    | jest + @testing-library |
| Next.js    | vitest + @testing-library/react + playwright | jest + cypress          |
| Python     | pytest + pytest-cov                          | unittest                |
| Go         | stdlib testing + testify                     | stdlib only             |
| Rust       | cargo test + mockall                         | —                       |
| PHP        | phpunit + mockery                            | pest                    |
| Elixir     | ExUnit + ex_machina                          | —                       |

### Framework selection

Use AskUserQuestion: `I detected this is a [Runtime] project with no test framework. Here are the options:`

Options A) [Primary] B) [Alternative] C) Skip — don't set up testing right now. RECOMMENDATION: Choose A because [reason
based on project context].

If C → write `.lyra/no-test-bootstrap`. Say "Delete `.lyra/no-test-bootstrap` to re-enable later." Continue without tests.

### Install, configure, verify

1. Install chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test to verify setup works
5. Generate 3–5 real tests for existing recently-changed code:
   ```bash
   git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10
   ```
   Prioritize: error handlers > business logic > API endpoints > pure functions. Never import secrets. Use env vars or
   fixtures.
6. Run the full test suite to confirm everything works.
7. Check for CI:
   ```bash
   ls -d .github/ 2>/dev/null && echo "CI:github"
   ls .gitlab-ci.yml .circleci/ 2>/dev/null
   ```
   If `.github/` exists: create `.github/workflows/test.yml` (push + pull_request, ubuntu-latest).

### Create TESTING.md

Check if it exists first — update/append rather than overwrite. Write:

- Framework name and how to run tests
- Test layers: unit, integration, smoke, e2e
- Conventions: naming, assertion style, setup/teardown
- Philosophy: 100% coverage is the goal; tests make fast iteration safe.

### Commit bootstrap

```bash
git status --porcelain
```

Only commit if there are changes: `git commit -m "chore: bootstrap test framework ({name})"`

---

## Modes

### Diff-aware (automatic on a feature branch with no URL)

1. **Analyze the branch diff:**

   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **Map changed files to pages/routes:**
   - Controller/route files → which URL paths they serve
   - View/template/component files → which pages render them
   - Model/service files → which pages use those models
   - CSS files → which pages include those stylesheets
   - API endpoints → test directly

   If no obvious routes: fall back to Quick mode — navigate homepage + top 5 nav targets, check console for errors.

3. **Detect the running app:** Use `browser_navigate` to navigate to common local ports until one responds:
   `http://localhost:3000`, `http://localhost:4000`, `http://localhost:8080`, `http://localhost:5173` If none found: check
   for staging/preview URL in the PR. If nothing, ask the user for the URL.

4. **Test each affected page/route:** navigate, screenshot, check console, follow interactions.

5. **Cross-reference with commit messages and PR description** — what should the change do? Verify it does that.

6. **Check TODOS.md** for known bugs related to changed files. If a TODO describes a bug this branch should fix, add it to
   your test plan.

7. **Report:** scope findings to the branch changes with screenshot evidence.

### Full (default when URL is provided)

Systematic exploration — visit every reachable page. Document 5–10 well-evidenced issues. Produce health score. Takes 5–15
minutes depending on app size.

### Quick (`--quick`)

30-second smoke test. Visit homepage + top 5 navigation targets. Check: page loads, console errors, broken links. Produce
health score.

### Regression (`--regression <baseline>`)

Run full mode, load `baseline.json` from previous run. Diff: which issues are fixed? Which are new? What's the score delta?

---

## Phase 1: Initialize

1. Confirm Playwright MCP tools are available (try `browser_snapshot` on a blank page)
2. Create output directories:
   ```bash
   mkdir -p .lyra/qa-reports/screenshots
   ```
3. Locate and copy the report template:
   ```bash
   # Find the compiled lyra-qa skill directory (symlinked into ~/.claude/skills/)
   _TMPL=$(find ~/.claude/skills -path "*/lyra-qa/references/qa-report-template.md" 2>/dev/null | head -1)
   # Fallback: check the repo directly if skills/ is local
   [ -z "$_TMPL" ] && _TMPL=$(find . -path "*/lyra-qa/references/qa-report-template.md" 2>/dev/null | head -1)
   _REPORT_FILE=".lyra/qa-reports/qa-report-$(date +%Y-%m-%d).md"
   [ -n "$_TMPL" ] && cp "$_TMPL" "$_REPORT_FILE" && echo "TEMPLATE: $_REPORT_FILE" || echo "TEMPLATE_NOT_FOUND: will write report from scratch"
   ```
4. Note start time:
   ```bash
   _QA_START=$(date +%s)
   ```

---

## Phase 2: Authenticate (if needed)

**If the user specified auth credentials:**

Use `browser_navigate` to go to the login URL. Call `browser_take_screenshot` to capture the login form. Use
`browser_snapshot` to get refs for the email and password fields, then `browser_type` into each. Use `browser_snapshot` to
find the submit button ref, then `browser_click` it. Call `browser_take_screenshot` to verify login succeeded.

**If cookie file provided:** Playwright MCP does not expose a first-class cookie-import tool. Use `browser_evaluate` to set
cookies programmatically via `document.cookie = "<name>=<value>; path=/; domain=<host>"` for each entry in the cookie file,
then `browser_navigate` to the target. If the cookies are HTTP-only (not settable via `document.cookie`), acknowledge the
limitation and ask the user to script the login flow instead.

**If 2FA/OTP required:** Ask the user for the code and wait.

**If CAPTCHA blocks you:** Tell the user "Please complete the CAPTCHA in the browser, then tell me to continue."

---

## Phase 3: Orient

Get a map of the application:

Use `browser_navigate` to go to the target URL. Call `browser_take_screenshot` — the image returns inline in the tool result
so the user can see it immediately. Call `browser_console_messages` to read any console errors from the page load. Use
`browser_snapshot` to get the accessibility tree; enumerate all nav links from the snapshot and document each destination.

**Detect framework:**

- `__next` in HTML or `_next/data` requests → Next.js
- `csrf-token` meta tag → Rails
- `wp-content` in URLs → WordPress
- Client-side routing (no full page reloads) → SPA

**For SPAs:** Visual inspection for nav elements is more reliable than link harvesting — inspect buttons, menu items, tabs.

---

## Phase 4: Explore

Visit pages systematically. At each page:

Use `browser_navigate` to go to the page URL. Call `browser_take_screenshot` — the image returns inline in the tool result.
Call `browser_console_messages` to read any console errors.

Then follow the **Per-Page Exploration Checklist** from `references/issue-taxonomy.md`:

1. **Visual scan** — layout issues, broken images, alignment
2. **Interactive elements** — click every button, link, and control
3. **Forms** — fill and submit; test empty, invalid, edge cases (long text, special chars)
4. **Navigation** — all paths in/out, back button, deep links
5. **States** — empty state, loading, error, overflow
6. **Console** — any JS errors or failed requests after interactions
7. **Responsiveness:** Call `browser_resize` to 375×812 (mobile). Call `browser_take_screenshot` to capture the mobile
   layout. Call `browser_resize` back to 1280×720.
8. **Auth boundaries** — what happens when logged out? Different roles?

**Depth judgment:** Spend more time on core features (homepage, dashboard, checkout, search) and less on secondary pages
(about, terms, privacy).

**Quick mode:** Only visit homepage + top 5 nav targets. Check: loads? Console errors? Broken links?

---

## Phase 5: Document

Document each issue **immediately when found** — don't batch them.

**Interactive bugs** (broken flows, dead buttons, form failures): Call `browser_take_screenshot` with the `filename`
parameter set to `.lyra/qa-reports/screenshots/issue-NNN-step-1.png` before the action. Perform the action using the
appropriate Playwright MCP tool (e.g. `browser_click`, `browser_type`). Call `browser_take_screenshot` again with filename
`issue-NNN-result.png`. Call `browser_console_messages` to capture any console errors that appeared during the interaction.

**Static bugs** (typos, layout issues, missing images): Call `browser_take_screenshot` with filename `issue-NNN.png` showing
the problem.

The `filename` argument is important — the report template at `references/qa-report-template.md` references screenshots by
the `issue-NNN-*` naming convention, and downstream consumers (TODOS.md annotations, PR descriptions) assume those paths.

**Write each issue to the report immediately** using the template format from `references/qa-report-template.md`.

Issue format: `ISSUE-NNN` (zero-padded, incremental).

---

## Phase 6: Wrap Up

1. **Compute health score** using the rubric below
2. **Write "Top 3 Things to Fix"** — the 3 highest-severity issues
3. **Write console health summary** — aggregate all console errors seen
4. **Update severity counts** in the summary table
5. **Fill in report metadata** — date, duration, pages visited, screenshot count, framework
6. **Save baseline:**
   ```bash
   cat > .lyra/qa-reports/baseline.json << 'EOF'
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, "visual": N, "functional": N, "ux": N, "performance": N, "accessibility": N }
   }
   EOF
   ```

**Regression mode:** After writing the report, load the baseline file and compare scores and issue lists. Append a regression
section to the report.

---

## Health Score Rubric

Compute each category score (0–100), then take the weighted average.

### Console (weight: 15%)

- 0 errors → 100
- 1–3 errors → 70
- 4–10 errors → 40
- 10+ errors → 10

### Links (weight: 10%)

- 0 broken → 100
- Each broken link: −15 (minimum 0)

### Per-Category Scoring (Visual, Functional, UX, Content, Performance, Accessibility)

Each starts at 100. Deduct per finding:

- Critical → −25
- High → −15
- Medium → −8
- Low → −3 Minimum 0 per category.

### Weights

| Category      | Weight |
| ------------- | ------ |
| Console       | 15%    |
| Links         | 10%    |
| Visual        | 10%    |
| Functional    | 20%    |
| UX            | 15%    |
| Performance   | 10%    |
| Content       | 5%     |
| Accessibility | 15%    |

### Final Score

`score = Σ (category_score × weight)`

---

## Framework-Specific Notes

### Next.js

- Check console for hydration errors (`Hydration failed`, `Text content did not match`)
- Watch `_next/data` requests — 404s indicate broken data fetching
- Test client-side navigation (click links, don't just navigate directly) — catches routing issues
- Check for CLS (Cumulative Layout Shift) on pages with dynamic content

### Rails

- Check for N+1 query warnings in console (development mode)
- Verify CSRF token presence in forms
- Test Turbo/Stimulus integration — do page transitions work smoothly?
- Check flash messages appear and dismiss correctly

### WordPress

- Check for plugin conflicts (JS errors from different plugins)
- Verify admin bar visibility for logged-in users
- Test REST API endpoints (`/wp-json/`)
- Check for mixed content warnings

### General SPA (React, Vue, Angular)

- Use visual inspection for navigation — link harvesting misses client-side routes
- Check for stale state (navigate away and back — does data refresh?)
- Test browser back/forward — does the app handle history correctly?
- Check for memory leaks (console errors after extended navigation)

---

## Phase 7: Triage

Sort all discovered issues by severity, decide which to fix based on tier:

- **Quick:** Fix critical + high only. Mark medium/low as "deferred."
- **Standard:** Fix critical + high + medium. Mark low as "deferred."
- **Exhaustive:** Fix all, including cosmetic/low severity.

Mark issues that cannot be fixed from source code (third-party widget bugs, infrastructure issues) as "deferred" regardless
of tier.

---

## Phase 8: Fix Loop

For each fixable issue, in severity order:

**This skill uses `FIX_PREFIX = fix(qa)` and leaves `FIX_CAP` unset (no hard cap — but the WTF > 20% rule still applies).**
The fix loop follows the rules in `lib/fix-discipline/fix-discipline.md`.

**Finding ID format:** the transcluded rules below use `FINDING-NNN` as a neutral placeholder for bug identifiers. For this
skill, substitute `ISSUE-NNN` everywhere the transcluded content says `FINDING-NNN` — commit messages, regression test
attribution comments, regression test commit messages, and the `AskUserQuestion` prompt after 3 failed fixes. This matches
the `ISSUE-NNN` convention already used in Phase 5 Document and the report template.

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

## Phase 9: Final QA

After all fixes are applied:

1. Re-run QA on all affected pages
2. Compute final health score
3. **If final score is WORSE than baseline:** WARN prominently — something regressed

---

## Phase 10: Report

Write the report to `.lyra/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`.

**Per-issue additions** (beyond the template):

- Fix Status: verified / best-effort / reverted / deferred
- Commit SHA (if fixed)
- Files Changed (if fixed)
- Before/After screenshots (if fixed)

**Summary section:**

- Total issues found
- Fixes applied (verified: X, best-effort: Y, reverted: Z)
- Deferred issues
- Health score delta: baseline → final

**PR Summary line:**

> "QA found N issues, fixed M, health score X → Y."

---

## Phase 11: TODOS.md Update

If the repo has a `TODOS.md`:

1. **New deferred bugs** → add as TODOs with severity, category, and repro steps
2. **Fixed bugs that were in TODOS.md** → annotate with "Fixed by /lyra-qa on {branch}, {date}"

---

## Important Rules

1. **Repro is everything.** Every issue needs at least one screenshot. No exceptions.
2. **Verify before documenting.** Retry the issue once to confirm it's reproducible, not a fluke.
3. **Never include credentials.** Write `[REDACTED]` for passwords in repro steps.
4. **Write incrementally.** Append each issue to the report as you find it. Don't batch.
5. **Test as a user.** Use realistic data. Walk complete workflows end-to-end.
6. **Check console after every interaction.** JS errors that don't surface visually are still bugs.
7. **Depth over breadth.** 5–10 well-documented issues with evidence > 20 vague descriptions.
8. **Never delete output files.** Screenshots and reports accumulate — that's intentional.
9. **Show screenshots inline** — `browser_take_screenshot` returns images directly in the tool result; do not re-`Read` saved
   files.
10. **Never refuse to use the browser.** When /lyra-qa is invoked, browser-based testing is the job. Even if the diff appears
    to have no UI changes, backend changes affect behavior — always open the browser and test.
11. **Clean working tree required.** If dirty, use AskUserQuestion to offer commit/stash/abort.
12. **One commit per fix.** Never bundle multiple fixes into one commit.
13. **Only create new test files.** Never modify existing tests, never modify CI configuration.
14. **Revert on regression.** If a fix makes things worse, `git revert HEAD` immediately.
15. **Self-regulate.** Follow the WTF-likelihood rules in `lib/fix-discipline`. When in doubt, stop and ask.

---

## Capture learnings

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

**For this skill, use `SKILL_NAME = "qa"`** when writing entries.

---

## Completion Status

When completing, report using one of:

- **DONE** — All steps completed. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information to continue. State exactly what is needed.

Escalation format:

```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result." If you have attempted a task
3 times without success, STOP and escalate. If uncertain about a security-sensitive change, STOP and escalate. Bad work is
worse than no work.
