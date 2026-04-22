# Lyra

A Claude Code plugin for UI/UX and design system skills.

## Install

```
claude plugin marketplace add nikglavin/lyra && claude plugin install lyra@lyra
```

## Skills

| Skill                      | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `/lyra-brand-storytelling` | Create and critique brand architecture, style guides, and UX narrative flows    |
| `/lyra-design-system`      | Establish visual identity, token architecture, and aesthetic direction for a UI |
| `/lyra-qa`                 | Autonomous QA engineer — tests, finds bugs, fixes them, and re-verifies         |
| `/lyra-qa-design`          | Visual QA agent — audits live web apps with a designer's eye                    |
| `/lyra-website-planning`   | Architect web platforms with PRDs, customer journey maps, and user personas     |

### Sub-skills

Used internally by agents. Not user-invocable.

| Skill                    | Agent           | Role                                                       |
| ------------------------ | --------------- | ---------------------------------------------------------- |
| `lyra-color-theory`      | `lyra-designer` | Color palettes, psychology, harmony, and WCAG contrast     |
| `lyra-grid-system`       | `lyra-designer` | Column grids, 8pt spacing, and layout structure            |
| `lyra-responsive-design` | `lyra-designer` | Mobile-first CSS, fluid layouts, and breakpoints           |
| `lyra-typography-system` | `lyra-designer` | Type scales, reading ergonomics, and fluid sizing          |
| `lyra-ux-principles`     | `lyra-designer` | Fitts's Law, Gestalt, visual hierarchy, and cognitive load |

## Agents

Lyra ships with three persona subagents in `agents/` that bundle related skills for larger workflows:

| Agent            | Role                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| `lyra-architect` | Product manager persona — scopes projects, maps journeys, and writes PRDs         |
| `lyra-designer`  | UI/UX executor — translates PRDs into structural web code using the design skills |
| `lyra-tester`    | Autonomous QA engine — runs in a worktree, finds bugs, and ships atomic fixes     |

Invoke via the Agent tool or by asking Claude to use the relevant persona.
