import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, mkdirSync, rmSync, existsSync, lstatSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const INSTALL_SCRIPT = join(REPO_ROOT, "install");

function runInstall(fakeHome: string): string {
  return execSync(`HOME="${fakeHome}" bash "${INSTALL_SCRIPT}" 2>&1`, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

test("install links lyra-breadboard and lyra-update into ~/.claude/skills/", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "lyra-test-"));
  try {
    const output = runInstall(fakeHome);
    expect(output).toContain("Linked: lyra-breadboard");
    expect(output).toContain("Linked: lyra-update");
    expect(output).toContain("Done. 2 skill(s) linked.");

    const breadboard = join(fakeHome, ".claude/skills/lyra-breadboard");
    const update = join(fakeHome, ".claude/skills/lyra-update");
    expect(lstatSync(breadboard).isSymbolicLink()).toBe(true);
    expect(lstatSync(update).isSymbolicLink()).toBe(true);
  } finally {
    rmSync(fakeHome, { recursive: true });
  }
});

test("install links shared/scripts into ~/.claude/shared/", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "lyra-test-"));
  try {
    runInstall(fakeHome);
    const sharedScripts = join(fakeHome, ".claude/shared/scripts");
    expect(lstatSync(sharedScripts).isSymbolicLink()).toBe(true);
  } finally {
    rmSync(fakeHome, { recursive: true });
  }
});

test("install skips real skill directories and does not overwrite them", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "lyra-test-"));
  try {
    // Create a real directory where lyra-breadboard would be linked
    mkdirSync(join(fakeHome, ".claude/skills/lyra-breadboard"), {
      recursive: true,
    });
    const output = runInstall(fakeHome);
    expect(output).toContain("SKIP lyra-breadboard");
    // Confirm it's still a real directory, not replaced by a symlink
    expect(
      lstatSync(
        join(fakeHome, ".claude/skills/lyra-breadboard"),
      ).isSymbolicLink(),
    ).toBe(false);
  } finally {
    rmSync(fakeHome, { recursive: true });
  }
});

test("install skips real shared/scripts directory and does not overwrite it", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "lyra-test-"));
  try {
    mkdirSync(join(fakeHome, ".claude/shared/scripts"), { recursive: true });
    const output = runInstall(fakeHome);
    expect(output).toContain("SKIP shared/scripts");
    expect(output).toContain(join(fakeHome, ".claude/shared/scripts"));
    expect(
      lstatSync(join(fakeHome, ".claude/shared/scripts")).isSymbolicLink(),
    ).toBe(false);
  } finally {
    rmSync(fakeHome, { recursive: true });
  }
});

// Regression: ISSUE-001 — shared/scripts SKIP message used literal ~ instead of expanded path
// Found by /qa on 2026-03-25
// Report: .gstack/qa-reports/qa-report-lyra-2026-03-25.md
test("install SKIP message for shared/scripts shows expanded path not literal tilde", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "lyra-test-"));
  try {
    mkdirSync(join(fakeHome, ".claude/shared/scripts"), { recursive: true });
    const output = runInstall(fakeHome);
    expect(output).not.toContain("~/.claude/shared/scripts");
    expect(output).toContain(fakeHome);
  } finally {
    rmSync(fakeHome, { recursive: true });
  }
});
