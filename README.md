# lyra

## Quickstart

Install via the multi-agent skills CLI:

```
npx skills@latest add nikglavin/lyra
```

Or as a Claude Code plugin:

```
claude plugin marketplace add nikglavin/lyra && claude plugin install lyra@lyra
```

## Local development

Symlink every skill in this repo into `~/.claude/skills/` so the local Claude CLI picks them up live (Claude Code only —
edits are reflected without reinstalling):

```
bun install
bun run link
```

Re-run `bun run link` after adding a new skill. List every `SKILL.md` in the repo with `bun run list`.

## Reference

### Design

- **[lyra-brand-storytelling](./skills/design/lyra-brand-storytelling/SKILL.md)** — Create and critique brand architecture,
  style guides, and UX narrative flows.
- **[lyra-design-system](./skills/design/lyra-design-system/SKILL.md)** — Establish visual identity, token architecture, and
  aesthetic direction for a UI.
- **[lyra-qa](./skills/design/lyra-qa/SKILL.md)** — Autonomous QA engineer — tests, finds bugs, fixes them, and re-verifies.
- **[lyra-qa-design](./skills/design/lyra-qa-design/SKILL.md)** — Visual QA agent — audits live web apps with a designer's
  eye.
- **[lyra-website-planning](./skills/design/lyra-website-planning/SKILL.md)** — Architect web platforms with PRDs, customer
  journey maps, and user personas.
