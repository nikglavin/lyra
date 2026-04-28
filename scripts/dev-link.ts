import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const PLUGINS_JSON = resolve(process.env.HOME!, ".claude/plugins/installed_plugins.json");
const PLUGIN_KEY = "lyra@lyra";
const DEV_REPO = resolve(import.meta.dir, "..");

const filePath = process.argv[2] ?? PLUGINS_JSON;

const data = JSON.parse(readFileSync(filePath, "utf8"));
const entries: Array<{ installPath: string; _devOriginalInstallPath?: string }> = data.plugins?.[PLUGIN_KEY];

if (!entries?.length) {
	console.error(`Plugin ${PLUGIN_KEY} not found in ${filePath}`);
	process.exit(1);
}

const entry = entries[0];

if (entry.installPath === DEV_REPO) {
	console.log("Already linked.");
	process.exit(0);
}

entry._devOriginalInstallPath = entry.installPath;
entry.installPath = DEV_REPO;

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
console.log(`✓ Linked. Skills load live from ${DEV_REPO}. Re-run after /plugin update lyra@lyra.`);
