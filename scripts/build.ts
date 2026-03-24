#!/usr/bin/env bun
// Lyra skill library compiler
// Usage: bun scripts/build.ts
// Run from the repo root.

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
} from "fs";
import { join } from "path";
import { execSync } from "child_process";

const REPO_ROOT = execSync(
  `git -C ${JSON.stringify(import.meta.dir)} rev-parse --show-toplevel`,
)
  .toString()
  .trim();
const SKILLS_DIR = join(REPO_ROOT, "skills");
const DIST_DIR = join(REPO_ROOT, ".agents", "skills");

// Resolve all {{shared/filename.md}} includes in content
function resolveIncludes(content: string, tmplPath: string): string {
  return content.replace(/\{\{(shared\/[^}]+)\}\}/g, (_match, ref: string) => {
    const partialPath = join(REPO_ROOT, ref);
    if (!existsSync(partialPath)) {
      console.error(
        `ERROR: Missing shared partial '${ref}' referenced in ${tmplPath}`,
      );
      process.exit(1);
    }
    return readFileSync(partialPath, "utf8");
  });
}

// Mirror a directory recursively, copying only files that differ.
// Preserves file permissions. Returns true if anything changed.
function mirrorDir(src: string, dest: string): boolean {
  mkdirSync(dest, { recursive: true });
  let changed = false;
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      if (mirrorDir(srcPath, destPath)) changed = true;
    } else {
      const srcContent = readFileSync(srcPath);
      if (!existsSync(destPath) || !readFileSync(destPath).equals(srcContent)) {
        copyFileSync(srcPath, destPath);
        chmodSync(destPath, stat.mode);
        changed = true;
      }
    }
  }
  return changed;
}

// Get all skill directories
const skillDirs = readdirSync(SKILLS_DIR)
  .map((name) => ({ name, fullPath: join(SKILLS_DIR, name) }))
  .filter(({ fullPath }) => statSync(fullPath).isDirectory());

if (skillDirs.length === 0) {
  console.log("No skill directories found under skills/");
  process.exit(0);
}

const compiled: string[] = [];
const unchanged: string[] = [];

for (const { name: skillName, fullPath: skillDir } of skillDirs) {
  const tmplPath = join(skillDir, "SKILL.md.tmpl");
  const srcPath = join(skillDir, "SKILL.md");

  // .tmpl takes precedence over plain SKILL.md
  let content: string;
  if (existsSync(tmplPath)) {
    content = resolveIncludes(await Bun.file(tmplPath).text(), tmplPath);
  } else if (existsSync(srcPath)) {
    content = await Bun.file(srcPath).text();
  } else {
    continue; // Not a skill directory
  }

  const outDir = join(DIST_DIR, skillName);
  const outPath = join(outDir, "SKILL.md");
  mkdirSync(outDir, { recursive: true });

  let skillChanged = false;

  const existing = existsSync(outPath) ? await Bun.file(outPath).text() : null;
  if (existing !== content) {
    await Bun.write(outPath, content);
    skillChanged = true;
  }

  // Mirror supporting subdirectories
  for (const subdir of ["scripts", "references", "assets", "resources"]) {
    const srcSubdir = join(skillDir, subdir);
    if (!existsSync(srcSubdir)) continue;
    if (mirrorDir(srcSubdir, join(outDir, subdir))) skillChanged = true;
  }

  if (skillChanged) {
    compiled.push(skillName);
  } else {
    unchanged.push(skillName);
  }
}

if (compiled.length > 0)
  console.log(`Compiled (${compiled.length}): ${compiled.join(", ")}`);
if (unchanged.length > 0)
  console.log(`Unchanged (${unchanged.length}): ${unchanged.join(", ")}`);
if (compiled.length === 0 && unchanged.length === 0)
  console.log("Nothing to compile.");
