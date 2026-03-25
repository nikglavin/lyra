import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const BUILD_SCRIPT = join(REPO_ROOT, "scripts/build.ts");

interface BuildResult {
	output: string;
	exitCode: number;
}

/**
 * Create a minimal git repo with build.ts copied in, ready for test runs.
 * build.ts uses `import.meta.dir` + git rev-parse to find repo root, so
 * placing a copy of it inside a git-init'd temp dir makes it operate on
 * that temp dir instead of the real repo.
 */
function setupFakeRepo(dir: string): void {
	execSync(`git init -q "${dir}"`);
	mkdirSync(join(dir, "skills"));
	mkdirSync(join(dir, ".agents", "skills"), { recursive: true });
	mkdirSync(join(dir, "scripts"));
	copyFileSync(BUILD_SCRIPT, join(dir, "scripts", "build.ts"));
}

function runBuild(repoDir: string): BuildResult {
	try {
		const output = execSync(`bun "${join(repoDir, "scripts", "build.ts")}"`, {
			cwd: repoDir,
			encoding: "utf8",
		});
		return { output, exitCode: 0 };
	} catch (e: unknown) {
		const err = e as { stdout?: string; stderr?: string; status?: number };
		return { output: (err.stdout ?? "") + (err.stderr ?? ""), exitCode: err.status ?? 1 };
	}
}

function addSkill(repoDir: string, name: string, content: string, filename = "SKILL.md"): void {
	const skillDir = join(repoDir, "skills", name);
	mkdirSync(skillDir, { recursive: true });
	writeFileSync(join(skillDir, filename), content);
}

const MINIMAL_SKILL = `---
name: test-skill
description: A test skill for unit tests.
---

## Test Skill

Hello world.
`;

test("build: plain SKILL.md is copied to .agents/skills/", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);
		addSkill(dir, "my-skill", MINIMAL_SKILL);

		const { exitCode } = runBuild(dir);
		expect(exitCode).toBe(0);

		const out = join(dir, ".agents", "skills", "my-skill", "SKILL.md");
		expect(existsSync(out)).toBe(true);
		expect(readFileSync(out, "utf8")).toBe(MINIMAL_SKILL);
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: SKILL.md.tmpl resolves {{path/to/file}} includes", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);

		// Create the partial
		mkdirSync(join(dir, "lib", "partials"), { recursive: true });
		writeFileSync(join(dir, "lib", "partials", "hello.md"), "Hello from partial!\n");

		// Create a template that includes it
		addSkill(
			dir,
			"tmpl-skill",
			`---
name: tmpl-skill
description: A template skill.
---

{{lib/partials/hello.md}}
`,
			"SKILL.md.tmpl",
		);

		const { exitCode } = runBuild(dir);
		expect(exitCode).toBe(0);

		const out = readFileSync(join(dir, ".agents", "skills", "tmpl-skill", "SKILL.md"), "utf8");
		expect(out).toContain("Hello from partial!");
		expect(out).not.toContain("{{lib/partials/hello.md}}");
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: include path that escapes repo root is rejected", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);
		addSkill(
			dir,
			"evil-skill",
			`---
name: evil-skill
description: Attempts path traversal.
---

{{../../etc/passwd}}
`,
			"SKILL.md.tmpl",
		);

		const { exitCode, output } = runBuild(dir);
		expect(exitCode).toBe(1);
		expect(output).toContain("escapes repo root");
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: missing include partial exits with code 1", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);
		addSkill(
			dir,
			"broken-skill",
			`---
name: broken-skill
description: References a missing partial.
---

{{lib/does/not/exist.md}}
`,
			"SKILL.md.tmpl",
		);

		const { exitCode, output } = runBuild(dir);
		expect(exitCode).toBe(1);
		expect(output).toContain("Missing shared partial");
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: bare {{placeholder}} without a path separator is left untouched", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);

		const contentWithPlaceholder = `---
name: my-skill
description: Skill with a prose placeholder.
---

## Usage

Replace {{placeholder}} with your actual value.
`;
		addSkill(dir, "my-skill", contentWithPlaceholder, "SKILL.md.tmpl");

		const { exitCode } = runBuild(dir);
		expect(exitCode).toBe(0);

		const out = readFileSync(join(dir, ".agents", "skills", "my-skill", "SKILL.md"), "utf8");
		expect(out).toContain("{{placeholder}}");
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: resource subdirectory is mirrored to .agents/skills/", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);
		addSkill(dir, "res-skill", MINIMAL_SKILL);

		const resDir = join(dir, "skills", "res-skill", "resources");
		mkdirSync(resDir);
		writeFileSync(join(resDir, "shell.html"), "<html>test</html>");

		runBuild(dir);

		const outFile = join(dir, ".agents", "skills", "res-skill", "resources", "shell.html");
		expect(existsSync(outFile)).toBe(true);
		expect(readFileSync(outFile, "utf8")).toBe("<html>test</html>");
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: SKILL.md.tmpl takes precedence over SKILL.md when both exist", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);
		// Plain SKILL.md with known content
		addSkill(dir, "dual-skill", "plain content\n");
		// .tmpl with different content in the same directory
		writeFileSync(join(dir, "skills", "dual-skill", "SKILL.md.tmpl"), "template content\n");

		const { exitCode } = runBuild(dir);
		expect(exitCode).toBe(0);

		const out = readFileSync(join(dir, ".agents", "skills", "dual-skill", "SKILL.md"), "utf8");
		expect(out).toBe("template content\n");
		expect(out).not.toContain("plain content");
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test("build: second run reports Unchanged when nothing changed", () => {
	const dir = mkdtempSync(join(tmpdir(), "lyra-build-"));
	try {
		setupFakeRepo(dir);
		addSkill(dir, "stable-skill", MINIMAL_SKILL);

		runBuild(dir); // first run
		const { output, exitCode } = runBuild(dir); // second run

		expect(exitCode).toBe(0);
		expect(output).toContain("Unchanged");
	} finally {
		rmSync(dir, { recursive: true });
	}
});
