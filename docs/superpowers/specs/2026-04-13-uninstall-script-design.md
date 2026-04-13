# Uninstall script — design

## Goal

Add an `uninstall` script to Lyra that cleanly reverses what `install` does, with the same conservative philosophy: never
touch anything the installer didn't create.

## Background

`install` (the existing sibling script) writes exactly two kinds of artifacts on a user's machine:

1. Symlinks at `~/.claude/skills/<name>` for every directory in `<repo>/.agents/skills/`. It skips paths that are real
   directories (not symlinks).
2. A symlink at `~/.claude/shared/scripts` → `<repo>/lib/preflight/scripts`. It skips this if the path is already a real
   directory.
3. Optionally, when run via `curl … | bash`, it clones the repo into `~/.lyra` (or `$LYRA_DIR`).

It does not modify `settings.json`, install hooks, or write any other Claude Code state. There is no Anthropic-documented
uninstall pattern for hand-rolled symlink installers — the official path is the plugin marketplace, which Lyra does not use.

Removing the repo without an uninstall step leaves dangling symlinks under `~/.claude/skills/lyra-*` and an orphaned
`~/.claude/shared/scripts` link. These are easy to miss and annoying to clean up by hand.

## Scope

**In scope (v1):**

- Remove the symlinks `install` created, and only those.
- Be safe to run repeatedly, against partial installs, and from any clone.
- Mirror `install`'s output style and SKIP semantics.
- New regression tests under `test/uninstall.test.ts`.
- README "Uninstall" subsection.

**Out of scope:**

- Removing the `~/.lyra` clone directory. The user wipes that manually if they want.
- A `curl … | bash` flow. Under the in-scope rules there's nothing for it to operate on without a clone.
- A `/lyra-uninstall` skill wrapper. Too easy to mis-trigger by an LLM, and the script is a one-liner from a clone.
- Editing `settings.json` or any other Claude Code state. Lyra never wrote any.
- A `--purge` flag. Single-mode script; we can add modes later if real demand appears.

## Design

### Surface area

The script lives at the repo root as `uninstall`, sibling to `install`. Same shebang (`#!/usr/bin/env bash`), same
`set -euo pipefail`. Resolves `REPO_ROOT` from `dirname "${BASH_SOURCE[0]}"` exactly like `install` (no curl-mode branch).

### Removal rules

For each directory `<name>` listed in `<repo>/.agents/skills/`:

1. Compute `target = ~/.claude/skills/<name>`.
2. If `target` does not exist → no-op (already gone).
3. If `target` is a real directory (not a symlink) → log `SKIP <target> — real directory, not removing`, leave it.
4. If `target` is a symlink → resolve its real path. If the real path is inside `REPO_ROOT`, `rm` the symlink and log
   `Removed: <target>`. Otherwise log `SKIP <target> — symlink points outside this repo` and leave it (it could belong to a
   sibling Lyra checkout).

For `~/.claude/shared/scripts`:

1. If it does not exist → no-op.
2. If it is a real directory → SKIP, leave it.
3. If it is a symlink → resolve, check the real path is inside `REPO_ROOT`, then `rm`. Otherwise SKIP.

### Why iterate `.agents/skills/` and not `~/.claude/skills/lyra-*`

Iterating the source directory means the script only ever considers names that the local repo actually ships. A sibling Lyra
checkout that ships a skill we don't have here cannot trick us into removing its symlink. The "real path is inside this repo
root" check is the second line of defence.

### Output format

```
Lyra uninstall
  Repo: /Users/foo/dev/lyra

Removed:  /Users/foo/.claude/skills/lyra-breadboard
Removed:  /Users/foo/.claude/skills/lyra-design-system
…
SKIP:     /Users/foo/.claude/skills/lyra-qa — real directory, not removing
SKIP:     /Users/foo/.claude/shared/scripts — symlink points outside this repo

Done. 11 link(s) removed, 2 skipped.
Note: ~/.lyra clone (if any) was not touched. Remove it manually if desired.
```

Paths are always shown expanded (no literal `~`) so log lines are unambiguous — same convention enforced by the existing
install regression test (ISSUE-001).

### Exit codes

- `0` always when arguments are valid and the script ran to completion.
- `2` if invoked with unknown arguments (none accepted in v1, so any arg is unknown).

There is no failure case where uninstall should exit non-zero on a clean filesystem — every "I left this alone" outcome is a
SKIP, not an error.

### Idempotency

Running `./uninstall` twice in a row results in `0 link(s) removed, 0 skipped` on the second run. Tested explicitly.

## Tests

New `test/uninstall.test.ts`, mirroring the existing `install.test.ts` style (temp `HOME`, `execSync`,
`lstatSync`/`readlinkSync`):

1. **Round-trip happy path.** `install` into a fake home, then `uninstall`. Assert every `~/.claude/skills/lyra-*` entry is
   gone and `~/.claude/shared/scripts` is gone. Assert exit code 0.
2. **Skips real directories.** Pre-create a real dir at `~/.claude/skills/lyra-breadboard`. Run uninstall. Assert the
   directory survives and output contains `SKIP` plus the expanded path.
3. **Skips foreign symlinks.** Pre-create `~/.claude/skills/lyra-breadboard` as a symlink pointing to `/tmp/some-other-path`.
   Run uninstall. Assert the symlink survives and output contains the foreign-symlink SKIP message.
4. **Idempotent.** Run install + uninstall + uninstall. Second uninstall prints `0 link(s) removed` and exits 0.
5. **Shared/scripts foreign.** Pre-create `~/.claude/shared/scripts` as a symlink to a non-Lyra path. Run uninstall. Assert
   it survives.
6. **Shared/scripts real dir.** Pre-create `~/.claude/shared/scripts` as a real directory. Run uninstall. Assert it survives,
   SKIP logged.
7. **No-op on clean home.** Run uninstall against an empty fake home. Assert `0 link(s) removed`, exit 0, no errors.
8. **Path expansion in SKIP messages.** Regression analogue of install's ISSUE-001: assert no SKIP line contains a literal
   `~/`.

The pre-commit hook (`scripts/bash/pre-commit.sh`) already runs `bun test` and `bun scripts/lint-sh.ts`, so the new script
and tests are covered automatically. No new CI wiring.

## Documentation

Add an "Uninstall" subsection to README.md immediately after the install fence:

```markdown
## Uninstall

From a clone:

`​``bash ~/dev/lyra/uninstall `​``

Removes the symlinks `install` created in `~/.claude/skills/` and `~/.claude/shared/`. Does not delete the clone directory or
any real (non-symlink) files. Safe to run repeatedly.
```

No AGENTS.md changes needed — uninstall is user-facing, not an authoring concern.

## Risks

- **User has multiple Lyra checkouts.** The "real path inside this repo" check ensures we only remove links that point at
  _this_ clone. A sibling checkout's links survive untouched.
- **User edited a symlink target manually.** If they re-pointed `~/.claude/shared/scripts` somewhere else on purpose, the
  foreign-target check leaves it alone. Their edit wins.
- **User has a file (not directory, not symlink) at one of the paths.** Falls through to the SKIP path because it is not a
  symlink. We log it and leave it alone.
- **Race with a concurrent install.** Not handled; same risk profile as install itself. Out of scope.

## Open questions

None at design time. All shape decisions resolved during brainstorming.
