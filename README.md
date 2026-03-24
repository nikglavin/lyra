# Lyra

A skill library for [Claude Code](https://claude.ai/claude-code).

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/nikglavin/lyra/main/install | bash
```

## Skills

| Skill              | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `/lyra-breadboard` | Turn a vague app idea into a lightweight structural wireframe |
| `/lyra-update`     | Pull the latest skill updates from git and re-install         |

## Development

Clone the repo anywhere and run the install script once to symlink skills into `~/.claude/skills/`:

```bash
git clone https://github.com/nikglavin/lyra.git ~/dev/lyra
~/dev/lyra/install
```

Skills in `~/.claude/skills/` are symlinked to `.agents/skills/`, so edits to `skills/` are live after a rebuild — no re-install needed:

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

Shared partials live in `shared/` and are included via `{{shared/filename.md}}` in `.tmpl` files.

## Requirements

- [Claude Code](https://claude.ai/claude-code)
- [Bun](https://bun.sh) (for building skills)
