---
name: lyra-install
description: Install compiled Lyra skills into ~/.claude/skills/ by symlinking from dist/. Builds automatically if dist/ is missing. Also installs shared scripts to ~/.claude/shared/. Use when setting up Lyra for the first time, or after adding new skills that need to be linked.
allowed-tools:
  - Bash
---

## lyra-install

Symlink all compiled skills from `dist/skills/` into `~/.claude/skills/`, and install shared scripts.

### Find the repo root

```bash
REPO_ROOT=$(git -C "$(dirname "$(realpath ~/.claude/skills/lyra-install)")" rev-parse --show-toplevel)
```

> **First-time bootstrap**: if lyra-install isn't symlinked yet, the user needs to know the repo path directly. Ask them to confirm the repo location, or derive it from how they invoked this skill.

### Step 1: Build if dist/ is missing

```bash
if [ ! -d "$REPO_ROOT/dist/skills" ]; then
  echo "dist/ not found — running build first..."
  node "$REPO_ROOT/skills/lyra-build/scripts/build.mjs"
fi
```

### Step 2: Symlink each skill

For each directory in `$REPO_ROOT/dist/skills/`:

```bash
for skill_dir in "$REPO_ROOT/dist/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  target="$HOME/.claude/skills/$skill_name"

  if [ -d "$target" ] && [ ! -L "$target" ]; then
    echo "SKIP $skill_name — real directory exists at $target (not overwriting)"
    continue
  fi

  ln -snf "$skill_dir" "$target"
  echo "Linked: $skill_name"
done
```

Rules:
- If the target is a real directory (not a symlink), warn and skip — never overwrite.
- If the symlink already points to the right place, `ln -snf` is a no-op.
- If it points somewhere else, update it.

### Step 3: Install shared scripts

```bash
mkdir -p "$HOME/.claude/shared"
ln -snf "$REPO_ROOT/shared/scripts" "$HOME/.claude/shared/scripts"
echo "Linked: shared/scripts → $REPO_ROOT/shared/scripts"
```

### Step 4: Report

List all `~/.claude/skills/` entries that symlink into this repo's `dist/skills/`. Confirm how many were newly linked vs already in place.
