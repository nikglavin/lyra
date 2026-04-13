## Fix Discipline

The rules in this section apply to every fix loop. They are parameterized by two tokens that each calling skill must
substitute:

- **`FIX_PREFIX`** — the commit-message prefix for fixes. Use `fix(qa)` for `lyra-qa`, `style(design)` for `lyra-qa-design`.
- **`FIX_CAP`** — the hard upper bound on fixes per run. Use `30` for `lyra-qa-design`, leave unset for `lyra-qa` (no cap).

Before entering the fix loop, the calling skill MUST print which values it uses so the reader sees the substitution
concretely.

---

### The Iron Law — no fix without root cause

> [!IMPORTANT] **NO FIX WITHOUT ROOT CAUSE FIRST.** You cannot write a single line of fix code until you have completed the
> root-cause investigation below. Skipping to a fix is the most common cause of WTF-likelihood climbing. Quick patches mask
> underlying issues.

**Root-cause investigation steps (all required):**

1. **Read the error carefully.** Don't skim — error messages and stack traces usually contain the exact answer. Check any
   browser console screenshot you took when documenting the issue.
2. **Reproduce it consistently.** Can you trigger it reliably with specific steps? If not reproducible, gather more data — do
   NOT guess.
3. **Check recent changes.**

   ```bash
   git log --oneline -10
   git diff main...HEAD --name-only
   ```

   What changed that could cause this? New dependencies, config changes, env differences?

4. **Trace the data flow** (for multi-component failures). Log what enters and exits each component boundary. Identify WHERE
   it breaks before investigating WHY.
5. **Form a single hypothesis.** Write it out: `"I think [X] is the root cause because [Y]."` Be specific. "Something is
   broken" is not a hypothesis.

**Red flags — STOP and return to step 1 if you catch yourself thinking:**

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when you've already tried 2+)
- Each fix reveals a new problem in a different place → **that's an architecture problem, not a bug**

---

### The fix itself

With root cause confirmed, make the **minimal fix** — the smallest single change that resolves the identified root cause.

- ONE change at a time. Test one hypothesis at a time.
- Do NOT refactor surrounding code, add features, or "improve" unrelated things.
- Do NOT bundle multiple fixes into a single diff.

**If the fix doesn't work:**

- Attempt 1 failed → return to root-cause investigation, re-analyse with new information.
- Attempt 2 failed → return to root-cause investigation, deeper dig.
- **Attempt 3 failed → STOP.** Do not attempt Fix #4. Use `AskUserQuestion`:
  > I've tried 3 fixes for FINDING-NNN without success. Each attempt is revealing a different symptom, which suggests an
  > architectural problem rather than a simple bug. Should I: **A)** Defer this finding and continue, **B)** Do a deeper
  > architectural analysis before attempting more fixes, **C)** Abort the fix loop entirely. **RECOMMENDATION:** Choose B —
  > fixing symptoms of an architectural problem creates more bugs.

---

### Commit

```bash
git add <only-changed-files>
git commit -m "FIX_PREFIX: FINDING-NNN — short description"
```

**Rules:**

- One commit per fix. Never bundle multiple fixes.
- Message format: literal `FIX_PREFIX: FINDING-NNN — description`, with `FIX_PREFIX` substituted by the caller (e.g.
  `fix(qa):`, `style(design):`).
- Only stage files directly related to the fix. Never `git add -A` or `git add .`.

---

### The Verification Gate — evidence before claims

> [!IMPORTANT] **EVIDENCE BEFORE CLAIMS.** You cannot classify a fix as "verified" without running through this gate in full.
> "Should be fixed", "looks correct", and "probably works" are not verification.

Run every step of the gate, in order:

**Gate Step 1 — IDENTIFY.** What exact observation would prove this fix worked?

- For a UI bug: the broken element now renders correctly (screenshot).
- For a JS error: the console shows zero new errors after the triggering interaction.
- For a form failure: the form submits successfully and reaches the expected state.
- For an API bug: the network response returns the expected status and data.
- For a design finding: the screenshot visibly matches the described expected state.

**Gate Step 2 — RUN.** Execute the exact verification using the Playwright MCP tools from `lib/playwright-primitives`.
Navigate to the affected URL with a fresh load, reproduce the exact steps that exposed the finding, take a screenshot, read
console messages, read network requests if relevant.

**Gate Step 3 — READ.** Look at the output fully.

- New errors in console? → NOT verified.
- Broken behaviour still visible? → NOT verified.
- New broken behaviour introduced? → REVERTED immediately (`git revert HEAD`).

**Gate Step 4 — VERIFY.** Does the output confirm your Gate Step 1 claim?

- YES → proceed to classify as `verified`.
- NO → do NOT claim it's fixed; return to root-cause investigation.

**Gate Step 5 — SHOW.** The screenshot from Gate Step 2 came back inline with the tool result — the user already sees it. Do
not re-`Read` the saved file.

---

### Classify

Only after the Verification Gate is complete. Never from memory or assumption.

- **verified** — Gate Steps 1–4 confirm the fix works AND no new errors or regressions.
- **best-effort** — Verification Gate couldn't be fully run (e.g. requires auth you don't have, external service unavailable,
  timing-dependent). Document exactly what could not be verified.
- **reverted** — Gate Step 3 detected a regression → `git revert HEAD` immediately, mark the finding as `deferred`.

**You cannot claim a fix "works" without verified evidence.**

---

### Regression tests

Skip if: classification is not `verified`, OR the fix is purely visual/CSS with no JS behavior, OR no test framework was
detected AND the user declined bootstrap.

**1. Study existing test patterns.** Read 2–3 test files closest to the fix. Match naming, imports, assertion style,
describe/it nesting, setup/teardown. The regression test must look like it was written by the same developer.

**2. Trace the bug's codepath, then write a test.** Set up the exact precondition, perform the action, assert correct
behavior (not "it renders" or "it doesn't throw"). Include:

```
// Regression: FINDING-NNN — {what broke}
// Found by {skill-name} on {YYYY-MM-DD}
// Report: .lyra/{skill-name}/report-{date}.md
```

Use auto-incrementing file names: check existing `{name}.regression-*.test.{ext}` files, take max + 1.

**3. Run only the new test file.**

- Passes → commit: `git commit -m "test({skill-short}): regression test for FINDING-NNN — {desc}"` (substitute
  `{skill-short}` to match FIX_PREFIX's scope: `qa` or `design`).
- Fails → fix once. Still failing → delete test, defer the finding.

**Test commits do not count toward WTF-likelihood.**

---

### WTF-Likelihood — self-regulation

Every 5 fixes, OR immediately after any revert, recompute WTF-likelihood:

```
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  Touching unrelated files:   +20%
```

**Calling skills may add category-specific modifiers** in addition to the base heuristic. For example, `lyra-qa-design` adds
`+0% for CSS-only changes, +5% per JSX/TSX/component file changed` — CSS is cheap, component restructures are risky.

**If WTF > 20%:** STOP immediately. Show the user what you've done so far. Use `AskUserQuestion` with A) continue, B) stop
here and report. RECOMMENDATION: stop.

**Hard cap: `FIX_CAP` fixes.** After that many fixes, stop regardless of remaining findings. Substitute `FIX_CAP` with the
calling skill's cap. If the calling skill leaves `FIX_CAP` unset, there is no cap — but you must still obey the WTF > 20%
rule.
