## Capture Learnings

Before closing the session, reflect on what you discovered that wasn't obvious from the code alone. Log genuine insights so
future sessions start smarter.

**Ask yourself:**

- Did any commands fail in unexpected ways specific to this project?
- Did you discover a non-standard port, env var, auth flow, or build step?
- Did a fix reveal a recurring architectural pattern worth knowing?
- Did something take longer because of a missing flag or project quirk?
- Is there a flaky UI element (animation timing, lazy load) that caused false positives?
- (For design-review sessions) Did you discover a repeated design smell that the codebase can't easily fix (e.g. third-party
  widget that looks generated)?

**Only log it if:** knowing this would save 5+ minutes in a future session.

**Never log:** obvious things, one-time network blips, things the user already knows.

**For each genuine discovery, run:**

```bash
_SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
mkdir -p "$HOME/.lyra/projects/$_SLUG"
echo '{"skill":"SKILL_NAME","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"TYPE","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"files":["path/to/relevant/file"]}' \
  >> "$HOME/.lyra/projects/$_SLUG/learnings.jsonl"
```

**Replace `SKILL_NAME` with the calling skill's short identifier** — use `"qa"` for `lyra-qa` and `"qa-design"` for
`lyra-qa-design`. This lets future sessions filter by source.

**Replace `N` with an unquoted digit 1–10** — `N` is a JSON number placeholder sitting outside quotes. Copying the snippet
literally produces invalid JSON (`"confidence":N`) that will break any future `jq` read. Substitute a concrete confidence
score per the scale below (e.g. `"confidence":9`).

**Replace `TYPE`, `SHORT_KEY`, and `DESCRIPTION`** with the real values for the entry. The JSON-string placeholders stay
quoted; only `N` is unquoted.

**Types:**

- `pitfall` — something that failed and will fail again if not avoided
- `operational` — project environment facts (ports, commands, env vars, config quirks)
- `pattern` — a recurring code or UI pattern worth knowing for future test design
- `preference` — something the user explicitly told you about approach
- `architecture` — a structural decision that affects how issues manifest

**Confidence (1–10):**

- 10 = directly observed and verified (e.g. checked the config, confirmed port)
- 8–9 = observed in code or behaviour, high confidence
- 5–7 = inferred from symptoms, not verified in source
- 1–4 = uncertain, logging speculatively

**Files:** include the specific file paths the learning references — enables future staleness detection if those files are
deleted or renamed.

After logging, print:

```
Learnings saved: N new entries → ~/.lyra/projects/{slug}/learnings.jsonl
```

If nothing genuine was discovered, print:

```
No new learnings to log — nothing non-obvious found this session.
```
