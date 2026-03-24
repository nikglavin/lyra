import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { format } from "@wasm-fmt/shfmt";

const REPO_ROOT = join(import.meta.dir, "..");
const BASH_DIR = join(REPO_ROOT, "scripts", "bash");
const SHELLCHECK_BIN = join(REPO_ROOT, "node_modules", "shellcheck", "bin", "shellcheck");
const WRITE = process.argv.includes("--write");

async function lintSh() {
	const entries = await readdir(BASH_DIR, { withFileTypes: true });
	const scripts = entries.filter((e) => e.isFile() && e.name.endsWith(".sh")).map((e) => e.name);

	let hasError = false;

	for (const name of scripts) {
		const filePath = join(BASH_DIR, name);
		const rel = relative(REPO_ROOT, filePath);
		const content = await readFile(filePath, "utf-8");

		// 1. shellcheck (skip in --write mode, it's a linter not a fixer)
		if (!WRITE) {
			const sc = spawnSync(SHELLCHECK_BIN, [filePath], { encoding: "utf-8" });
			if (sc.error) {
				console.error(`❌ shellcheck binary not found at ${SHELLCHECK_BIN}: ${sc.error.message}`);
				hasError = true;
			} else if (sc.status !== 0) {
				console.error(`❌ ${rel} failed shellcheck:\n${sc.stdout.trimEnd()}`);
				hasError = true;
			}
		}

		// 2. shfmt
		const formatted = format(content, name, { indent: 2 });
		if (WRITE) {
			if (formatted !== content) await writeFile(filePath, formatted);
		} else if (formatted !== content) {
			console.error(`❌ ${rel} is not formatted — run \`bun run format:sh\` to fix.`);
			hasError = true;
		}
	}

	if (!WRITE) {
		if (!hasError) console.log("✅ Shell scripts passed lint checks!");
		process.exit(hasError ? 1 : 0);
	}
}

lintSh();
