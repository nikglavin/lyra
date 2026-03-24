## Preflight

```bash
_UPD=$(~/.claude/shared/scripts/preflight 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
```

If output contains `SKILLS_UPDATE_AVAILABLE`: use AskUserQuestion to ask if they want to update now. If yes, run the git pull command shown in the output, then run `node ~/.claude/skills/lyra-build/scripts/build.mjs` to recompile, then re-symlink any new skills into `~/.claude/skills/`.
