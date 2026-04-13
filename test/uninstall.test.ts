import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, rmSync, lstatSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const UNINSTALL_SCRIPT = join(REPO_ROOT, "uninstall");
const INSTALL_SCRIPT = join(REPO_ROOT, "install");

function runInstall(fakeHome: string): string {
	return execSync(`HOME="${fakeHome}" bash "${INSTALL_SCRIPT}" 2>&1`, {
		cwd: REPO_ROOT,
		encoding: "utf8",
	});
}

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
