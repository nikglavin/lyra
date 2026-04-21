#!/bin/sh
# Pre-commit hook: format check only.

set -e

echo "Running pre-commit checks..."

bun run format:check
