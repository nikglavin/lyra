---
name: lyra-prd-review
description: Reviews a PRD/Jira epic for scope, ISMS, and technical readiness. Invoke with /lyra-prd-review.
metadata:
  version: 1.3.0
---

{{"lib/preflight/preflight.md"}}

{{"lib/output-dir/output-dir.md"}}

## Invocation Modes

This skill supports two output modes:

- **Human mode** (default) — produces a markdown report at `.lyra/prd-reviews/<TICKET-ID>-review.md`
- **Agent mode** — activated by passing `--agent-mode` in the invocation. Produces a JSON review file at
  `.lyra/prd-reviews/<TICKET-ID>-review.json` in addition to the markdown report. The JSON is intended for consumption by a
  PRD-refining agent in a revision loop.

When `--agent-mode` is present, follow the additional instructions in the **Agent Mode** section after Step 6.

---

## Flag Parsing (run before Step 1)

Before proceeding, extract the following flags from the invocation string if present:

- `--agent-mode` — activates Agent Mode output (default: false)
- `--iteration N` — current iteration number (default: 1)
- `--max-iterations N` — loop limit (default: 3)
- `--quality-threshold N` — minimum score for `verdict: ready` (default: 80)

Store these values; they are used in the Agent Mode section.

---

## Step 1: Gather the PRD

### Ticket ID provided

Accept the epic in any of these forms:

- A Jira issue key (e.g. `PROJ-123`) — fetch via Jira MCP if available
- A pasted epic description, acceptance criteria, or scope block
- A URL to a Confluence page linked from the epic

If the input is a Jira issue key and you have Jira MCP access, fetch the epic's description, child issues, and linked
Confluence pages before beginning the review.

If the input is too sparse to review meaningfully (e.g. a title with no description), say so explicitly and ask the user to
provide more detail before proceeding.

If the Jira MCP is unavailable, tell the user and ask them to paste the PRD content directly.

### URL extraction pass (mandatory)

After fetching the ticket, make a deliberate pass over the raw description and all attachment metadata. Extract **every URL**
present — including Smart Links, embedded Confluence pages, Whimsical diagrams, architecture docs, and API references. For
each URL:

1. Attempt to fetch it.
2. Record the result (fetched / inaccessible / blank) in the Sources Consulted table.
3. If the content is a diagram or architecture doc, note key facts that affect the technical audit.

Do not skip URLs because they appear to be supplementary — attachments frequently contain the authoritative sequence
diagrams, data flows, or API contracts that the PRD body summarises. A blank or inaccessible result is itself a finding: note
it in the report.

If you cannot access the file itself, note the file name and explicitly list your inability to access it.

### No Ticket ID provided

Ask: "Which Jira ticket should I review? Paste the ticket ID or the PRD content directly."

---

## Step 2: Check Monorepo Access

```bash
if ls ~/mnt/vm/dab 2>/dev/null; then
  echo "DAB_ACCESSIBLE_SSHFS"
elif ls /dab 2>/dev/null; then
  echo "DAB_ACCESSIBLE_LOCAL"
else
  echo "DAB_NOT_ACCESSIBLE"
fi
```

Check `~/mnt/vm/dab` first (VM SSHFS mount via `ssh vm`), then fall back to `/dab` (direct mount). Use whichever is
accessible — store the resolved path for use in Step 4b.

- **Accessible via `~/mnt/vm/dab`**: The monorepo is mounted over SSHFS. **Do not run `grep` locally over this mount** — it
  is extremely slow. Instead, run all search operations via SSH on the remote host (see Step 4b).
- **Accessible via `/dab`**: Direct mount, local grep is fine.
- **Not accessible**: Note this in the report and restrict technical findings to what the PRD states. Do **not** fabricate
  code structure — call out where verification wasn't possible.

---

## Step 3: Scope Review — Principal PM Lens

Your job is to stress-test the spec before a single line of code is written. You're not validating the idea — you're finding
the gaps, ambiguities, and assumptions that will cause the team to debate intent mid-sprint.

Evaluate the epic across the following dimensions. For each finding, use this format:

> **Finding:** What is absent, ambiguous, or inconsistent — grounded in the PRD text. **Recommendation:** The specific action
> the author must take to resolve it.

Not every dimension will apply to every epic — use judgment and skip dimensions that are clearly out of scope, noting why.

---

### Dimensions — Immediate Blockers

#### Strategic Intent

**What to assess:** Is the user pain point clearly articulated? Are success KPIs measurable and specific (not vanity
metrics)? Does the proposed scope actually address the stated problem, or does it solve a symptom?

**Red flags:**

- KPIs stated as "improve user experience" with no measurable baseline
- Scope that addresses a technical gap rather than a user need
- No stated problem — only a solution

---

#### Scope Framing

**What to assess:** Are requirements written as user-facing behaviours? Are they grouped by user domain or journey stage
(e.g. "Guest Checkout", "Operator Dashboard") rather than by technical layer?

**Red flags:**

- Groupings like "Frontend Tasks", "API Layer", "Database Changes" — this is implementation-organised scope. It optimises for
  build order, not user value, and routinely produces the wrong thing perfectly.
- Acceptance criteria written as technical tasks rather than observable outcomes

---

#### Prioritisation

**What to assess:** Is there an explicit ranking scheme (MoSCoW, tiered, or named priority levels)? Can an engineer determine
what to cut if capacity is constrained?

**Red flags:**

- No priority signals at all — forces teams to build everything and negotiate under pressure
- All requirements marked as "Must Have"
- Priority implied by order of appearance rather than stated explicitly

---

### Dimensions — Significant Gaps

#### Edge Cases & Unhappy Paths

**What to assess:** What is the user experience when a dependency fails, a timeout occurs, data is missing, or a third-party
service is unavailable? Are error states designed, not just acknowledged?

**Red flags:**

- "Error handling TBD"
- Only the happy path is described
- No mention of loading, empty, and error states for any UI surface

---

#### Operations

**What to assess:** Is the feature production-ready beyond go-live? This requires:

- **Operators** — admin tooling, configuration surfaces
- **Marketers** — content management, copy overrides, campaign hooks
- **Analysts** — instrumentation events, funnel visibility
- **SREs** — alerting, runbook considerations, rollback plan

**Red flags:**

- No analytics instrumentation specified
- No operator tooling for managing the feature post-launch
- No mention of feature flags or rollback strategy

---

#### RBAC

**What to assess:** Are Role-Based Access Controls defined for every admin, operator, or privileged surface introduced by
this epic? Is there a clear matrix of who can see/do what?

**Red flags:**

- Admin UI described with no access control discussion
- Assumes existing roles cover new surfaces without confirmation

---

#### Feature Availability

**What to assess:** Does the feature work consistently across all supported platforms/devices/tenants? Are feature flags or
config-driven rollouts specified for controlled release?

**Red flags:**

- Implicitly assumes web-only when mobile or app surfaces exist
- No staged rollout or flag strategy for a risky surface

---

### Dimensions — Observations

#### Extensibility

**What to assess:** Is the design multi-site or multi-tenant by default? If scoped to a single instance or market, is that
explicitly acknowledged as a constraint with a suggested path toward generalisation?

**Red flags:**

- Single-instance design with no acknowledgment of the generalisation gap
- Hardcoded assumptions about locale, currency, or site structure

---

#### Non-Functional Requirements

**What to assess:** Are there specific, testable requirements for performance (p95 latency), reliability (uptime SLO), and
scalability (expected load)?

**Red flags:**

- "Should be fast" with no measurable threshold
- No stated load assumptions for new infrastructure

---

#### Information Architecture

**What to assess:** Does the UI surface the right information at the right time? Does it reflect the user's mental model, or
does it mirror the underlying data schema?

**Red flags:**

- Field names that match database column names rather than user language
- Information density mismatched to user context (e.g. surfacing technical IDs in consumer UI)

---

> **Feed-forward:** Carry all Scope findings into Steps 4 and 5. Any gap in scope framing, extensibility, or operations
> coverage may have direct security or compliance implications — flag the connection explicitly when relevant.

---

## Step 4: ISMS Review

Review the ISMS (or security considerations) section of the PRD. Scope findings from Step 3 inform this review — gaps in
extensibility, missing roles, or under-specified edge cases may have compliance consequences the ISMS section should address.

**If there is no ISMS section:** Raise this as a Blocker before proceeding. Do not attempt to infer security intent from
other sections. The recommendation is always: _"Add an explicit ISMS / Security Considerations section before this epic
enters refinement."_

For each finding in this step, use the same format as Step 3:

> **Finding:** What is absent, incorrectly specified, or inconsistent with the design. **Recommendation:** The specific
> action required to resolve it.

---

### Pass 1 — Stated Coverage

For each item present in the ISMS section, evaluate whether the proposed design actually satisfies it. Flag gaps between what
is claimed and what the design delivers.

---

### Pass 2 — Missing Coverage

Identify security concerns absent from the ISMS section. Evaluate each of the following and raise a finding if unaddressed:

- **Key and secret management** — Where are signing keys or API secrets stored, rotated, and who has access? These must be
  explicit config entries, not implied by a missing or empty env var.
- **Token lifecycle** — Expiry, revocation, and replay protection.
- **PII data flows to third parties** — What data is shared, is there a data processing agreement, and what happens on GDPR
  Article 17 Right to Erasure?
- **Audit logging** — Are privileged or sensitive actions logged with sufficient detail for incident investigation?
- **Feature availability gating** — Availability must be controlled by an explicit feature flag or config value, not by the
  absence of a required secret or provider config being null/empty. A missing config silencing a feature is not a gate — it
  is a hidden default. Before recommending a specific flag pattern, check Step 5b for the project's existing feature flag
  conventions and align the recommendation to that pattern.
- **Dependency supply chain** — Are new third-party dependencies declared with version pinning and a stated review process?

---

### ISMS Severity Mapping

Assign findings to the report's severity tiers:

- **Blocker** — Missing ISMS section entirely; PII shared with third parties without a DPA; secrets managed via absent/null
  env vars.
- **Risk** — Token lifecycle unstated; audit logging absent for privileged surfaces; feature gating via config absence rather
  than explicit flag.
- **Observation** — Dependency supply chain undeclared; thin coverage with no stated rationale for omissions.

A thin ISMS section with no omissions acknowledged is a Risk, not an Observation. The author must either cover the items or
explicitly state why they are out of scope.

---

> **Feed-forward:** Carry all Scope and ISMS findings into Step 5. The technical audit should explicitly check whether the
> implementation as described would satisfy the ISMS requirements identified here, and whether the config and Technical
> Details sections close the gaps found.

---

## Step 5: Technical Audit — Principal Engineer Lens

You have built production systems and lived through what happens when a spec glosses over the hard parts. Your job is to find
what will cause pain at 3am six months after ship.

Findings from Steps 3–4 are direct inputs. For each Scope and ISMS carry-forward item, explicitly resolve, confirm, or
escalate it in this step. Do not treat carry-forward items as background context.

**If the PRD contains no architectural or technical detail whatsoever:** Raise a Blocker — "No technical design present" —
and do not proceed. Recommend the author add a Technical Details section before re-review.

---

### 5a. Architecture Audit

Produce an explicit inventory of every service, API, queue, data store, and external dependency mentioned or implied by the
PRD. Include components implied by ISMS carry-forward items even if unnamed in the PRD.

```
Component inventory:
- [ ] <component-name> — <why in scope>
      (e.g. "named in PRD", "implied by Kafka topic X", "required by PII erasure commitment")
```

Every item must be checked in 5b. If a component cannot be accessed, note it explicitly — do not silently skip. Do not narrow
scope to the primary backend service.

For each component: does existing code already solve this sub-problem? Prefer capturing outputs from existing flows over
building parallel ones. Flag any proposed duplication.

If the PRD includes sequence or architecture diagrams, fetch and review them. Check for: sequence ordering errors, missing
error paths, data flow accuracy, and staleness relative to current scope.

---

### 5b. Codebase Audit

Only if the monorepo is accessible. Iterate through every service on the 5a inventory.

**If mounted via `~/mnt/vm/dab` (SSHFS):** Run all operations via SSH — never grep locally over the SSHFS mount.

```bash
# Search across a service
ssh vm 'grep -r \
    --exclude-dir={.git,.svn,node_modules,venv,dist,build,log,logs,.cache} \
    "SEARCH_TERM" ~/dab/<service>/ 2>/dev/null'

# List files
ssh vm 'ls ~/dab/<service>/'

# Read a file
ssh vm 'cat ~/dab/<service>/<path/to/file>'

# Check git log
ssh vm 'git -C ~/dab/<service> log --oneline -5'
```

**If mounted via `/dab` (direct mount):** Local grep is fine.

For each service, check working tree state first:

```bash
ssh vm 'git -C ~/dab/<service> log --oneline -1'
```

If the working tree is dirty, **stop and ask the user** how to proceed. Never discard uncommitted work silently.

Ground every finding in what you actually observed. Do not guess at file or function names.

**5b output format** — for each service audited, produce:

```
#### <service-name>
- **Status:** Accessed / Not accessible (reason)
- **Findings:** [list, or "No findings"]
- **Evidence:** [file path, function name, or "not found in codebase" for each finding]
- **Carry-forward resolution:**
  - [Item from Steps 3–4]: Resolved / Confirmed / Escalated — [one sentence]
```

---

### 5c. Technical Details and Configuration Review

Locate the Technical Details section of the PRD.

**If no Technical Details section exists:** Raise a Blocker — "No implementation detail present" — note it and proceed to 5d
with that finding recorded.

**Consistency check:** Do the technical details contradict anything in the Scope or ISMS carry-forward? Common conflicts:

- A scope gap with no corresponding technical resolution
- An ISMS requirement with no config entry to satisfy it
- An implementation approach that contradicts the described user-facing behaviour

**Configuration audit:** For each new config key or environment variable introduced:

- Find the existing config pattern for this domain in the codebase
- Does the new key extend that pattern cleanly, or introduce a parallel/conflicting approach?
- Verify all required values are explicit — especially secrets, API keys, and signing keys from the ISMS review. A required
  secret must be a named config entry.
- Feature availability must never be gated on a provider config being null or empty. Absence of config is not a feature flag.
- Flag any config that is implied by the PRD but not named.

---

### 5d. Review Checklist

Classify each finding using one of three severities:

- **Blocker** — must be resolved before implementation starts
- **Risk** — should be addressed; implementation can proceed with a clear mitigation plan
- **Observation** — worth noting; low urgency

Every finding must cite evidence: a file path, PRD section, or explicit "not found in codebase / not specified in PRD."
Carry-forward items that are escalated in 5b/5c must be promoted to Blocker.

**Report structure:**

```
### Blockers
#### <Area>
**<Sub-topic>**
- Problem statement — evidence: [source]
**Recommendation:** Specific action.

### Risks
#### <Area>
...

### Observations
#### <Area>
...
```

---

### 5e. Review Areas

Evaluate each area. Raise a finding only if there is evidence of a gap — do not produce generic commentary.

#### Architectural Fit

Does this follow established patterns, or introduce a structure future engineers won't recognise? Departures from established
patterns require explicit justification in the PRD.

#### Essential vs Accidental Complexity

Is this solving a real problem, or one the design created? Before flagging anything as required: would removing it break the
user outcome?

#### Reversibility

Are feature flags, A/B tests, or incremental rollout specified? The cost of being wrong must be explicitly managed. Absence
of a rollback mechanism for a risky surface is a Risk at minimum.

#### Scalability

How does this behave at 10x load? When data grows from MB to TB? If no load assumptions are stated in the PRD, flag as a Risk
and note the assumption gap.

#### Observability

Are logging, alerting, and tracing requirements specified? Can an on-call engineer diagnose a failure at 3am without a code
archaeology session? Absence of stated observability requirements is a Risk.

#### Security and Compliance

Are data handling, encryption, and PII requirements explicitly stated? Does the implementation close every ISMS gap
identified in Step 4? A deactivation or offboarding gap is not a scope question — it is a compliance obligation and must be
treated as a Blocker.

#### Eligibility Specification

Any feature gated on membership tier, subscription state, role, or cohort must name the exact tier or state required. Search
the relevant service for existing tier and level enumerations (e.g. `MembershipTier`, `GroupPremium`). If the PRD says
"active subscriber" without naming the tier, that is a Blocker — the codebase may already branch on tier and the new feature
must specify which branch it belongs to.

#### Failure Modes

For each external dependency identified in 5a, write a named failure scenario:

> "When `<dependency>` is unavailable or times out: `<what does the user see? what does the system do?>`"

Any unspecified scenario is at minimum a Risk. A timeout that leaves the user mid-flow with no defined fallback is a Blocker.
The recommendation for each unspecified failure mode must name: (a) the user-facing state that should be shown, and (b)
whether the feature should degrade gracefully or block the flow entirely. Do not collapse multiple failure modes into a
single generic observation.

#### Abstraction

Does the PRD define data access patterns (the _what_) rather than specific database choices (the _how_)? Premature
implementation specificity limits future options without delivering user value.

#### Risks

Are stated risks valid and complete? What material risks are absent from the PRD's own risk section?

#### Open Questions

What must be resolved before implementation begins? List each as a named question with an owner or resolution path:

> "Question — [what needs to be decided]. Owner / resolution path — [who resolves this or
>
> > how it gets resolved]."

---

## Step 6: Write the Report

```bash
mkdir -p .lyra/prd-reviews
```

Write the full report to `.lyra/prd-reviews/<TICKET-ID>-review.md` using the structure below.

```markdown
# PRD Review: <Ticket Title> (<TICKET-ID>)

**Reviewed**: <YYYY-MM-DD> **Jira access**: [Available — ticket fetched via MCP | Unavailable — PRD content pasted by user]
**Monorepo access**: [Accessible — findings grounded in `/dab` | Not accessible — findings based on PRD text only]

### Sources Consulted

| Source            | Detail                                                              |
| ----------------- | ------------------------------------------------------------------- |
| Jira ticket       | <TICKET-ID> — <fetched via MCP / pasted by user>                    |
| Codebase services | <list top-level DAB services accessed, e.g. Gamify, JL — or "none"> |
| Attachments       | <list any diagrams or docs reviewed, or "none">                     |

---

## Executive Summary

<One or two sentences on overall readiness: is this spec ready to build, needs work, or has blockers that must be resolved
first?>

**Critical Blockers:**

- …

**Key Risks:**

- …

**Verdict:** <Ready to build / Needs revision / Not ready — address blockers first>

---

## Scope Review

Use a heading per dimension that has a finding. Skip dimensions with no findings.

### <Dimension Name>

**Finding:** What is absent, ambiguous, or inconsistent — grounded in the PRD text. **Recommendation:** The specific action
the author must take to resolve it.

…

---

## ISMS Review

### Stated Requirements

_For each item in the PRD's ISMS section: does the design satisfy it?_

### <Requirement Name>

**Finding:** Gap between what is stated and what the design delivers. **Recommendation:** Specific action.

### Missing Requirements

_Security concerns that should be in the ISMS section but aren't._

### <Missing Item>

**Finding:** What is absent and why it matters. **Recommendation:** Specific action.

…

---

## Technical Review

### Technical Details Consistency

_Inconsistencies between the Technical Details section of the PRD and the Scope or ISMS findings above._

| Finding | Source (Scope/ISMS) | Impact |
| ------- | ------------------- | ------ |
| …       | …                   | …      |

### Configuration

_New config introduced by this PRD, existing config in the same domain, and how they fit together._

| Config Key     | Status                 | Notes                          |
| -------------- | ---------------------- | ------------------------------ |
| `EXISTING_KEY` | Existing               | Description of current usage   |
| `NEW_KEY`      | New — specified        | How it extends existing config |
| `REQUIRED_KEY` | New — missing from PRD | Required because…              |

Flag any config that gates feature availability on a null or empty value — use an explicit feature flag instead.

---

### Blockers

#### <Area Name>

**<Sub-topic (if applicable)>**

**Finding:** Problem, grounded in codebase or PRD evidence. **Recommendation:** Specific action.

### Risks

#### <Area Name>

**Finding:** … **Recommendation:** …

### Observations

#### <Area Name>

**Finding:** … **Recommendation:** …

---

## Stakeholder Concerns

### <Role>

Critical concern they would raise and why it could block or delay delivery.

…

---

## Open Questions

Ordered by priority. These should be resolved before implementation begins.

1. **Question** — [what needs to be decided]. **Owner / resolution path** — [who resolves this or how it gets resolved].
```

---

## Agent Mode

Only execute this section when `--agent-mode` was passed in the invocation.

### JSON Output

After writing the markdown report, produce a JSON file at `.lyra/prd-reviews/<TICKET-ID>-review.json`.

This file is the contract between the reviewer and the refining agent. Every field must be populated — do not omit keys for
findings that have no entries; use empty arrays instead.

If no Jira issue key is available (e.g. content was pasted), use `"ticket_id": "pasted-content"` and populate `ticket_title`
from the first heading or opening sentence of the PRD.

#### Schema

```json
{
	"ticket_id": "string",
	"ticket_title": "string",
	"reviewed_at": "ISO-8601 date string",
	"iteration": "integer — starts at 1, increments on each re-review of the same ticket",
	"verdict": "ready | needs_revision | blocked",
	"quality_score": {
		"total": "integer 0–100",
		"breakdown": {
			"scope": "integer 0–25",
			"isms": "integer 0–25",
			"technical": "integer 0–50"
		}
	},
	"blocker_count": "integer",
	"risk_count": "integer",
	"observation_count": "integer",
	"findings": [
		{
			"id": "string — stable identifier, e.g. SCOPE-001, ISMS-001, TECH-001",
			"severity": "blocker | risk | observation",
			"area": "string — e.g. Scope / ISMS / Technical",
			"dimension": "string — e.g. Strategic Intent, Token Lifecycle, Failure Modes",
			"prd_section": "string — heading or section name where the issue originates, e.g. 'Acceptance Criteria', 'ISMS', 'Technical Details'",
			"quoted_text": "string — the exact text from the PRD that is being flagged, or empty string if the finding is about absent content",
			"finding": "string — what is absent, ambiguous, or inconsistent",
			"recommendation": "string — the specific action required to resolve this finding",
			"status": "open | resolved | escalated"
		}
	],
	"open_questions": [
		{
			"id": "string — e.g. OQ-001",
			"question": "string",
			"owner": "string — role or team, or 'unknown'",
			"resolution_path": "string"
		}
	],
	"loop_control": {
		"should_continue": "boolean — true if blocker_count > 0 or verdict != ready",
		"escalate_to_human": "boolean — true if this iteration >= max_iterations and blockers remain",
		"iteration": "integer — current iteration number",
		"max_iterations": "integer — passed in by the orchestrating agent, default 3 if not provided",
		"remaining_iterations": "integer — max_iterations minus current iteration",
		"sections_requiring_revision": [
			"string — PRD section headings the refining agent must redraft, derived from open blockers and risks"
		],
		"escalation_reason": "string — populated only when escalate_to_human is true; summarises why human review is required"
	}
}
```

#### Scoring guide

The quality score gives the refining agent a single signal to track convergence across iterations. Score each area against
these criteria — deduct points per unresolved finding as indicated.

**Scope (0–25)**

- Start at 25
- Deduct 8 per Blocker finding
- Deduct 4 per Risk finding
- Deduct 1 per Observation
- Floor at 0

**ISMS (0–25)**

- Start at 25
- Deduct 10 if no ISMS section present (Blocker)
- Deduct 6 per additional Blocker finding
- Deduct 3 per Risk finding
- Deduct 1 per Observation
- Floor at 0

**Technical (0–50)**

- Start at 50
- Deduct 12 per Blocker finding
- Deduct 6 per Risk finding
- Deduct 2 per Observation
- Floor at 0

**Total** = Scope + ISMS + Technical

A score of 80 or above with zero Blockers is the default quality threshold for `verdict: ready`. The orchestrating agent may
override this threshold by passing `--quality-threshold <n>` at invocation.

#### loop_control rules

- The verdict is `ready` only when `quality_score.total >= quality_threshold` AND `blocker_count == 0`.
- Set `should_continue: true` if `blocker_count > 0` OR `verdict != "ready"`.
- Set `escalate_to_human: true` if `should_continue` is true AND `iteration >= max_iterations`.
- Populate `sections_requiring_revision` from the `prd_section` values of all open Blocker and Risk findings — deduplicated
  and ordered by severity (Blockers first).
- Populate `escalation_reason` only when `escalate_to_human` is true. Summarise which Blockers remain unresolved and why they
  could not be resolved by the agent loop.

#### Finding IDs

Assign stable IDs on first review (`SCOPE-001`, `ISMS-001`, `TECH-001`, etc.). On subsequent iterations, **reuse the same
ID** for the same finding so the orchestrating agent can track resolution across iterations. A finding whose underlying PRD
text has been revised and now passes review must have its `status` set to `resolved` — do not remove it from the array. New
findings introduced in a later iteration get the next available ID in their series.

### Refining Agent Contract

The JSON output is designed for an agent that follows this loop:

```
1. Call lyra-prd-review --agent-mode on the current PRD draft
2. Read <TICKET-ID>-review.json
3. If loop_control.escalate_to_human == true → stop, surface findings to human
4. If loop_control.should_continue == true:
   a. For each section in loop_control.sections_requiring_revision:
      - Read the findings for that section (filter findings by prd_section)
      - Redraft that section of the PRD addressing each finding's recommendation
   b. Increment iteration count
   c. Go to step 1 with the revised PRD
5. If loop_control.should_continue == false → PRD is ready, exit loop
```

The refining agent should pass the current `iteration` and `max_iterations` values back into the skill invocation so
`loop_control` remains accurate across runs. Example invocation:

```
/lyra-prd-review PROJ-123 --agent-mode --iteration 2 --max-iterations 4 --quality-threshold 85
```

---

## Step 7: Surface Results

Tell the user: "Review written to `.lyra/prd-reviews/<TICKET-ID>-review.md`."

If `--agent-mode` was passed, also confirm: "Agent review written to `.lyra/prd-reviews/<TICKET-ID>-review.json`. Quality
score: `<total>/100`. Verdict: `<verdict>`. Blockers: `<n>`."

Then give a brief **3–5 bullet inline summary** of the most critical findings — the things the author must address before
this goes to implementation. Do not reproduce the full report inline; the file is the artifact.
