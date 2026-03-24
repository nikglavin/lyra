---
name: lyra-build
description: Compile the Lyra skill library into dist/ — resolves shared partials in .tmpl files and mirrors scripts/assets/resources into dist/skills/. Use when building skills before installation, or after editing skill source files. Does not install — use lyra-install for that.
allowed-tools:
  - Bash
---

## lyra-build

Compile all Lyra skills from source into `dist/skills/`.

### Find the repo root

```bash
REPO_ROOT=$(git -C "$(dirname "$(realpath ~/.claude/skills/lyra-build)")" rev-parse --show-toplevel)
```

### Run the build

```bash
node "$REPO_ROOT/skills/lyra-build/scripts/build.mjs"
```

The script processes every directory under `skills/`:
- `SKILL.md.tmpl` → compiled `SKILL.md` (resolves `{{shared/...}}` includes); `.tmpl` wins if both exist
- Plain `SKILL.md` → copied as-is when no template is present
- `scripts/`, `references/`, `assets/`, `resources/` → mirrored to `dist/skills/<name>/`, preserving file permissions

Report what was compiled vs unchanged.
