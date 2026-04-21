# Lyra Plugin Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Lyra repo to follow Claude Code plugin conventions — plain `SKILL.md` files, plugin metadata,
agents at repo root — replacing the current build-step + symlink install approach.

**Architecture:** Inline all `lib/` partials directly into each `skills/<name>/SKILL.md`, strip the preflight block entirely,
add `.claude-plugin/plugin.json` + `marketplace.json`, move agents to `agents/`, and delete all build infrastructure. No
skill content changes — structural migration only.

**Tech Stack:** Bash (file ops), git

---

## File Map

**Create:**

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `skills/lyra-brand-storytelling/SKILL.md`
- `skills/lyra-breadboard/SKILL.md`
- `skills/lyra-color-theory/SKILL.md`
- `skills/lyra-design-system/SKILL.md`
- `skills/lyra-grid-system/SKILL.md`
- `skills/lyra-prd-review/SKILL.md`
- `skills/lyra-qa/SKILL.md`
- `skills/lyra-qa-design/SKILL.md`
- `skills/lyra-responsive-design/SKILL.md`
- `skills/lyra-typography-system/SKILL.md`
- `skills/lyra-ux-principles/SKILL.md`
- `skills/lyra-website-planning/SKILL.md`
- `agents/lyra-architect.md`
- `agents/lyra-designer.md`
- `agents/lyra-tester.md`

**Modify:**

- `package.json` — strip build/lint-skill/typecheck/lint-sh scripts and devDeps
- `scripts/bash/pre-commit.sh` — replace with format-only hook
- `tsconfig.json` — remove (no TS files remain)
- `README.md` — update install instructions

**Delete:**

- All `skills/*/SKILL.tmpl.md` (12 files)
- `skills/lyra-update/` (entire directory)
- `lib/` (entire directory)
- `scripts/` (entire directory)
- `test/` (entire directory)
- `.agents/` (entire directory)
- `install`
- `uninstall`

---

### Task 1: Replace pre-commit hook and package.json scripts

The existing pre-commit hook runs `bun run build` and `bun run lint:skills`, both of which depend on `scripts/`. We must
update the hook before doing any commits in later tasks, otherwise the hook will fail when scripts/ is deleted.

**Files:**

- Modify: `scripts/bash/pre-commit.sh`
- Modify: `package.json`

- [ ] **Step 1: Verify current hook references scripts**

```bash
cat scripts/bash/pre-commit.sh
```

Expected: lines containing `bun run build`, `bun run lint:skills`, `git add .agents/`

- [ ] **Step 2: Replace pre-commit script with format-only version**

Write `scripts/bash/pre-commit.sh`:

```sh
#!/bin/sh
# Pre-commit hook: format check only.

set -e

echo "Running pre-commit checks..."

bun run format:check
```

- [ ] **Step 3: Reinstall the hook so .git/hooks/pre-commit picks up the change**

```bash
bun run setup-hooks
```

Expected: output `pre-commit hook installed`

- [ ] **Step 4: Update package.json to remove obsolete scripts and devDependencies**

Replace the `scripts` block and `devDependencies` in `package.json`:

```json
{
	"name": "lyra",
	"version": "0.6.0",
	"description": "A Claude Code plugin for UI/UX and design system skills",
	"scripts": {
		"format:check": "oxfmt --check",
		"format": "oxfmt --write",
		"setup-hooks": "ln -sf \"$(git rev-parse --show-toplevel)/scripts/bash/pre-commit.sh\" .git/hooks/pre-commit && echo 'pre-commit hook installed'"
	},
	"devDependencies": {
		"oxfmt": "^0.42.0"
	}
}
```

- [ ] **Step 5: Regenerate bun.lock after removing devDependencies**

```bash
bun install
```

Expected: lockfile updated, only `oxfmt` remains in devDependencies

- [ ] **Step 6: Verify hook no longer references build**

```bash
cat .git/hooks/pre-commit
```

Expected: only `bun run format:check`, no build or lint-skill lines

- [ ] **Step 7: Delete tsconfig.json** — no TypeScript files will remain after migration

```bash
git rm tsconfig.json
```

- [ ] **Step 8: Commit**

```bash
git add scripts/bash/pre-commit.sh package.json bun.lock
git commit -m "build: replace pre-commit hook with format-only, strip TS tooling"
```

---

### Task 2: Add plugin metadata

**Files:**

- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Create `.claude-plugin/` directory and `plugin.json`**

```bash
mkdir -p .claude-plugin
```

Write `.claude-plugin/plugin.json`:

```json
{
	"name": "lyra",
	"description": "UI/UX and design system skill library for Claude Code. Skills for design systems, color theory, typography, responsive design, QA, and more.",
	"author": {
		"name": "Nick Glavin",
		"url": "https://github.com/nikglavin"
	}
}
```

- [ ] **Step 2: Create `marketplace.json`**

Write `.claude-plugin/marketplace.json`:

```json
{
	"$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
	"name": "lyra",
	"description": "UI/UX and design system skill library for Claude Code",
	"owner": {
		"name": "Nick Glavin",
		"url": "https://github.com/nikglavin"
	},
	"plugins": [
		{
			"name": "lyra",
			"description": "UI/UX and design system skill library — design systems, color theory, typography, responsive design, QA, and more.",
			"source": "./",
			"category": "design"
		}
	]
}
```

- [ ] **Step 3: Verify files exist with correct content**

```bash
cat .claude-plugin/plugin.json && cat .claude-plugin/marketplace.json
```

Expected: both files print valid JSON with `"name": "lyra"`

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/
git commit -m "feat: add claude plugin metadata"
```

---

### Task 3: Migrate simple skills (9 skills — preflight-strip only or no includes)

These skills either have no `{{lib/}}` includes at all, or only have `{{lib/preflight/preflight.md}}` which gets stripped.
For each: remove the preflight line and its trailing blank line, then rename to `SKILL.md`.

Skills with no includes (just rename): `lyra-breadboard`, `lyra-prd-review`

Skills with preflight only (strip + rename): `lyra-brand-storytelling`, `lyra-color-theory`, `lyra-grid-system`,
`lyra-responsive-design`, `lyra-typography-system`, `lyra-ux-principles`, `lyra-website-planning`

**Files:**

- Create: `skills/lyra-breadboard/SKILL.md`
- Create: `skills/lyra-prd-review/SKILL.md`
- Create: `skills/lyra-brand-storytelling/SKILL.md`
- Create: `skills/lyra-color-theory/SKILL.md`
- Create: `skills/lyra-grid-system/SKILL.md`
- Create: `skills/lyra-responsive-design/SKILL.md`
- Create: `skills/lyra-typography-system/SKILL.md`
- Create: `skills/lyra-ux-principles/SKILL.md`
- Create: `skills/lyra-website-planning/SKILL.md`
- Delete: All 9 corresponding `SKILL.tmpl.md` files

- [ ] **Step 1: Verify each skill has only preflight (or no) includes**

```bash
grep -l "{{lib/" skills/lyra-breadboard/SKILL.tmpl.md skills/lyra-prd-review/SKILL.tmpl.md 2>/dev/null || echo "confirmed: no includes"
grep "{{lib/" skills/lyra-brand-storytelling/SKILL.tmpl.md skills/lyra-color-theory/SKILL.tmpl.md skills/lyra-grid-system/SKILL.tmpl.md skills/lyra-responsive-design/SKILL.tmpl.md skills/lyra-typography-system/SKILL.tmpl.md skills/lyra-ux-principles/SKILL.tmpl.md skills/lyra-website-planning/SKILL.tmpl.md
```

Expected: breadboard and prd-review produce no output; others show only `{{lib/preflight/preflight.md}}`

- [ ] **Step 2: Copy no-include skills (breadboard, prd-review) verbatim**

```bash
cp skills/lyra-breadboard/SKILL.tmpl.md skills/lyra-breadboard/SKILL.md
cp skills/lyra-prd-review/SKILL.tmpl.md skills/lyra-prd-review/SKILL.md
```

- [ ] **Step 3: Strip preflight from the 7 preflight-only skills**

The preflight block is a standalone line `{{lib/preflight/preflight.md}}` preceded and followed by a blank line. Remove it
and its trailing blank line:

```bash
for skill in lyra-brand-storytelling lyra-color-theory lyra-grid-system lyra-responsive-design lyra-typography-system lyra-ux-principles lyra-website-planning; do
  sed '/^{{lib\/preflight\/preflight\.md}}$/d' "skills/$skill/SKILL.tmpl.md" > "skills/$skill/SKILL.md"
done
```

- [ ] **Step 4: Verify no `{{lib/` references remain in the 9 new SKILL.md files**

```bash
grep -r "{{lib/" skills/lyra-breadboard/ skills/lyra-prd-review/ skills/lyra-brand-storytelling/ skills/lyra-color-theory/ skills/lyra-grid-system/ skills/lyra-responsive-design/ skills/lyra-typography-system/ skills/lyra-ux-principles/ skills/lyra-website-planning/ 2>/dev/null && echo "FAIL: includes remain" || echo "OK: no includes"
```

Expected: `OK: no includes`

- [ ] **Step 5: Spot-check that frontmatter and first heading are intact in one skill**

```bash
head -20 skills/lyra-color-theory/SKILL.md
```

Expected: YAML frontmatter (`---` ... `---`) followed by skill content, no preflight block

- [ ] **Step 6: Delete the 9 SKILL.tmpl.md files**

```bash
git rm skills/lyra-breadboard/SKILL.tmpl.md skills/lyra-prd-review/SKILL.tmpl.md skills/lyra-brand-storytelling/SKILL.tmpl.md skills/lyra-color-theory/SKILL.tmpl.md skills/lyra-grid-system/SKILL.tmpl.md skills/lyra-responsive-design/SKILL.tmpl.md skills/lyra-typography-system/SKILL.tmpl.md skills/lyra-ux-principles/SKILL.tmpl.md skills/lyra-website-planning/SKILL.tmpl.md
```

- [ ] **Step 7: Commit**

```bash
git add skills/lyra-breadboard/ skills/lyra-prd-review/ skills/lyra-brand-storytelling/ skills/lyra-color-theory/ skills/lyra-grid-system/ skills/lyra-responsive-design/ skills/lyra-typography-system/ skills/lyra-ux-principles/ skills/lyra-website-planning/
git commit -m "feat: migrate simple skills to plain SKILL.md"
```

---

### Task 4: Migrate lyra-design-system

Inlines two partials (`design-knowledge`, `ai-slop`) and strips preflight.

**Files:**

- Create: `skills/lyra-design-system/SKILL.md`
- Delete: `skills/lyra-design-system/SKILL.tmpl.md`

- [ ] **Step 1: Verify includes in lyra-design-system**

```bash
grep "{{lib/" skills/lyra-design-system/SKILL.tmpl.md
```

Expected:

```
{{lib/preflight/preflight.md}}
{{lib/design-knowledge/design-knowledge.md}}
{{lib/ai-slop/ai-slop.md}}
```

- [ ] **Step 2: Build the inlined SKILL.md using bun run build as reference, then write manually**

The build script already produces the correct output at `.agents/skills/lyra-design-system/SKILL.md`. Use that as the base
but strip the preflight block:

```bash
# Strip the ## Preflight section (from the heading through its trailing blank line)
awk '/^## Preflight$/{skip=1} skip && /^$/{skip=0; next} !skip' \
  .agents/skills/lyra-design-system/SKILL.md > skills/lyra-design-system/SKILL.md
```

- [ ] **Step 3: Verify no `{{lib/` or preflight block in output**

```bash
grep "{{lib/" skills/lyra-design-system/SKILL.md && echo "FAIL: template refs remain" || echo "OK"
grep "## Preflight" skills/lyra-design-system/SKILL.md && echo "FAIL: preflight block remains" || echo "OK"
grep "SKILLS_UPDATE_AVAILABLE" skills/lyra-design-system/SKILL.md && echo "FAIL: update check remains" || echo "OK"
```

Expected: all three print `OK`

- [ ] **Step 4: Verify design-knowledge content is present**

```bash
grep -c "design-knowledge\|Design Knowledge\|typography\|color" skills/lyra-design-system/SKILL.md
```

Expected: count > 0 (confirms inline happened)

- [ ] **Step 5: Delete SKILL.tmpl.md**

```bash
git rm skills/lyra-design-system/SKILL.tmpl.md
```

- [ ] **Step 6: Commit**

```bash
git add skills/lyra-design-system/SKILL.md
git commit -m "feat: migrate lyra-design-system to plain SKILL.md"
```

---

### Task 5: Migrate lyra-qa

Inlines six partials (`plan-discovery`, `prior-learnings`, `playwright-primitives`, `clean-tree`, `fix-discipline`,
`capture-learnings`) and strips preflight.

**Files:**

- Create: `skills/lyra-qa/SKILL.md`
- Delete: `skills/lyra-qa/SKILL.tmpl.md`

- [ ] **Step 1: Verify includes**

```bash
grep "{{lib/" skills/lyra-qa/SKILL.tmpl.md
```

Expected:

```
{{lib/preflight/preflight.md}}
{{lib/plan-discovery/plan-discovery.md}}
{{lib/prior-learnings/prior-learnings.md}}
{{lib/playwright-primitives/playwright-primitives.md}}
{{lib/clean-tree/clean-tree.md}}
{{lib/fix-discipline/fix-discipline.md}}
{{lib/capture-learnings/capture-learnings.md}}
```

- [ ] **Step 2: Build inlined SKILL.md from build artifact, strip preflight**

```bash
awk '/^## Preflight$/{skip=1} skip && /^$/{skip=0; next} !skip' \
  .agents/skills/lyra-qa/SKILL.md > skills/lyra-qa/SKILL.md
```

- [ ] **Step 3: Verify output is clean**

```bash
grep "{{lib/" skills/lyra-qa/SKILL.md && echo "FAIL" || echo "OK: no template refs"
grep "## Preflight" skills/lyra-qa/SKILL.md && echo "FAIL" || echo "OK: no preflight"
grep "SKILLS_UPDATE_AVAILABLE" skills/lyra-qa/SKILL.md && echo "FAIL" || echo "OK: no update check"
```

Expected: all three print `OK`

- [ ] **Step 4: Verify playwright primitives are inlined**

```bash
grep -c "playwright\|Playwright\|browser_navigate\|browser_click" skills/lyra-qa/SKILL.md
```

Expected: count > 0

- [ ] **Step 5: Delete SKILL.tmpl.md**

```bash
git rm skills/lyra-qa/SKILL.tmpl.md
```

- [ ] **Step 6: Commit**

```bash
git add skills/lyra-qa/SKILL.md
git commit -m "feat: migrate lyra-qa to plain SKILL.md"
```

---

### Task 6: Migrate lyra-qa-design

Inlines eight partials (`plan-discovery`, `prior-learnings`, `clean-tree`, `playwright-primitives`, `output-dir`, `ai-slop`,
`fix-discipline`, `capture-learnings`) and strips preflight.

**Files:**

- Create: `skills/lyra-qa-design/SKILL.md`
- Delete: `skills/lyra-qa-design/SKILL.tmpl.md`

- [ ] **Step 1: Verify includes**

```bash
grep "{{lib/" skills/lyra-qa-design/SKILL.tmpl.md
```

Expected:

```
{{lib/preflight/preflight.md}}
{{lib/plan-discovery/plan-discovery.md}}
{{lib/prior-learnings/prior-learnings.md}}
{{lib/clean-tree/clean-tree.md}}
{{lib/playwright-primitives/playwright-primitives.md}}
{{lib/output-dir/output-dir.md}}
{{lib/ai-slop/ai-slop.md}}
{{lib/fix-discipline/fix-discipline.md}}
{{lib/capture-learnings/capture-learnings.md}}
```

- [ ] **Step 2: Build inlined SKILL.md from build artifact, strip preflight**

```bash
awk '/^## Preflight$/{skip=1} skip && /^$/{skip=0; next} !skip' \
  .agents/skills/lyra-qa-design/SKILL.md > skills/lyra-qa-design/SKILL.md
```

- [ ] **Step 3: Verify output is clean**

```bash
grep "{{lib/" skills/lyra-qa-design/SKILL.md && echo "FAIL" || echo "OK: no template refs"
grep "## Preflight" skills/lyra-qa-design/SKILL.md && echo "FAIL" || echo "OK: no preflight"
grep "SKILLS_UPDATE_AVAILABLE" skills/lyra-qa-design/SKILL.md && echo "FAIL" || echo "OK: no update check"
```

Expected: all three print `OK`

- [ ] **Step 4: Delete SKILL.tmpl.md**

```bash
git rm skills/lyra-qa-design/SKILL.tmpl.md
```

- [ ] **Step 5: Commit**

```bash
git add skills/lyra-qa-design/SKILL.md
git commit -m "feat: migrate lyra-qa-design to plain SKILL.md"
```

---

### Task 7: Move agents to repo root

The plugin manager discovers agents from `agents/` at the repo root. Currently they live at `.claude/agents/`.

**Files:**

- Create: `agents/lyra-architect.md`
- Create: `agents/lyra-designer.md`
- Create: `agents/lyra-tester.md`

- [ ] **Step 1: Verify agents exist at current location**

```bash
ls .claude/agents/
```

Expected: `lyra-architect.md  lyra-designer.md  lyra-tester.md`

- [ ] **Step 2: Create agents/ directory and copy files**

```bash
mkdir -p agents
cp .claude/agents/lyra-architect.md agents/lyra-architect.md
cp .claude/agents/lyra-designer.md agents/lyra-designer.md
cp .claude/agents/lyra-tester.md agents/lyra-tester.md
```

- [ ] **Step 3: Verify agents are at new location with correct content**

```bash
ls agents/ && head -5 agents/lyra-architect.md
```

Expected: three files listed; frontmatter with `name: lyra-architect`

- [ ] **Step 4: Commit**

```bash
git add agents/
git commit -m "feat: move agents to repo root for plugin convention"
```

---

### Task 8: Delete old infrastructure

Delete all build tooling, the old agents location, install/uninstall scripts, and lyra-update skill.

**Files:**

- Delete: `lib/`
- Delete: `scripts/`
- Delete: `test/`
- Delete: `.agents/`
- Delete: `.claude/agents/`
- Delete: `install`
- Delete: `uninstall`
- Delete: `skills/lyra-update/`

- [ ] **Step 1: Verify all 12 skills now have SKILL.md and no SKILL.tmpl.md**

```bash
find skills/ -name "SKILL.tmpl.md" | sort
find skills/ -name "SKILL.md" | sort
```

Expected: first command prints nothing; second command prints 12 paths (one per skill, excluding lyra-update)

- [ ] **Step 2: Delete build artifacts and source infrastructure**

```bash
git rm -r lib/ scripts/ test/ .agents/ install uninstall
git rm -r skills/lyra-update/
git rm -r .claude/agents/
```

- [ ] **Step 3: Verify deletions**

```bash
ls lib/ scripts/ test/ .agents/ 2>&1
```

Expected: `No such file or directory` for each

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove build infrastructure, install scripts, and lyra-update"
```

---

### Task 9: Update README

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Read current README install section**

```bash
grep -n "Install\|install\|curl\|symlink\|clone" README.md | head -20
```

- [ ] **Step 2: Replace install instructions**

Find and replace the install section in `README.md`. The new install section should read:

````markdown
## Install

Add the Lyra marketplace to `~/.claude/plugins/known_marketplaces.json`:

```json
"lyra": {
  "source": { "source": "github", "repo": "nikglavin/lyra" },
  "installLocation": "/Users/<you>/.claude/plugins/marketplaces/lyra"
}
```
````

Then install via Claude Code:

```
/plugin install lyra@lyra
```

````

Also remove the **Development** / clone-and-symlink section if present, since it no longer applies.

- [ ] **Step 3: Remove the Uninstall section** (plugin manager handles it)

Edit `README.md` to remove any `## Uninstall` section referencing the old uninstall script.

- [ ] **Step 4: Update the Agents section** to reflect the new `agents/` location if it references `.claude/agents/`

- [ ] **Step 5: Verify README has no references to old tooling**

```bash
grep -n "install\|uninstall\|symlink\|bun run\|\.agents\|lyra-update" README.md
````

Expected: no hits, or only contextual mentions (not instructions)

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README for plugin-based install"
```

---

### Task 10: Final verification

- [ ] **Step 1: Confirm repo structure matches spec**

```bash
ls -la
ls skills/
ls agents/
ls .claude-plugin/
```

Expected:

- `skills/` contains 12 directories (no lyra-update)
- `agents/` contains 3 `.md` files
- `.claude-plugin/` contains `plugin.json` and `marketplace.json`
- No `lib/`, `scripts/`, `test/`, `.agents/`, `install`, `uninstall` at root

- [ ] **Step 2: Confirm no SKILL.tmpl.md files remain**

```bash
find . -name "SKILL.tmpl.md" -not -path "./node_modules/*"
```

Expected: no output

- [ ] **Step 3: Confirm no `{{lib/` template references in any SKILL.md**

```bash
grep -r "{{lib/" skills/
```

Expected: no output

- [ ] **Step 4: Confirm no preflight or update-check content in any SKILL.md**

```bash
grep -r "SKILLS_UPDATE_AVAILABLE\|lib/preflight\|lyra-update" skills/
```

Expected: no output

- [ ] **Step 5: Confirm plugin.json is valid JSON**

```bash
bun -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.log('OK')"
bun -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); console.log('OK')"
```

Expected: `OK` for both

- [ ] **Step 6: Check git log looks clean**

```bash
git log --oneline -10
```

Expected: sequence of meaningful commits from this migration
