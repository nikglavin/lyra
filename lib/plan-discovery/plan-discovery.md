Before doing anything else, scan the project for plan and spec documents. These are created by planning tools (e.g.
superpowers, /plan, /spec) and contain feature scope, acceptance criteria, and user flows — exactly what you need to focus
your QA or design review.

**Auto-detect plan and spec files:**

```bash
find . \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.next/*' \
  -not -path '*/dist/*' \
  \( \
    -iname "plan.md" -o \
    -iname "spec.md" -o \
    -iname "PLAN.md" -o \
    -iname "SPEC.md" -o \
    -iname "*.plan.md" -o \
    -iname "*.spec.md" -o \
    -iname "*-plan.md" -o \
    -iname "*-spec.md" -o \
    -iname "*_plan.md" -o \
    -iname "*_spec.md" -o \
    -iname "feature-*.md" -o \
    -iname "prd.md" -o \
    -iname "PRD.md" -o \
    -iname "*-prd.md" -o \
    -iname "requirements.md" \
  \) \
  2>/dev/null | sort
```

Also check common dedicated directories. Wrap in a subshell with `nullglob` / `nonomatch` so missing directories don't emit
shell-expansion errors:

```bash
(
  setopt NULL_GLOB 2>/dev/null || shopt -s nullglob 2>/dev/null || true
  ls -1 docs/superpowers/plans/*.md docs/*.md plans/*.md specs/*.md .plans/*.md .specs/*.md 2>/dev/null
) | sort -u
```

**Build the options list from what you find.** Then use `AskUserQuestion`:

> **Re-ground:** We're about to start a session on this project. Before testing anything, I want to understand what feature
> or change we're validating — so I can focus on the right flows and acceptance criteria.
>
> **Simplify:** I found [N] plan/spec document(s) in this project. These files describe what the feature is supposed to do,
> which is the most important input to a session. Without them, I'll test everything generically. With them, I'll test
> exactly what was built and what it needs to do.
>
> **RECOMMENDATION:** Choose the plan/spec that matches the feature you just built (Completeness: 9/10). If you're doing a
> general health check with no specific feature, choose "No plan — general session" (Completeness: 6/10).

Options (dynamically built from discovered files, plus always include):

- **A) [filename] — [first line or title of the file as preview]**
- **B) [filename] — [first line or title of the file as preview]**
- … one option per discovered file
- **[Last − 1]) Enter a path manually — I'll tell you where the file is**
- **[Last]) No plan — run general session without feature context**

**After the user selects a plan file:**

1. Read the full file contents.
2. Extract and summarize:
   - **Feature name / goal** — what is being built?
   - **Key user flows** — what workflows must work end-to-end?
   - **Acceptance criteria** — what does "done" look like?
   - **Known edge cases or risks** — anything the plan flagged as tricky?
3. Print a "Context Loaded" summary:
   ```
   Context: [feature name]
   Flows to validate: [list]
   Acceptance criteria: [count] items
   Known risks: [list or "none flagged"]
   ```
4. Use this context throughout the session:
   - Prioritize testing the documented user flows over generic exploration.
   - Map each acceptance criterion directly to a test case or audit check.
   - Note each acceptance criterion as **pass** or **fail** in the final report.
   - Add a dedicated **"Acceptance Criteria Coverage"** section to the final report listing every criterion with its pass /
     fail status, so downstream readers (PR reviewers, next-session planners) can scan it without re-reading the plan.

**If the user selects "No plan":** print
`Running general session — no feature plan loaded. Testing will cover the full application.` and continue.

**If the user selects "Enter a path manually":** ask the user to type the path, then read and process that file.
