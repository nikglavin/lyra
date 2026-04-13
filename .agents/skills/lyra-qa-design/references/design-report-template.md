# Design Review Report: {APP_NAME}

| Field             | Value                         |
| ----------------- | ----------------------------- |
| **Date**          | {DATE}                        |
| **URL**           | {URL}                         |
| **Branch**        | {BRANCH}                      |
| **Commit**        | {COMMIT_SHA} ({COMMIT_DATE})  |
| **Tier**          | Quick / Standard / Exhaustive |
| **Scope**         | {SCOPE or "Full site"}        |
| **Duration**      | {DURATION}                    |
| **Pages audited** | {COUNT}                       |
| **Screenshots**   | {COUNT}                       |
| **DESIGN.md**     | {"Found" or "Not found"}      |

## Design Score: {DESIGN_SCORE}/100 • AI Slop Score: {AI_SLOP_SCORE}/100

**Baseline → Final:** design {BASELINE_DESIGN}→{FINAL_DESIGN} • ai-slop {BASELINE_SLOP}→{FINAL_SLOP}

## Top 3 Things to Fix

1. **{FINDING-NNN}: {title}** — {one-line description}
2. **{FINDING-NNN}: {title}** — {one-line description}
3. **{FINDING-NNN}: {title}** — {one-line description}

## Severity summary

| Severity | Count | Fixed | Deferred |
| -------- | ----- | ----- | -------- |
| Critical | {N}   | {N}   | {N}      |
| High     | {N}   | {N}   | {N}      |
| Medium   | {N}   | {N}   | {N}      |
| Low      | {N}   | {N}   | {N}      |

## First Impression

{One paragraph capturing your 5-second read of the site. Does it feel intentional? Where does the eye land? Can you name the
product category and audience from the visual design alone?}

## Findings

### FINDING-001: {title}

- **Severity:** {Critical/High/Medium/Low}
- **Category:** {typography/color/layout/interaction/responsive/brand/system/slop:{pattern-id}}
- **Page:** {URL}
- **Fix Status:** {verified/best-effort/reverted/deferred}
- **Commit:** {SHA or "—"}
- **Files Changed:** {paths or "—"}

**What I saw:**

{Describe the finding objectively. Reference the relevant `lyra-*` principle skill if applicable. If the project has
DESIGN.md, cite the specific section that's being violated.}

**Before:**

![before](screenshots/finding-001-before.png)

**After (if fixed):**

![after](screenshots/finding-001-after.png)

**Why it matters:**

{One or two sentences on the impact. Trust, scannability, brand coherence, etc.}

---

### FINDING-002: …

(repeat the template for each finding)

---

## DESIGN.md coverage (if found)

If a DESIGN.md was found: list the sections and note which findings violated which section. If not found: note whether the
user accepted the "offer to draft DESIGN.md" prompt.

## Deferred findings

| ID          | Title   | Severity | Why deferred                      |
| ----------- | ------- | -------- | --------------------------------- |
| FINDING-NNN | {title} | {level}  | {reason, e.g. third-party widget} |

## PR Summary line

> Design review found {N} findings, fixed {M}. Design score {BASELINE}→{FINAL}. AI slop score {BASELINE}→{FINAL}.
