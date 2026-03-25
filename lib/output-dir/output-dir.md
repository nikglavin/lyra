## Output Directory

Skill artifacts are written to `.lyra/<skill-name>/` inside the project root, not the project root itself. This keeps
generated files out of the way and clearly attributed to the skill that produced them.

```bash
OUTPUT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.lyra/SKILL_NAME"
mkdir -p "$OUTPUT_DIR"
```

Replace `SKILL_NAME` with the skill's `name` value from its frontmatter.

When writing files, use `$OUTPUT_DIR/<filename>` as the path. After writing, tell the user the full path so they can find the
output.
