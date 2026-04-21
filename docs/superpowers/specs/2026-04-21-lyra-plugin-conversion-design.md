# Lyra Plugin Conversion Design

**Date:** 2026-04-21  
**Status:** Approved

## Goal

Restructure the Lyra skill library repo to follow Claude Code plugin conventions, enabling installation via the plugin
manager rather than the current git-clone + symlink approach. The repo remains personal/private.

## Approach

Eliminate the build step entirely. Inline all `lib/` partials directly into each skill file, rename `SKILL.tmpl.md` →
`SKILL.md`, and delete the source/build infrastructure. Add plugin metadata files at the repo root.

## Repo Structure (after)

```
lyra/
  .claude-plugin/
    plugin.json        ← name, description, author (no skills/agents path fields needed)
    marketplace.json   ← self-hosted marketplace pointing source: "./"
  skills/
    lyra-brand-storytelling/SKILL.md
    lyra-breadboard/SKILL.md
    lyra-color-theory/SKILL.md
    lyra-design-system/SKILL.md
    lyra-grid-system/SKILL.md
    lyra-prd-review/SKILL.md
    lyra-qa/SKILL.md
    lyra-qa-design/SKILL.md
    lyra-responsive-design/SKILL.md
    lyra-typography-system/SKILL.md
    lyra-ux-principles/SKILL.md
    lyra-website-planning/SKILL.md
  agents/
    lyra-architect.md
    lyra-designer.md
    lyra-tester.md
  README.md
```

## Deleted

- `lib/` — partials inlined into skills; `lib/preflight/` stripped (not inlined)
- `scripts/` — no build step
- `.agents/` — build artifact directory
- `skills/lyra-update/` — plugin manager handles updates
- `install` and `uninstall` scripts — plugin manager handles install/uninstall

## Per-Skill Migration

For each of the 12 remaining skills:

1. Read `skills/<name>/SKILL.tmpl.md`
2. Replace every `{{lib/path/file.md}}` with the actual content of that file
3. Exception: `{{lib/preflight/preflight.md}}` is removed entirely (not inlined)
4. Write result to `skills/<name>/SKILL.md`
5. Delete `SKILL.tmpl.md`

Skill content, frontmatter, descriptions, and behavior are unchanged.

## Agents

Move `.claude/agents/*.md` → `agents/*.md` at repo root. No content changes.

## Plugin Metadata

**`.claude-plugin/plugin.json`**

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

**`.claude-plugin/marketplace.json`**

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

## Installation (after)

Add marketplace entry to `~/.claude/plugins/known_marketplaces.json`:

```json
"lyra": {
  "source": { "source": "github", "repo": "nikglavin/lyra" },
  "installLocation": "/Users/nickg/.claude/plugins/marketplaces/lyra"
}
```

Then: `/plugin install lyra@lyra`

## What's Not Changing

Skill content, agent prompts, and frontmatter are untouched. This is a structural migration only.
