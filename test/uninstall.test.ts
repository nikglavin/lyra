import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, rmSync, lstatSync, mkdirSync, symlinkSync } from "fs";
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
