# Lyra

A skill library for [Claude Code](https://claude.ai/claude-code).

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/nikglavin/lyra/main/install | bash
```

## Skills

| Skill                      | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `/lyra-brand-storytelling` | Create and critique brand architecture, style guides, and UX narrative flows    |
| `/lyra-breadboard`         | Turn a vague app idea into a lightweight structural screen flow                 |
| `/lyra-color-theory`       | Create and critique UI color palettes using color psychology and harmony        |
| `/lyra-design-system`      | Establish visual identity, token architecture, and aesthetic direction for a UI |
| `/lyra-grid-system`        | Create and review HTML grid layouts for web applications                        |
| `/lyra-prd-review`         | Review a PRD or Jira epic for scope, ISMS, and technical readiness              |
| `/lyra-qa`                 | Autonomous QA engineer — tests, finds bugs, fixes them, and re-verifies         |
| `/lyra-responsive-design`  | Create and review HTML/CSS responsive design systems and media queries          |
| `/lyra-typography-system`  | Create and review typography systems, type scales, and font pairings            |
| `/lyra-update`             | Pull the latest skill updates from git and re-install                           |
| `/lyra-ux-principles`      | Evaluate and apply UX psychology, Fitts's Law, and visual hierarchy principles  |
| `/lyra-website-planning`   | Architect web platforms with PRDs, customer journey maps, and user personas     |

## Agents

Lyra ships with three persona subagents in `.claude/agents/` that bundle related skills for larger workflows:

| Agent            | Role                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| `lyra-architect` | Product manager persona — scopes projects, maps journeys, and writes PRDs         |
| `lyra-designer`  | UI/UX executor — translates PRDs into structural web code using the design skills |
| `lyra-tester`    | Autonomous QA engine — runs in a worktree, finds bugs, and ships atomic fixes     |

Invoke via the Agent tool or by asking Claude to use the relevant persona.

## Development

Clone the repo anywhere and run the install script once to symlink skills into `~/.claude/skills/`:

```bash
git clone https://github.com/nikglavin/lyra.git ~/dev/lyra
~/dev/lyra/install
```

Skills in `~/.claude/skills/` are symlinked to `.agents/skills/`, so edits to `skills/` are live after a rebuild — no
re-install needed:

```bash
bun run build
```

### Skill structure

```
skills/
  my-skill/
    SKILL.md          # skill prompt (or SKILL.md.tmpl for shared includes)
    scripts/          # any scripts the skill references
```

Shared partials live in `lib/` and are included via `{{lib/path/to/file.md}}` in `.tmpl` files.

### Pre-commit hook

Install the hook once after cloning:

```bash
bun run setup-hooks
```

This symlinks `scripts/bash/pre-commit.sh` into `.git/hooks/pre-commit`. On each commit it runs format checks, typechecking,
linting, and build.

## Requirements

- [Claude Code](https://claude.ai/claude-code)
- [Bun](https://bun.sh) (for building skills)
