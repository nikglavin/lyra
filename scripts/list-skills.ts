#!/usr/bin/env bun
import { relative, resolve } from "node:path";

const REPO = resolve(import.meta.dir, "..");

const glob = new Bun.Glob("skills/**/SKILL.md");
const paths: string[] = [];
for (const match of glob.scanSync({ cwd: REPO, absolute: true })) {
	if (match.includes("/node_modules/")) continue;
	paths.push(relative(REPO, match));
}
paths.sort();

for (const path of paths) {
	console.log(path);
}
