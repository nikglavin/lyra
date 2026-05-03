# Lyra — Project Rules

Skills are organized into bucket folders under `skills/`:

- `design/` — UI/UX, design systems, visual QA
- `code/` — daily code work
- `workflow/` — daily non-code workflow tools
- `personal/` — tied to my own setup, not promoted
- `deprecated/` — no longer used

Every skill in `design/`, `code/`, or `workflow/` must have a reference in the top-level `README.md` and an entry in
`.claude-plugin/plugin.json`. Skills in `personal/` and `deprecated/` must not appear in either.

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

Each bucket folder that contains skills has a `README.md` that lists every skill in the bucket with a one-line description,
with the skill name linked to its `SKILL.md`. Empty bucket folders are not created.

## Layout

```
skills/<bucket>/<skill-name>/SKILL.md
```

The skill folder may contain bundled resources (`references/`, `scripts/`) next to `SKILL.md`.

## Adding a skill

1. `mkdir -p skills/<bucket>/<skill-name>/`
2. Add `SKILL.md` with valid frontmatter (`name`, `description`).
3. If the bucket is `design`, `code`, or `workflow`: add a row to the top-level `README.md` Reference section, add the path
   to `.claude-plugin/plugin.json` `skills` array, and update the bucket `README.md`.
4. Re-run `bun run link` so the new skill resolves under `~/.claude/skills/`.

## Scripts

- `bun run link` — symlink every `skills/**/SKILL.md` parent dir into `~/.claude/skills/<name>/` for live local development.
- `bun run list` — print every `SKILL.md` path, sorted, relative to the repo root.
- `bun run format` / `bun run format:check` — oxfmt over the repo.

## Distribution

- **Consumers (multi-agent)**: `npx skills@latest add nikglavin/lyra` — copies skills into the right folder for ~50 different
  agents.
- **Claude Code marketplace**: `claude plugin marketplace add nikglavin/lyra && claude plugin install lyra@lyra`.
- **Local development (Claude Code only)**: `bun run link` — symlink-based, edits are live.
