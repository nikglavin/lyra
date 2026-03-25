#!/usr/bin/env bash
# Lyra deploy script
# Usage: ./scripts/bash/deploy.sh  or  bun run deploy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── 1. Dirty working tree check ───────────────────────────────────────────────
dirty=$(git -C "$REPO_ROOT" diff --name-only HEAD -- ':!.agents/' ':!package.json' 2>/dev/null)
staged=$(git -C "$REPO_ROOT" diff --cached --name-only HEAD -- ':!.agents/' ':!package.json' 2>/dev/null)
untracked=$(git -C "$REPO_ROOT" ls-files --others --exclude-standard -- ':!.agents/' 2>/dev/null)
if [ -n "$dirty" ] || [ -n "$staged" ] || [ -n "$untracked" ]; then
  echo "ERROR: Uncommitted changes outside .agents/ — commit or stash before deploying:" >&2
  [ -n "$dirty" ] && echo "$dirty" >&2
  [ -n "$staged" ] && echo "$staged" >&2
  [ -n "$untracked" ] && echo "$untracked" >&2
  exit 1
fi

# ── 2. Full pre-flight checks ─────────────────────────────────────────────────
echo "Running pre-flight checks..."
bun run --cwd "$REPO_ROOT" format:check
bun run --cwd "$REPO_ROOT" typecheck
bun run --cwd "$REPO_ROOT" lint:ts
bun run --cwd "$REPO_ROOT" lint:sh
bun run --cwd "$REPO_ROOT" test

# ── 3. Build ──────────────────────────────────────────────────────────────────
echo "Building skills..."
bun run --cwd "$REPO_ROOT" build
echo ""

# Fail if build produced untracked output (new skills that aren't committed yet)
new_build_output=$(git -C "$REPO_ROOT" ls-files --others --exclude-standard -- '.agents/' 2>/dev/null)
if [ -n "$new_build_output" ]; then
  echo "ERROR: Build produced untracked files in .agents/ — commit the build output first:" >&2
  echo "$new_build_output" >&2
  exit 1
fi

# ── 4. Lint built output ──────────────────────────────────────────────────────
bun run --cwd "$REPO_ROOT" lint:skills

# ── 5. Read current version ───────────────────────────────────────────────────
PACKAGE_JSON="$REPO_ROOT/package.json"

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed. Install with: brew install jq" >&2
  exit 1
fi

CURRENT_VERSION=$(jq -r '.version' "$PACKAGE_JSON")

if [ -z "$CURRENT_VERSION" ] || [ "$CURRENT_VERSION" = "null" ]; then
  echo "ERROR: Could not read version from $PACKAGE_JSON" >&2
  exit 1
fi

echo "Current version: $CURRENT_VERSION"

# ── 6. Prompt for bump type ───────────────────────────────────────────────────
echo "Version bump type:"
echo "  1) patch"
echo "  2) minor"
echo "  3) major"
printf "Choice [1/2/3]: "
read -r BUMP_CHOICE

IFS='.' read -r MAJOR MINOR PATCH <<<"${CURRENT_VERSION%%-*}"
case "$BUMP_CHOICE" in
1 | patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
2 | minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
3 | major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
*)
  echo "Invalid choice." >&2
  exit 1
  ;;
esac

# ── 7. Check tag doesn't already exist ───────────────────────────────────────
if git -C "$REPO_ROOT" rev-parse "v$NEW_VERSION" &>/dev/null; then
  echo "ERROR: Tag v$NEW_VERSION already exists." >&2
  exit 1
fi

echo ""
echo "New version: $NEW_VERSION"
printf "Proceed? [y/N] "
read -r CONFIRM
[[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && echo "Aborted." && exit 0
echo ""

# ── 8. Bump version in package.json ──────────────────────────────────────────
jq --tab --arg v "$NEW_VERSION" '.version = $v' "$PACKAGE_JSON" >"$PACKAGE_JSON.tmp" && mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"
# Normalise only package.json (bun run format would reformat all files, creating unintended changes)
"$REPO_ROOT/node_modules/.bin/oxfmt" --write "$PACKAGE_JSON"

# ── 9. Commit, tag, push ──────────────────────────────────────────────────────
git -C "$REPO_ROOT" add "$REPO_ROOT/.agents/" "$PACKAGE_JSON"
git -C "$REPO_ROOT" commit -m "release v$NEW_VERSION"
git -C "$REPO_ROOT" tag "v$NEW_VERSION"
git -C "$REPO_ROOT" push origin HEAD --follow-tags

echo ""
echo "Released v$NEW_VERSION"
