import { test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const SCRIPT = resolve(import.meta.dir, "../dev-link.ts");
const DEV_REPO = resolve(import.meta.dir, "../..");
const ORIGINAL_PATH = "/Users/test/.claude/plugins/cache/lyra/lyra/abc123def";

function makeFixture(installPath = ORIGINAL_PATH) {
	return {
		version: 2,
		plugins: {
			"lyra@lyra": [{ scope: "user", installPath, version: "abc123" }],
		},
	};
}

function run(path: string) {
	return Bun.spawnSync(["bun", SCRIPT, path], { stdout: "pipe", stderr: "pipe" });
}

let tmpPath: string;

beforeEach(() => {
	tmpPath = `${tmpdir()}/test-plugins-${Date.now()}.json`;
});
afterEach(() => {
	try {
		unlinkSync(tmpPath);
	} catch {}
});

test("sets installPath to dev repo root", () => {
	writeFileSync(tmpPath, JSON.stringify(makeFixture()));
	const result = run(tmpPath);
	expect(result.exitCode).toBe(0);
	const data = JSON.parse(readFileSync(tmpPath, "utf8"));
	expect(data.plugins["lyra@lyra"][0].installPath).toBe(DEV_REPO);
});

test("stores original path in _devOriginalInstallPath", () => {
	writeFileSync(tmpPath, JSON.stringify(makeFixture()));
	const result = run(tmpPath);
	expect(result.exitCode).toBe(0);
	const data = JSON.parse(readFileSync(tmpPath, "utf8"));
	expect(data.plugins["lyra@lyra"][0]._devOriginalInstallPath).toBe(ORIGINAL_PATH);
});

test("no-op if already linked", () => {
	writeFileSync(tmpPath, JSON.stringify(makeFixture(DEV_REPO)));
	run(tmpPath);
	const data = JSON.parse(readFileSync(tmpPath, "utf8"));
	expect(data.plugins["lyra@lyra"][0].installPath).toBe(DEV_REPO);
	expect(data.plugins["lyra@lyra"][0]._devOriginalInstallPath).toBeUndefined();
});

test("exits non-zero if lyra@lyra not found", () => {
	writeFileSync(tmpPath, JSON.stringify({ version: 2, plugins: {} }));
	const result = run(tmpPath);
	expect(result.exitCode).not.toBe(0);
	expect(result.stderr.toString()).toMatch(/lyra@lyra/);
});
