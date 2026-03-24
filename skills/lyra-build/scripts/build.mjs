#!/usr/bin/env node
// Lyra skill library compiler
// Usage: node skills/lyra-build/scripts/build.mjs
// Run from the repo root or via the lyra-build skill.

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync,
  statSync, existsSync, copyFileSync, chmodSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use git to find the repo root — works whether run from source or dist location.
const REPO_ROOT = execSync(`git -C ${JSON.stringify(__dirname)} rev-parse --show-toplevel`).toString().trim();
const SKILLS_DIR = join(REPO_ROOT, 'skills');
const DIST_DIR = join(REPO_ROOT, 'dist', 'skills');

// Resolve all {{shared/filename.md}} includes in content
function resolveIncludes(content, tmplPath) {
  return content.replace(/\{\{(shared\/[^}]+)\}\}/g, (_match, ref) => {
    const partialPath = join(REPO_ROOT, ref);
    if (!existsSync(partialPath)) {
      console.error(`ERROR: Missing shared partial '${ref}' referenced in ${tmplPath}`);
      process.exit(1);
    }
    return readFileSync(partialPath, 'utf8');
  });
}

// Mirror a directory recursively, copying only files that differ.
// Preserves file permissions. Returns true if anything changed.
function mirrorDir(src, dest) {
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
  .map(name => ({ name, fullPath: join(SKILLS_DIR, name) }))
  .filter(({ fullPath }) => statSync(fullPath).isDirectory());

if (skillDirs.length === 0) {
  console.log('No skill directories found under skills/');
  process.exit(0);
}

const compiled = [];
const unchanged = [];

for (const { name: skillName, fullPath: skillDir } of skillDirs) {
  const tmplPath = join(skillDir, 'SKILL.md.tmpl');
  const srcPath = join(skillDir, 'SKILL.md');

  // .tmpl takes precedence over plain SKILL.md
  let content;
  if (existsSync(tmplPath)) {
    content = resolveIncludes(readFileSync(tmplPath, 'utf8'), tmplPath);
  } else if (existsSync(srcPath)) {
    content = readFileSync(srcPath, 'utf8');
  } else {
    continue; // Not a skill directory
  }

  const outDir = join(DIST_DIR, skillName);
  const outPath = join(outDir, 'SKILL.md');
  mkdirSync(outDir, { recursive: true });

  let skillChanged = false;

  if (!existsSync(outPath) || readFileSync(outPath, 'utf8') !== content) {
    writeFileSync(outPath, content, 'utf8');
    skillChanged = true;
  }

  // Mirror supporting subdirectories
  for (const subdir of ['scripts', 'references', 'assets', 'resources']) {
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

if (compiled.length > 0) {
  console.log(`Compiled (${compiled.length}): ${compiled.join(', ')}`);
}
if (unchanged.length > 0) {
  console.log(`Unchanged (${unchanged.length}): ${unchanged.join(', ')}`);
}
if (compiled.length === 0 && unchanged.length === 0) {
  console.log('Nothing to compile.');
}
