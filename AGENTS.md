# Lyra — Agent Guide

Lyra is a Claude Code plugin for UI/UX and design system skills. Skills live in `skills/`, agents live in `agents/`. The
plugin is installed via `/plugin install lyra@lyra` — no build step, no symlinks.

Key directories:

- `skills/` — skill source files (`SKILL.md`), one folder per skill
- `agents/` — persona subagent definitions that bundle related skills
- `.claude-plugin/` — plugin metadata (`plugin.json`, `marketplace.json`)

## Persona subagents

`agents/` holds subagent definitions that bundle related skills for larger workflows:

- `lyra-architect` — PM persona using `lyra-website-planning`, `lyra-prd-review`, `lyra-breadboard`
- `lyra-designer` — UI/UX executor using all design skills (`lyra-ux-principles`, `lyra-brand-storytelling`,
  `lyra-color-theory`, `lyra-typography-system`, `lyra-grid-system`, `lyra-responsive-design`, `lyra-design-system`)
- `lyra-tester` — autonomous QA engine using `lyra-qa`

Agent files are plain Markdown with YAML frontmatter. Frontmatter fields: `name`, `description`, `tools` (comma-separated
Claude Code tool names), `model`, `skills` (YAML list), `color`. Do not invent tool names.

---

## No build system

There is no build step. Skills are plain `SKILL.md` files — no `.tmpl` files, no `{{lib/...}}` includes, no preflight macro.
Edit `skills/<name>/SKILL.md` directly.

Formatting only:

```
bun run format        # write
bun run format:check  # check only (runs in CI)
```

---

## Adding a new skill

1. Create `skills/lyra-<noun>/`
2. Add `SKILL.md` with valid frontmatter (see below)
3. Commit — no build required

---

## SKILL.md authoring rules

### Frontmatter

```yaml
---
name: lyra-my-skill # kebab-case, matches folder name
description: >
  What it does. Use when user says "...", "...", or asks to "...".


# allowed-tools:
#   - Bash
#   - Read
# metadata:
#   author: your-name
#   version: 1.0.0
---
```

- `name`: kebab-case only, no spaces or capitals, never prefixed with `claude` or `anthropic`
- `description`: must state WHAT the skill does AND WHEN to trigger it (specific user phrases); max 1024 chars; no XML angle
  brackets
- `allowed-tools`: restrict when the skill should not access arbitrary tools (YAML list)

### Instructions body

- Put the most critical constraints at the top — Claude reads top-down
- Use numbered lists for sequential steps, bullets for options or parallel items
- Add an explicit error handling section for likely failure modes
- Use `## Important` or `## Critical` headers for must-follow rules
- Keep `SKILL.md` under ~5,000 words; move detailed reference material to `references/` and link to it
- Be specific: `Run python scripts/validate.py --input {filename}` not "validate the data"
- For deterministic checks, bundle a script in `scripts/` rather than relying on prose instructions

### Triggering

- Vague descriptions → under-triggering; overly broad descriptions → over-triggering
- Include domain synonyms and paraphrased user phrases in `description`
- Add negative triggers when needed: `Do NOT use for X (use lyra-other-skill instead)`

---

## Naming conventions

- Skill folder names: `lyra-<noun>` in kebab-case — the `lyra-` prefix scopes all skills to this library
- No `README.md` inside skill folders — documentation goes in `references/` or the repo root `README.md`

---

## Plugin metadata

`.claude-plugin/plugin.json` — name, description, author. Edit when repo identity changes.

`.claude-plugin/marketplace.json` — marketplace schema for `/plugin install`. Edit when publishing a new plugin entry.
