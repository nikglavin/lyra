Before any phase that will produce commits, confirm the working tree is clean.

```bash
git status --porcelain
```

If the output is non-empty (dirty tree), STOP and use `AskUserQuestion`:

> Your working tree has uncommitted changes. This skill needs a clean tree so each fix gets its own atomic commit.

Options:

- **A) Commit my changes** — commit all current changes with a descriptive message, then proceed.
- **B) Stash my changes** — `git stash push -u -m "pre-<skill-name>"`, proceed, then `git stash pop` at the end of the
  session.
- **C) Abort** — exit and let the user clean up manually.

**RECOMMENDATION:** Choose A because uncommitted work should be preserved as a commit before the skill adds its own fix
commits.

After the user chooses, execute their choice, then continue the skill.
