import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const PLUGINS_JSON = resolve(process.env.HOME!, ".claude/plugins/installed_plugins.json");
const PLUGIN_KEY = "lyra@lyra";

if (!process.env.HOME) {
	console.error("HOME environment variable not set");
	process.exit(1);
}

const filePath = process.argv[2] ?? PLUGINS_JSON;

let data: { version: number; plugins: Record<string, Array<{ installPath: string; _devOriginalInstallPath?: string }>> };
try {
	data = JSON.parse(readFileSync(filePath, "utf8"));
} catch {
	console.error(`Invalid JSON in ${filePath}`);
	process.exit(1);
}

if (typeof data.plugins !== "object" || data.plugins === null) {
	console.error(`Invalid structure in ${filePath}: plugins is not an object`);
	process.exit(1);
}

const entries = data.plugins?.[PLUGIN_KEY];

if (!entries?.length) {
	console.error(`Plugin ${PLUGIN_KEY} not found in ${filePath}`);
	process.exit(1);
}

const entry = entries[0];

if (!entry._devOriginalInstallPath) {
	console.log("Not linked.");
	process.exit(0);
}

entry.installPath = entry._devOriginalInstallPath;
delete entry._devOriginalInstallPath;

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
console.log("✓ Unlinked. Plugin loading from cache again.");
