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
