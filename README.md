# Lyra

A Claude Code plugin for UI/UX and design system skills.

## Install

Add the Lyra marketplace to `~/.claude/plugins/known_marketplaces.json`:

```json
"lyra": {
  "source": { "source": "github", "repo": "nikglavin/lyra" },
  "installLocation": "/Users/<you>/.claude/plugins/marketplaces/lyra"
}
```

Then install via Claude Code:

```
/plugin install lyra@lyra
```

## Skills

| Skill                      | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `/lyra-brand-storytelling` | Create and critique brand architecture, style guides, and UX narrative flows    |
| `/lyra-breadboard`         | Turn a vague app idea into a lightweight structural screen flow                 |
| `/lyra-color-theory`       | Create and critique UI color palettes using color psychology and harmony        |
| `/lyra-design-system`      | Establish visual identity, token architecture, and aesthetic direction for a UI |
| `/lyra-grid-system`        | Create and review HTML grid layouts for web applications                        |
| `/lyra-prd-review`         | Review a PRD or Jira epic for scope, ISMS, and technical readiness              |
| `/lyra-qa`                 | Autonomous QA engineer — tests, finds bugs, fixes them, and re-verifies         |
| `/lyra-qa-design`          | Visual QA agent — audits live web apps with a designer's eye                    |
| `/lyra-responsive-design`  | Create and review HTML/CSS responsive design systems and media queries          |
| `/lyra-typography-system`  | Create and review typography systems, type scales, and font pairings            |
| `/lyra-ux-principles`      | Evaluate and apply UX psychology, Fitts's Law, and visual hierarchy principles  |
| `/lyra-website-planning`   | Architect web platforms with PRDs, customer journey maps, and user personas     |

## Agents

Lyra ships with three persona subagents in `agents/` that bundle related skills for larger workflows:

| Agent            | Role                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| `lyra-architect` | Product manager persona — scopes projects, maps journeys, and writes PRDs         |
| `lyra-designer`  | UI/UX executor — translates PRDs into structural web code using the design skills |
| `lyra-tester`    | Autonomous QA engine — runs in a worktree, finds bugs, and ships atomic fixes     |

Invoke via the Agent tool or by asking Claude to use the relevant persona.
