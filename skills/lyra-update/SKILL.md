---
name: lyra-update
description:
  Update the Lyra skill library — pulls latest from git and re-symlinks any new skills. Use when you want to get the latest
  skill updates, or when prompted by a SKILLS_UPDATE_AVAILABLE notice.
allowed-tools:
  - Bash
---

## lyra-update

Pull the latest Lyra skills from git and re-install.

### Find the repo root

```bash
REPO_ROOT=$(git -C ~/.claude/skills/lyra-update rev-parse --show-toplevel)
```

### Step 1: Check what's available

```bash
git -C "$REPO_ROOT" fetch -q origin --tags 2>/dev/null
latest=$(git -C "$REPO_ROOT" tag --sort=-version:refname 2>/dev/null | head -1)
current=$(git -C "$REPO_ROOT" describe --tags --exact-match HEAD 2>/dev/null || echo "unreleased")
```

Show the user: current version, latest version, and what will change. Use `AskUserQuestion` to confirm before pulling:

> "Update Lyra skills from **{current}** → **{latest}**?"

If the user declines, stop here.

### Step 2: Pull

```bash
git -C "$REPO_ROOT" pull --tags
```

### Step 3: Re-symlink new skills

Re-symlink any skills added in the update:

```bash
for skill_dir in "$REPO_ROOT/.agents/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  target="$HOME/.claude/skills/$skill_name"

  if [ -d "$target" ] && [ ! -L "$target" ]; then
    echo "SKIP $skill_name — real directory exists (not overwriting)"
    continue
  fi

  ln -snf "$skill_dir" "$target"
done
```

Also re-link shared scripts in case new ones were added:

```bash
ln -snf "$REPO_ROOT/lib/preflight/scripts" "$HOME/.claude/shared/scripts"
```

### Step 4: Report

Summarize: new version installed, any new skills now linked.
