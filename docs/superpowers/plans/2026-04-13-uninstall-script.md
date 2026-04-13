# Uninstall Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sibling `uninstall` script to Lyra that conservatively reverses everything `install` writes, with full
regression coverage in `test/uninstall.test.ts`.

**Architecture:** Single bash script at the repo root, mirroring `install`'s layout. Iterates `<repo>/.agents/skills/` to
decide which `~/.claude/skills/<name>` symlinks belong to this clone, plus handles `~/.claude/shared/scripts`. Every removal
gated on (a) the path being a symlink and (b) `realpath` resolving inside `REPO_ROOT`. No `settings.json` or hook touches.

**Tech Stack:** bash 4+, GNU coreutils-compatible `readlink`/`rm`, Bun test runner mirroring `test/install.test.ts`.

**Spec:** `docs/superpowers/specs/2026-04-13-uninstall-script-design.md`

---

## File Structure

- Create: `uninstall` (repo root, sibling to `install`)
- Create: `test/uninstall.test.ts`
- Modify: `README.md` — add an "Uninstall" subsection after the install fence

No source-tree changes. No new dependencies. No CI wiring (pre-commit hook already runs `bun test` and
`bun scripts/lint-sh.ts`).

---

## Task 1: Scaffold the uninstall script and first failing test

**Files:**

- Create: `uninstall`
- Create: `test/uninstall.test.ts`

- [ ] **Step 1: Write the failing "no-op on clean home" test**

Create `test/uninstall.test.ts`:

```ts
import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const UNINSTALL_SCRIPT = join(REPO_ROOT, "uninstall");

function runUninstall(fakeHome: string): string {
	return execSync(`HOME="${fakeHome}" bash "${UNINSTALL_SCRIPT}" 2>&1`, {
		cwd: REPO_ROOT,
		encoding: "utf8",
	});
}

test("uninstall is a no-op on a clean home", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		const output = runUninstall(fakeHome);
		expect(output).toMatch(/Done\. 0 link\(s\) removed/);
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/uninstall.test.ts`

Expected: FAIL — `uninstall` script does not exist yet, `bash` exits non-zero with "No such file or directory".

- [ ] **Step 3: Create the minimal uninstall script**

Create `uninstall`:

```bash
#!/usr/bin/env bash
# Lyra uninstall script
# Usage: ./uninstall

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -gt 0 ]; then
  echo "ERROR: uninstall takes no arguments (got: $*)" >&2
  exit 2
fi

echo "Lyra uninstall"
echo "  Repo: $REPO_ROOT"
echo ""

removed=0
skipped=0

# Resolve a path's real (canonical) location, or empty string on failure.
resolve_real() {
  local p="$1"
  local dir base
  dir="$(dirname "$p")"
  base="$(basename "$p")"
  if [ -d "$dir" ]; then
    echo "$(cd "$dir" && pwd -P)/$base"
  else
    echo ""
  fi
}

# Check whether a real path lies inside REPO_ROOT.
inside_repo() {
  local real="$1"
  case "$real" in
    "$REPO_ROOT"/*) return 0 ;;
    *) return 1 ;;
  esac
}

echo ""
echo "Done. $removed link(s) removed, $skipped skipped."
echo "Note: ~/.lyra clone (if any) was not touched. Remove it manually if desired."
```

- [ ] **Step 4: Make it executable**

Run: `chmod +x uninstall`

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (1/1).

- [ ] **Step 6: Commit**

```bash
git add uninstall test/uninstall.test.ts
git commit -m "feat(uninstall): scaffold script with no-op clean-home test"
```

---

## Task 2: Skill symlink removal — happy path

**Files:**

- Modify: `uninstall`
- Modify: `test/uninstall.test.ts`

- [ ] **Step 1: Add the round-trip test**

Append to `test/uninstall.test.ts`:

```ts
import { lstatSync } from "fs";

const INSTALL_SCRIPT = join(REPO_ROOT, "install");

function runInstall(fakeHome: string): string {
	return execSync(`HOME="${fakeHome}" bash "${INSTALL_SCRIPT}" 2>&1`, {
		cwd: REPO_ROOT,
		encoding: "utf8",
	});
}

test("install + uninstall round-trip removes every skill symlink", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		runInstall(fakeHome);
		const breadboard = join(fakeHome, ".claude/skills/lyra-breadboard");
		expect(lstatSync(breadboard).isSymbolicLink()).toBe(true);

		const output = runUninstall(fakeHome);
		expect(output).toContain("Removed:");
		expect(output).toContain("lyra-breadboard");
		expect(() => lstatSync(breadboard)).toThrow();
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/uninstall.test.ts`

Expected: FAIL on the new test — uninstall does not actually remove anything yet, `lstatSync(breadboard)` still succeeds.

- [ ] **Step 3: Implement the skill removal loop**

In `uninstall`, replace the trailing `echo ""` / `Done.` block with the loop and then re-print the summary. Final body of the
script after the helper functions:

```bash
# Remove skill symlinks that point into this repo.
if [ -d "$REPO_ROOT/.agents/skills" ]; then
  for skill_dir in "$REPO_ROOT/.agents/skills"/*/; do
    skill_dir="${skill_dir%/}"
    skill_name=$(basename "$skill_dir")
    target="$HOME/.claude/skills/$skill_name"

    if [ ! -e "$target" ] && [ ! -L "$target" ]; then
      continue  # nothing there
    fi

    if [ -d "$target" ] && [ ! -L "$target" ]; then
      echo "SKIP:     $target — real directory, not removing"
      skipped=$((skipped + 1))
      continue
    fi

    if [ -L "$target" ]; then
      real="$(resolve_real "$(readlink "$target")")"
      if [ -n "$real" ] && inside_repo "$real"; then
        rm "$target"
        echo "Removed:  $target"
        removed=$((removed + 1))
      else
        echo "SKIP:     $target — symlink points outside this repo"
        skipped=$((skipped + 1))
      fi
      continue
    fi

    # File (not dir, not symlink). Leave it.
    echo "SKIP:     $target — not a symlink, not removing"
    skipped=$((skipped + 1))
  done
fi

echo ""
echo "Done. $removed link(s) removed, $skipped skipped."
echo "Note: ~/.lyra clone (if any) was not touched. Remove it manually if desired."
```

Note: `resolve_real` receives the raw `readlink` output (which may be relative). Update `resolve_real` so a relative input
resolves against `dirname "$target"`. Replace `resolve_real` with:

```bash
# Resolve a symlink target to its canonical real path.
# $1 = the path of the symlink itself.
resolve_real() {
  local link="$1"
  local raw dir
  raw="$(readlink "$link")"
  case "$raw" in
    /*) ;;
    *) raw="$(dirname "$link")/$raw" ;;
  esac
  if [ -e "$raw" ]; then
    (cd "$(dirname "$raw")" && printf '%s/%s\n' "$(pwd -P)" "$(basename "$raw")")
  else
    printf '\n'
  fi
}
```

And update the call site in the loop to pass the symlink path directly:

```bash
real="$(resolve_real "$target")"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (2/2). Round-trip test now finds the symlink gone and the output line `Removed:  …/lyra-breadboard`.

- [ ] **Step 5: Commit**

```bash
git add uninstall test/uninstall.test.ts
git commit -m "feat(uninstall): remove skill symlinks pointing into this repo"
```

---

## Task 3: Skip real directories and foreign symlinks

**Files:**

- Modify: `test/uninstall.test.ts`

- [ ] **Step 1: Add the "skips real directories" test**

Append to `test/uninstall.test.ts`:

```ts
import { mkdirSync, symlinkSync } from "fs";

test("uninstall leaves real (non-symlink) directories alone", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		const real = join(fakeHome, ".claude/skills/lyra-breadboard");
		mkdirSync(real, { recursive: true });

		const output = runUninstall(fakeHome);
		expect(output).toContain("SKIP:");
		expect(output).toContain("real directory");
		expect(output).toContain(real);
		expect(lstatSync(real).isDirectory()).toBe(true);
		expect(lstatSync(real).isSymbolicLink()).toBe(false);
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 2: Add the "skips foreign symlinks" test**

```ts
test("uninstall leaves symlinks pointing outside this repo alone", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	const foreignTarget = mkdtempSync(join(tmpdir(), "lyra-foreign-"));
	try {
		mkdirSync(join(fakeHome, ".claude/skills"), { recursive: true });
		const link = join(fakeHome, ".claude/skills/lyra-breadboard");
		symlinkSync(foreignTarget, link);

		const output = runUninstall(fakeHome);
		expect(output).toContain("SKIP:");
		expect(output).toContain("symlink points outside this repo");
		expect(lstatSync(link).isSymbolicLink()).toBe(true);
	} finally {
		rmSync(fakeHome, { recursive: true });
		rmSync(foreignTarget, { recursive: true });
	}
});
```

- [ ] **Step 3: Run tests to verify they pass without further script changes**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (4/4). The script logic from Task 2 already covers both branches.

- [ ] **Step 4: Commit**

```bash
git add test/uninstall.test.ts
git commit -m "test(uninstall): cover real-dir and foreign-symlink skip paths"
```

---

## Task 4: Handle ~/.claude/shared/scripts

**Files:**

- Modify: `uninstall`
- Modify: `test/uninstall.test.ts`

- [ ] **Step 1: Add the round-trip test for shared/scripts**

Append to `test/uninstall.test.ts`:

```ts
test("install + uninstall round-trip removes the shared/scripts symlink", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		runInstall(fakeHome);
		const sharedScripts = join(fakeHome, ".claude/shared/scripts");
		expect(lstatSync(sharedScripts).isSymbolicLink()).toBe(true);

		runUninstall(fakeHome);
		expect(() => lstatSync(sharedScripts)).toThrow();
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/uninstall.test.ts`

Expected: FAIL on the new test — `~/.claude/shared/scripts` still exists after uninstall.

- [ ] **Step 3: Add shared/scripts removal to the script**

Insert this block in `uninstall` immediately after the skill loop and before the final `echo ""` / `Done.` summary:

```bash
# Remove ~/.claude/shared/scripts if it points into this repo.
shared_scripts="$HOME/.claude/shared/scripts"
if [ -L "$shared_scripts" ]; then
  real="$(resolve_real "$shared_scripts")"
  if [ -n "$real" ] && inside_repo "$real"; then
    rm "$shared_scripts"
    echo "Removed:  $shared_scripts"
    removed=$((removed + 1))
  else
    echo "SKIP:     $shared_scripts — symlink points outside this repo"
    skipped=$((skipped + 1))
  fi
elif [ -d "$shared_scripts" ]; then
  echo "SKIP:     $shared_scripts — real directory, not removing"
  skipped=$((skipped + 1))
elif [ -e "$shared_scripts" ]; then
  echo "SKIP:     $shared_scripts — not a symlink, not removing"
  skipped=$((skipped + 1))
fi
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (5/5).

- [ ] **Step 5: Add the foreign and real-dir tests for shared/scripts**

Append:

```ts
test("uninstall leaves a foreign shared/scripts symlink alone", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	const foreignTarget = mkdtempSync(join(tmpdir(), "lyra-foreign-"));
	try {
		mkdirSync(join(fakeHome, ".claude/shared"), { recursive: true });
		const link = join(fakeHome, ".claude/shared/scripts");
		symlinkSync(foreignTarget, link);

		const output = runUninstall(fakeHome);
		expect(output).toContain("SKIP:");
		expect(output).toContain("symlink points outside this repo");
		expect(lstatSync(link).isSymbolicLink()).toBe(true);
	} finally {
		rmSync(fakeHome, { recursive: true });
		rmSync(foreignTarget, { recursive: true });
	}
});

test("uninstall leaves a real shared/scripts directory alone", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		const realDir = join(fakeHome, ".claude/shared/scripts");
		mkdirSync(realDir, { recursive: true });

		const output = runUninstall(fakeHome);
		expect(output).toContain("SKIP:");
		expect(output).toContain("real directory");
		expect(lstatSync(realDir).isDirectory()).toBe(true);
		expect(lstatSync(realDir).isSymbolicLink()).toBe(false);
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (7/7).

- [ ] **Step 7: Commit**

```bash
git add uninstall test/uninstall.test.ts
git commit -m "feat(uninstall): clean up ~/.claude/shared/scripts symlink"
```

---

## Task 5: Idempotency and path-expansion regression

**Files:**

- Modify: `test/uninstall.test.ts`

- [ ] **Step 1: Add the idempotency test**

Append:

```ts
test("uninstall is idempotent — second run is a clean no-op", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		runInstall(fakeHome);
		runUninstall(fakeHome);
		const second = runUninstall(fakeHome);
		expect(second).toMatch(/Done\. 0 link\(s\) removed, 0 skipped/);
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 2: Add the SKIP path-expansion regression test**

This mirrors `install`'s ISSUE-001 — every SKIP message must show the expanded path, never a literal `~/`.

```ts
test("uninstall SKIP messages never use a literal tilde", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		mkdirSync(join(fakeHome, ".claude/skills/lyra-breadboard"), { recursive: true });
		mkdirSync(join(fakeHome, ".claude/shared/scripts"), { recursive: true });

		const output = runUninstall(fakeHome);
		expect(output).not.toContain("~/.claude/skills");
		expect(output).not.toContain("~/.claude/shared");
		expect(output).toContain(fakeHome);
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 3: Run tests to verify both pass**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (9/9). Both behaviours are already implemented; these are regression locks.

- [ ] **Step 4: Commit**

```bash
git add test/uninstall.test.ts
git commit -m "test(uninstall): lock idempotency and path-expansion behaviour"
```

---

## Task 6: Argument validation

**Files:**

- Modify: `test/uninstall.test.ts`

- [ ] **Step 1: Add the unknown-argument test**

```ts
test("uninstall rejects unknown arguments with exit code 2", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-uninstall-"));
	try {
		let exitCode = 0;
		let output = "";
		try {
			output = execSync(`HOME="${fakeHome}" bash "${UNINSTALL_SCRIPT}" --purge 2>&1`, {
				cwd: REPO_ROOT,
				encoding: "utf8",
			});
		} catch (err: unknown) {
			const e = err as { status: number; stdout: Buffer; stderr: Buffer };
			exitCode = e.status;
			output = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
		}
		expect(exitCode).toBe(2);
		expect(output).toContain("uninstall takes no arguments");
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});
```

- [ ] **Step 2: Run tests to verify it passes**

Run: `bun test test/uninstall.test.ts`

Expected: PASS (10/10). The argument check from Task 1 already enforces this.

- [ ] **Step 3: Commit**

```bash
git add test/uninstall.test.ts
git commit -m "test(uninstall): lock argument-rejection behaviour"
```

---

## Task 7: README documentation

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Read the existing Install section**

Run: `grep -n "## Install" README.md`

Locate the closing fence of the install code block. The Uninstall section goes immediately after it, before the Skills table.

- [ ] **Step 2: Insert the Uninstall section**

Add this block between the install fence and the `## Skills` heading:

````markdown
## Uninstall

From a clone:

```bash
~/dev/lyra/uninstall
```

Removes the symlinks `install` created in `~/.claude/skills/` and `~/.claude/shared/`. Does not delete the clone directory or
any real (non-symlink) files. Safe to run repeatedly.
````

- [ ] **Step 3: Run the formatter**

Run: `bun run format`

Expected: README.md may be reflowed; no error.

- [ ] **Step 4: Run the full pre-commit pipeline**

Run: `scripts/bash/pre-commit.sh`

Expected: format check, typecheck, lint, build, skill-lint, and `bun test` all pass. Final `bun test` should now show 10
uninstall tests in addition to the existing install suite.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document the uninstall script"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Manual end-to-end smoke test against a temp HOME**

Run:

```bash
TMP_HOME=$(mktemp -d)
HOME="$TMP_HOME" ./install
ls -la "$TMP_HOME/.claude/skills/" "$TMP_HOME/.claude/shared/"
HOME="$TMP_HOME" ./uninstall
ls -la "$TMP_HOME/.claude/skills/" "$TMP_HOME/.claude/shared/"
rm -rf "$TMP_HOME"
```

Expected: after install the skills directory is full of `lyra-*` symlinks and `shared/scripts` exists. After uninstall both
directories are empty. No errors at any step.

- [ ] **Step 2: Run `bun test` one final time**

Run: `bun test`

Expected: full suite green (15 existing tests + 10 new uninstall tests = 25 pass).

- [ ] **Step 3: No commit**

Verification only. If anything failed, return to the relevant earlier task and fix.

---

## Self-Review Notes

- **Spec coverage:** Every numbered item in the spec's "Tests" section maps to a task (1→Task 2, 2→Task 3, 3→Task 3, 4→Task
  5, 5→Task 4, 6→Task 4, 7→Task 1, 8→Task 5). Removal rules in spec §Design map to Task 2 (skills) and Task 4
  (shared/scripts). Output format mapped to Task 1 + Task 2. Exit codes mapped to Task 1 + Task 6. README documentation
  mapped to Task 7.
- **Placeholder scan:** No TBD/TODO. Every code step shows complete code.
- **Type consistency:** `resolve_real`, `inside_repo`, `removed`, `skipped`, `target`, `real`, `shared_scripts` — names used
  consistently across Tasks 1, 2, and 4.
