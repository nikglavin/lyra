Before running the main work, load knowledge from previous sessions on this project. Past runs may have discovered
non-obvious quirks — custom ports, flaky animations, auth session timeouts, build order dependencies — that would waste time
to rediscover.

```bash
_SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")
_LEARN_DIR="$HOME/.lyra/projects/$_SLUG"
_LEARN_FILE="$_LEARN_DIR/learnings.jsonl"
mkdir -p "$_LEARN_DIR"
if [ -f "$_LEARN_FILE" ]; then
  _COUNT=$(wc -l < "$_LEARN_FILE" | tr -d ' ')
  echo "LEARNINGS: $_COUNT entries found"
  cat "$_LEARN_FILE"
else
  echo "LEARNINGS: 0 — first session for project: $_SLUG"
fi
```

**If learnings are found (`LEARNINGS: N` where N > 0):**

1. Parse each JSONL line and read the `key`, `insight`, `type`, `confidence`, and `skill` fields.
2. Print a summary before the session begins:
   ```
   Prior Learnings Loaded (N entries for project: {slug})
   ─────────────────────────────────────────────────────
   [pitfall]   auth-cookie-expires (confidence 9/10) [skill: qa]
               → Session cookies expire after 30min in staging — re-login before checkout tests
   [operational] dev-server-port (confidence 10/10) [skill: qa-design]
               → Dev server runs on :5173, not :3000
   …
   ```
3. Apply relevant learnings throughout the session:
   - `pitfall` → actively avoid the described failure mode
   - `operational` → use the correct ports, commands, config immediately
   - `pattern` → note if the pattern is still present or has been resolved
   - `preference` → respect user-stated preferences
   - `architecture` → use when reasoning about where a finding's root cause lives
4. Learnings are shared across `lyra-qa` and `lyra-qa-design` (same JSONL file). A learning captured in one skill applies to
   future runs of the other.
5. When a learning directly influences a decision, note it inline: **"Prior learning applied: {key} (confidence {N}/10)"**

**If `LEARNINGS: 0`:** Print `No prior learnings — this is the first session for {slug}.` and continue.
