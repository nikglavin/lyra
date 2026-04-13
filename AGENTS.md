# Lyra — Agent Guide

Lyra is a Claude Code skill library with a custom build system. Skills are authored in `skills/`, compiled to
`.agents/skills/`, and symlinked into `~/.claude/skills/` on install.

Key directories: `skills/` (source), `.agents/skills/` (compiled, committed), `lib/` (shared partials), `scripts/`
(build/lint tooling), `test/` (regression suite), `.claude/agents/` (persona subagents that bundle skills).

## Persona subagents

`.claude/agents/` holds subagent definitions that bundle related skills for larger workflows:

- `lyra-architect` — PM persona using `lyra-website-planning`, `lyra-prd-review`, `lyra-breadboard`
- `lyra-designer` — UI/UX executor using all design skills (`lyra-ux-principles`, `lyra-brand-storytelling`,
  `lyra-color-theory`, `lyra-typography-system`, `lyra-grid-system`, `lyra-responsive-design`, `lyra-design-system`)
- `lyra-tester` — autonomous QA engine using `lyra-qa`

Agent frontmatter uses YAML lists for `skills:` and Claude Code tool names (`Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`,
`AskUserQuestion`, `WebSearch`). Do not invent tool names.

---

## Build system

- Source files: `skills/<name>/SKILL.md.tmpl` (when using includes) or `SKILL.md` (plain)
- `{{lib/path/to/file.md}}` tokens in `.tmpl` files are resolved by `scripts/build.ts` and inlined
- Output lands in `.agents/skills/<name>/SKILL.md` — commit this directory
- Resource subdirectories (`scripts/`, `resources/`, `assets/`, `references/`) are mirrored verbatim into the output skill
  folder
- Path traversal in include paths is rejected at build time — `../../` escapes will throw
- After any change to `skills/` or `lib/`, run:

```
bun run build
```

---

## Testing and validation

```
bun test              # full test suite (test/)
```

`scripts/lint-skill.ts` validates every compiled skill:

- Folder name is kebab-case
- `SKILL.md` exists (exact casing)
- YAML frontmatter is valid with `---` delimiters
- `name` and `description` fields are present
- No forbidden characters (XML angle brackets)

The pre-commit hook (`scripts/bash/pre-commit.sh`) runs in order: `format:check` → `typecheck` → lint → `build` → skill lint.
Do not skip it.

When adding a skill with new template behavior, add a regression case to `test/build.test.ts`.

---

## Naming conventions

- Skill folder names: `lyra-<noun>` in kebab-case — the `lyra-` prefix scopes all skills to this library
- Use `SKILL.tmpl.md` when the skill references any `{{lib/...}}` includes; use plain `SKILL.md` otherwise
- Every skill body must include `{{lib/preflight/preflight.md}}` immediately after the frontmatter — this handles update
  checking
- No `README.md` inside skill folders — documentation goes in `references/` or the repo root `README.md`

---

## SKILL.md authoring rules

### Frontmatter

```yaml
---
name: lyra-my-skill # kebab-case, matches folder name
description: >
  What it does. Use when user says "...", "...", or asks to "...".


# allowed-tools: "Bash(python:*) WebFetch"   # optional
# metadata:
#   author: your-name
#   version: 1.0.0
---
```

- `name`: kebab-case only, no spaces or capitals, never prefixed with `claude` or `anthropic`
- `description`: must state WHAT the skill does AND WHEN to trigger it (specific user phrases); max 1024 chars; no XML angle
  brackets
- `allowed-tools`: restrict when the skill should not access arbitrary tools

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

## Adding a new skill

1. Create `skills/lyra-<noun>/`
2. Add `SKILL.tmpl.md` with valid frontmatter
3. Add `{{lib/preflight/preflight.md}}` as the first line of the body
4. Add any `scripts/`, `resources/`, `assets/`, or `references/` subdirectories as needed
5. Run `bun run build` — verify output appears in `.agents/skills/lyra-<noun>/`
6. Run `bun test` — add a regression case to `test/build.test.ts` if new template behavior is introduced
7. Test triggering: ask Claude "when would you use lyra-\<noun\>?" and confirm the description covers expected phrases
