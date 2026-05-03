#!/usr/bin/env bun
import { lstatSync, mkdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const REPO = resolve(import.meta.dir, "..");
const DEST = join(homedir(), ".claude", "skills");

function isSymlink(path: string): boolean {
	try {
		return lstatSync(path).isSymbolicLink();
	} catch {
		return false;
	}
}

function exists(path: string): boolean {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
}

if (isSymlink(DEST)) {
	const resolved = realpathSync(DEST);
	if (resolved === REPO || resolved.startsWith(REPO + "/")) {
		console.error(`error: ${DEST} is a symlink into this repo (${resolved}).`);
		console.error(`Remove it (rm "${DEST}") and re-run; the script will recreate it as a real dir.`);
		process.exit(1);
	}
}

mkdirSync(DEST, { recursive: true });

const glob = new Bun.Glob("skills/**/SKILL.md");
const skillMds: string[] = [];
for (const match of glob.scanSync({ cwd: REPO, absolute: true })) {
	if (match.includes("/node_modules/")) continue;
	skillMds.push(match);
}
skillMds.sort();

for (const skillMd of skillMds) {
	const src = dirname(skillMd);
	const name = basename(src);
	const target = join(DEST, name);

	if (exists(target) && !isSymlink(target)) {
		rmSync(target, { recursive: true, force: true });
	} else if (isSymlink(target)) {
		unlinkSync(target);
	}

	symlinkSync(src, target);
	console.log(`linked ${name} -> ${src}`);
}
