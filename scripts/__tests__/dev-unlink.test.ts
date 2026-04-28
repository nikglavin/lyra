import { test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const SCRIPT = resolve(import.meta.dir, "../dev-unlink.ts");
const DEV_REPO = resolve(import.meta.dir, "../..");
const ORIGINAL_PATH = "/Users/test/.claude/plugins/cache/lyra/lyra/abc123def";

function makeLinkedFixture() {
	return {
		version: 2,
		plugins: {
			"lyra@lyra": [
				{
					scope: "user",
					installPath: DEV_REPO,
					version: "abc123",
					_devOriginalInstallPath: ORIGINAL_PATH,
				},
			],
		},
	};
}

function makeUnlinkedFixture() {
	return {
		version: 2,
		plugins: {
			"lyra@lyra": [{ scope: "user", installPath: ORIGINAL_PATH, version: "abc123" }],
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

test("restores installPath from _devOriginalInstallPath", () => {
	writeFileSync(tmpPath, JSON.stringify(makeLinkedFixture()));
	const result = run(tmpPath);
	expect(result.exitCode).toBe(0);
	const data = JSON.parse(readFileSync(tmpPath, "utf8"));
	expect(data.plugins["lyra@lyra"][0].installPath).toBe(ORIGINAL_PATH);
});

test("removes _devOriginalInstallPath field after unlinking", () => {
	writeFileSync(tmpPath, JSON.stringify(makeLinkedFixture()));
	const result = run(tmpPath);
	expect(result.exitCode).toBe(0);
	const data = JSON.parse(readFileSync(tmpPath, "utf8"));
	expect(data.plugins["lyra@lyra"][0]._devOriginalInstallPath).toBeUndefined();
});

test("no-op if not linked", () => {
	writeFileSync(tmpPath, JSON.stringify(makeUnlinkedFixture()));
	const result = run(tmpPath);
	expect(result.exitCode).toBe(0);
	const data = JSON.parse(readFileSync(tmpPath, "utf8"));
	expect(data.plugins["lyra@lyra"][0].installPath).toBe(ORIGINAL_PATH);
	expect(data.plugins["lyra@lyra"][0]._devOriginalInstallPath).toBeUndefined();
});

test("exits non-zero if lyra@lyra not found", () => {
	writeFileSync(tmpPath, JSON.stringify({ version: 2, plugins: {} }));
	const result = run(tmpPath);
	expect(result.exitCode).not.toBe(0);
	expect(result.stderr.toString()).toMatch(/lyra@lyra/);
});
