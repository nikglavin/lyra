#!/bin/sh
# Pre-commit hook: format check, typecheck, lint (ts + sh + skills), and build.
# Install via: bun run setup-hooks

set -e

echo "Running pre-commit checks..."

bun run format:check
bun run typecheck
bun run lint:ts
bun run lint:sh
bun run build
bun run lint:skills
