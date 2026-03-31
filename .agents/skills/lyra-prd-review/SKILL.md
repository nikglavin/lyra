---
name: lyra-prd-review
description: >
  Reviews a Product Requirements Document (PRD) — typically a Jira epic — producing a structured report covering scope
  quality and technical readiness. Use when the user invokes /lyra-prd-review with a ticket ID, says "review this PRD", "help
  me review this requirements document", "is this spec ready to build?", "review this epic", "check this ticket before we
  start", or any request to validate requirements before implementation begins. Also trigger for "what's wrong with this
  PRD?", "give me feedback on this spec", or "is this ticket ready for dev?". Always trigger this skill — even for casual
  phrasing like "take a look at our requirements doc" or "can you check this Jira epic?"
metadata:
  version: 1.2.0
---

## Preflight

```bash
_UPD=$(~/.claude/shared/scripts/preflight 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
```

If output contains `SKILLS_UPDATE_AVAILABLE`: use AskUserQuestion to ask if they want to update now. If yes, run the
`lyra-update` skill.


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


## Step 1: Gather the PRD

### Ticket ID provided

Fetch the Jira epic using the Atlassian Connector. Retrieve the full ticket including:

- Title, description
- Attachments (sequence diagrams, architecture docs)
- Labels, components, linked tickets
- ISMS considerations section (if present)

If the Atlassian Connector is unavailable, tell the user and ask them to paste the PRD content directly.

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

### No Ticket ID provided

Ask: "Which Jira ticket should I review? Paste the ticket ID or the PRD content directly."

---

## Step 2: Check Monorepo Access

```bash
ls ~/mnt/vm/dab 2>/dev/null && echo "DAB_ACCESSIBLE" || ls /dab 2>/dev/null && echo "DAB_ACCESSIBLE" || echo "DAB_NOT_ACCESSIBLE"
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

Work through each dimension below. Skip dimensions that are genuinely not applicable (e.g., RBAC for a purely read-only
public feature), but be explicit about why you skipped them — don't omit them silently.

| Dimension                    | What to look for                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strategic Intent**         | Is the user pain point clear? Are success KPIs measurable and specific? Does the scope actually address the stated goal?                                                                                                                                                                                                                                                                |
| **Scope framing**            | Are requirements written as user-facing behaviours grouped by domain, or as engineering tasks grouped by technical layer (frontend / backend / apps)? This is about _structure_ — how requirements are organised, not how they are ranked. Implementation-organised scope causes teams to build the wrong thing at the right technical level. Flag layer-first organisation explicitly. |
| **Prioritisation**           | Are requirements ranked using a structured scheme such as MoSCoW (Must / Should / Could / Won't)? This is about _ranking_ — distinct from how requirements are structured or grouped. Without explicit priority signals, teams default to building everything and negotiating scope under pressure. Flag if prioritisation is absent or inconsistent.                                   |
| **Edge Cases**               | What happens when a dependency fails? What does the user see on the unhappy path?                                                                                                                                                                                                                                                                                                       |
| **Extensibility**            | Is this scoped as a platform-wide change that works in a multi-site or multi-tenant environment, or is it focused on a single instance? Multi-site design is preferred. If scoped as single-instance, note it explicitly, suggest how the design could generalise to multi-site, and flag the gap under the Gaps dimension.                                                             |
| **Non-functional**           | Has performance, reliability, and scale been considered where relevant?                                                                                                                                                                                                                                                                                                                 |
| **Gaps**                     | Based on stated intent, what behaviours are implied but not specified? Include any multi-site extensibility gap identified above.                                                                                                                                                                                                                                                       |
| **Feature Availability**     | Does this work reliably across all supported devices and platforms? Are feature flags or config considered for rollout?                                                                                                                                                                                                                                                                 |
| **Flexibility**              | Is configuration needed to support multi-site or multi-tenant deployments?                                                                                                                                                                                                                                                                                                              |
| **RBAC**                     | Has role-based access been considered for any admin, operator, or privileged surfaces?                                                                                                                                                                                                                                                                                                  |
| **Operations**               | Does the PRD consider all roles required to operate this feature end-to-end? Common roles: Customer, Operator, Marketer, Analyst, SRE. A feature that works for the Customer but has no operator tooling, no analytics instrumentation, and no runbook is not production-ready.                                                                                                         |
| **Information Architecture** | What information does the user need? Is it surfaced at the right time and place?                                                                                                                                                                                                                                                                                                        |

> **Feed-forward:** Carry the Scope findings into Step 4. Any gap in scope framing, extensibility, or operations coverage has
> direct ISMS and security implications — flag the connection explicitly.

---

## Step 4: ISMS Review

Review the ISMS (or security considerations) section of the PRD before the technical audit. The Scope findings from Step 3
inform this review — gaps in extensibility, missing roles, or under-specified edge cases may have compliance consequences
that the ISMS section should address.

Two-pass review:

**Pass 1 — Stated:** For each item in the ISMS section, evaluate whether the proposed design actually satisfies it. Flag gaps
between what is claimed and what the design delivers.

**Pass 2 — Missing:** Identify security concerns that should be in the ISMS section but aren't. Common omissions:

- Key and secret management — where are signing keys or API secrets stored, rotated, and who has access? These must be
  explicit config entries, not implied by a missing or empty env var.
- Token lifecycle — expiry, revocation, replay protection.
- PII data flows to third parties — what data is shared, is there a data processing agreement, what happens on GDPR Article
  17 Right to Erasure?
- Audit logging for privileged actions.
- Feature availability gating — availability must be controlled by an explicit feature flag or config value, not by the
  absence of a required secret or provider config being null/empty.
- Dependency supply chain.

A thin ISMS section is itself a finding.

> **Feed-forward:** Carry all Scope and ISMS findings into Step 5. The technical audit should explicitly check whether the
> implementation as described would satisfy the ISMS requirements identified here, and whether the config and Technical
> Details sections close the gaps found.

---

## Step 5: Technical Audit — Principal Engineer Lens

You've built production systems and lived through what happens when the spec glosses over the hard parts. Your job here is to
find what will cause pain at 3am six months after ship. The Scope and ISMS findings from Steps 3–4 are inputs — the technical
audit should resolve, confirm, or escalate each one.

### 5a. Architecture audit

Produce an explicit checklist of every service, API, queue, and data store mentioned or implied by the PRD. Use this format:

```
Services to audit:
- [ ] <service-name> — reason it is in scope (e.g. "named in PRD", "implied by Kafka topic X", "owns membership state")
- [ ] ...
```

Every item on this list must be checked in Step 5b — do not silently skip a service because it seems secondary. If you cannot
access a service, note it explicitly in the report. Do not narrow scope to the "primary" backend service.

For each component, ask: does existing code already solve this sub-problem? Prefer capturing outputs from existing flows over
building parallel ones.

If the PRD includes attachments with sequence or architecture diagrams, fetch and review them (see Step 1 URL extraction).
Flag correctness issues.

### 5b. Codebase audit (only if monorepo is accessible)

**If mounted via `~/mnt/vm/dab` (SSHFS):** Run all search and grep operations via SSH — never grep locally over the SSHFS
mount as it is very slow. Use `ssh vm` (SSH alias already configured):

```bash
# Search for a term across a service
ssh vm 'grep -r \
    --exclude-dir={.git,.svn,node_modules,venv,dist,build,log,logs,.cache} \
    "SEARCH_TERM" \
    ~/dab/<service>/ 2>/dev/null'

# List files or directories
ssh vm 'ls ~/dab/<service>/<path>'

# Read a specific file
ssh vm 'cat ~/dab/<service>/<path/to/file>'

# Check git log
ssh vm 'git -C ~/dab/<service> log --oneline -5'
```

Adapt the search string and path for each lookup. Use multiple targeted SSH calls rather than broad recursive greps where
possible.

**If mounted via `/dab` (direct mount):** Local grep is fine — no SSH needed.

**Iterate through every service on the Step 5a checklist.** For each service:

```bash
ssh vm 'git -C ~/dab/<service> log --oneline -1'
```

If you discover the working tree is dirty, **stop and ask the user** how to proceed — never discard work silently.

Ground every finding in what you actually observed. Do not guess at file or function names.

### 5c. Technical Details and configuration review

Locate the Technical Details section (or equivalent) of the PRD. This section describes the intended implementation — review
it for internal consistency with the Scope and ISMS findings, and audit the configuration it introduces.

**Consistency check:** Do the technical details contradict anything found in the Scope Review or ISMS Review? Common
conflicts: a scope gap that has no corresponding technical resolution, an ISMS requirement with no config entry to satisfy
it, or an implementation approach that doesn't match the user-facing behaviour described.

**Configuration audit:**

- List every new config key or environment variable the PRD introduces.
- For each, find the existing config for this domain in the codebase. Does the new config extend the existing pattern
  cleanly, or does it introduce a parallel or conflicting approach?
- Verify that all required values are present and explicit — especially secrets, API keys, and signing keys called out in the
  ISMS review. A required secret should be a named config entry; feature availability must never be gated on a provider
  config being null or empty.
- Flag any config that is implied but not named in the PRD.

### 5d. Review checklist

For each finding, classify it:

- **BLOCKER** — must be resolved before implementation starts
- **RISK** — should be addressed; implementation can proceed with caution and a clear mitigation plan
- **OBSERVATION** — worth noting; low urgency

In the report, group findings by severity and then by area using proper heading hierarchy — **not** bracket prefixes. Use
this structure:

```
### Blockers
#### <Area Name>
**<Sub-topic (if applicable)>**
- Problem statement, grounded in codebase or PRD evidence.
**Recommendation:** Specific action.

### Risks
#### <Area Name>
...

### Observations
#### <Area Name>
...
```

| Area                                   | What to look for                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architectural fit**                  | Does this follow established patterns, or introduce a "special snowflake" that future engineers won't understand?                                                                                                                                                                                                                                                                                                                |
| **Essential vs accidental complexity** | Is this solving a real problem, or one we created? Before adding anything: would removing it break the user outcome?                                                                                                                                                                                                                                                                                                             |
| **Reversibility**                      | Are feature flags, A/B tests, or incremental rollout specified? Make the cost of being wrong low.                                                                                                                                                                                                                                                                                                                                |
| **Scalability**                        | How does this behave at 10x load? When data grows from MB to TB?                                                                                                                                                                                                                                                                                                                                                                 |
| **Observability**                      | Are logging, alerting, and tracing requirements specified? Can the on-call engineer diagnose a failure at 3am without an archaeology session?                                                                                                                                                                                                                                                                                    |
| **Security & Compliance**              | Are data handling, encryption, and PII requirements explicitly stated and legally sound? Does the implementation close the ISMS gaps identified in Step 4? A deactivation or offboarding gap is not a scope question — it is a compliance obligation.                                                                                                                                                                            |
| **Eligibility specification**          | Any feature gated on membership tier, subscription state, role, or cohort must name the exact tier/state required. Search the relevant service for existing tier/level enumerations and branching (e.g. `MembershipTier`, `GroupPremium`). If the PRD says "active subscriber" without naming the tier, that is a BLOCKER — the codebase may already branch on tier and the new feature must specify which branch it belongs to. |
| **Failure modes**                      | For each external dependency (third-party or cross-service) identified in 5a, write a named failure scenario: "When `<dependency>` is unavailable or times out: `<what does the user see? what does the system do?>`". Any unspecified scenario is at minimum a RISK. A timeout that leaves the user mid-flow with no defined fallback is a BLOCKER. Do not collapse multiple failure modes into a single generic observation.   |
| **Abstraction**                        | Does the PRD define data access patterns (the "what") rather than specific database choices (the "how")?                                                                                                                                                                                                                                                                                                                         |
| **Risks**                              | Are stated risks valid and complete? What risks are absent?                                                                                                                                                                                                                                                                                                                                                                      |
| **Open questions**                     | What must be resolved before implementation begins?                                                                                                                                                                                                                                                                                                                                                                              |

### 5e. Stakeholder adversarial review

Identify every stakeholder role named or implied in the PRD (e.g., EM, PM, legal, iOS engineer, ops). For each, surface only
the **critical issue** they would block on — skip minor preferences. One focused concern per role is more useful than a
laundry list.

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

- Finding or gap, specific to the PRD. **Recommendation:** Specific action.

…

---

## ISMS Review

### Stated Requirements

_For each item in the PRD's ISMS section: does the design satisfy it?_

### <Requirement Name>

- Gap between what is stated and what the design delivers. **Recommendation:** Specific action.

### Missing Requirements

_Security concerns that should be in the ISMS section but aren't._

### <Missing Item>

- What is absent and why it matters. **Recommendation:** Specific action.

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

| Config Key     | Status                     | Notes                          |
| -------------- | -------------------------- | ------------------------------ |
| `EXISTING_KEY` | Existing                   | Description of current usage   |
| `NEW_KEY`      | New — specified            | How it extends existing config |
| `REQUIRED_KEY` | New — **missing from PRD** | Required because…              |

Flag any config that gates feature availability on a null or empty value — use an explicit feature flag instead.

---

Group findings by severity, then by area. Use heading hierarchy — not bracket prefixes.

### Blockers

#### <Area Name>

**<Sub-topic (if applicable)>**

- Problem, grounded in codebase or PRD evidence. **Recommendation:** Specific action.

### Risks

#### <Area Name>

…

### Observations

#### <Area Name>

…

---

## Stakeholder Concerns

### <Role>

Critical concern they would raise and why it could block or delay delivery.

…

---

## Open Questions

Ordered by priority. These should be resolved before implementation begins.

1. …
```

---

## Step 7: Surface Results

Tell the user: "Review written to `.lyra/prd-reviews/<TICKET-ID>-review.md`."

Then give a brief **3–5 bullet inline summary** of the most critical findings — the things the author must address before
this goes to implementation. Do not reproduce the full report inline; the file is the artifact.
