import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, mkdirSync, rmSync, lstatSync, readlinkSync } from "fs";
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
		expect(lstatSync(join(fakeHome, ".claude/skills/lyra-breadboard")).isSymbolicLink()).toBe(false);
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
		expect(lstatSync(join(fakeHome, ".claude/shared/scripts")).isSymbolicLink()).toBe(false);
	} finally {
		rmSync(fakeHome, { recursive: true });
	}
});

// Curl/pipe mode: install takes the clone branch when BASH_SOURCE is not a real file.
// We simulate this by running `bash -s < install` (stdin mode) with LYRA_DIR pointing
// at a pre-created local clone so no network access is needed.
test("install (curl/pipe mode): uses LYRA_DIR as repo root and links skills", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "lyra-test-"));
	const fakeInstallDir = mkdtempSync(join(tmpdir(), "lyra-install-"));
	// Remove the dir so git clone can create it fresh
	rmSync(fakeInstallDir, { recursive: true });
	try {
		// Create a local clone to act as the "downloaded" LYRA_DIR
		execSync(`git clone --local --quiet "${REPO_ROOT}" "${fakeInstallDir}"`, { encoding: "utf8" });

		// Run install via stdin (simulates: curl ... | bash)
		// bash -s sets BASH_SOURCE[0] to "" so the curl branch is taken
		const output = execSync(`HOME="${fakeHome}" LYRA_DIR="${fakeInstallDir}" bash -s < "${INSTALL_SCRIPT}" 2>&1`, {
			cwd: REPO_ROOT,
			encoding: "utf8",
		});

		expect(output).toContain("Existing install found");
		expect(output).toContain("Linked: lyra-breadboard");
		expect(output).toContain("Done. 2 skill(s) linked.");

		const breadboard = join(fakeHome, ".claude/skills/lyra-breadboard");
		expect(lstatSync(breadboard).isSymbolicLink()).toBe(true);

		// Symlink must point into LYRA_DIR, not the dev repo root
		const target = readlinkSync(breadboard);
		expect(target).toContain(fakeInstallDir);
	} finally {
		rmSync(fakeHome, { recursive: true });
		rmSync(fakeInstallDir, { recursive: true, force: true });
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
