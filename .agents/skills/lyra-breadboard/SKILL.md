---
name: lyra-breadboard
description: Turns an app idea into a structural screen flow. Invoke with /lyra-breadboard.
metadata:
  version: 1.0.0
---

## Preflight

```bash
_UPD=$(~/.claude/shared/scripts/preflight 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
```

If output contains `SKILLS_UPDATE_AVAILABLE`: use AskUserQuestion to ask if they want to update now. If yes, run the
`lyra-update` skill.


Skill artifacts are written to `.lyra/<skill-name>/` inside the project root, not the project root itself. This keeps
generated files out of the way and clearly attributed to the skill that produced them.

```bash
OUTPUT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.lyra/SKILL_NAME"
mkdir -p "$OUTPUT_DIR"
```

Replace `SKILL_NAME` with the skill's `name` value from its frontmatter.

When writing files, use `$OUTPUT_DIR/<filename>` as the path. After writing, tell the user the full path so they can find the
output.


# Breadboarding & Logic Mapping

Turn a vague idea into a numbered, labeled screen flow that a designer and engineer can work from in parallel. The output is
a single HTML breadboard — not a mockup, not a wireframe with visual design — just screens, their contents at a
container-component level, and the actions that connect them.

---

## Phase 1: Upfront Questions

Use the `AskUserQuestion` tool to collect all inputs before generating anything. Ask up to 4 questions at once — never drip
them one at a time.

**First call** — ask these three together:

1. **What is the product?** (One sentence: who uses it and what's the core thing it does)
2. **Who is the primary actor?** (The main person doing work in the app — e.g., "Seller", "Pet Sitter", "Admin")
3. **What is the core noun?** (The main object they're working with — e.g., "Listing", "Booking", "Invoice")

**Second call** (if needed) — ask scope and references:

4. **What's the scope?** Entire product, a specific sub-system (e.g., onboarding), or a single feature (e.g., search)?
5. **Any existing screens, flows, or references to draw from?** (Optional — share files or describe)

Wait for the user's answers before proceeding.

---

## Phase 2: Generate the Breadboard

Once you have the answers, produce the complete JSON data in one pass. Do not ask more questions — infer what you need from
the context and produce a complete draft.

### Screen Structure

Organize screens into four system-state groups:

1. **Entry / Auth** — How the user gets in (login, sign-up, password reset, verification)
2. **Onboarding** — How they get set up the first time (profile, setup wizard, first-run state)
3. **Core Loop** — Where the primary value is created (the "work" area — dashboards, creation flows, detail views)
4. **Management** — Settings, history, admin, account

Number screens sequentially within each group using the group slug as a prefix: `auth-01`, `auth-02`, `core-01`, `core-02`,
etc. This makes every screen ID unique and unambiguous within a single group file.

### Screen Content Format

Each screen contains only structural elements — no visual design, no icons, no images.

**Content brevity rule:** use the shortest description that communicates intent — "Email" not "Enter your email address".
Labels, not copy.

Element types:

- **Form** — a group of input fields. `content` names the form; `fields` array lists each field with `type` (Input / Select /
  Toggle / Textarea) and `content` (short label).
- **List** — a repeating data structure. `content` names the list; `fields` array defines each column with `type` (column
  label) and `content` (what it contains).
- **Component** — a contained info block. `content` names the component; `fields` array lists each data point with `type`
  (label) and `content` (description).
- **Button** — primary CTA: `Continue to payment`
- **Link** — secondary nav or text link: `Back to listings`
- **Note** — a callout tinted with the group accent colour. Use for conditional behaviour, warnings, or context that belongs
  on the canvas rather than inside another element.

`List` and `Component` elements support optional variant keys — add `"or:empty"`, `"or:filled"`, or `"or:selected"` directly
on the element to describe how it looks in that state. The renderer displays these as dashed sub-rows below the fields.

```json
{ "type": "List", "content": "Photo slots", "fields": [...], "or:empty": "Label + upload prompt", "or:filled": "Thumbnail + label" }
```

Each element supports an optional `note` field — one sentence of conditional logic, data source, or behaviour a
designer/engineer needs to know.

```json
{
	"type": "Form",
	"content": "Sign in",
	"fields": [
		{ "type": "Input", "content": "Email" },
		{ "type": "Input", "content": "Password" },
		{ "type": "Toggle", "content": "Remember me" }
	],
	"note": "Password field shows strength indicator on focus"
}
```

---

## Phase 3: Output Files

Write all files to `$OUTPUT_DIR` (`.lyra/lyra-breadboard/`).

### First run: write all files

1. **`$OUTPUT_DIR/breadboard.html`** — copy `resources/breadboard-shell.html` verbatim using `Write`. **Never modify this
   file again.**

2. **`$OUTPUT_DIR/breadboard-index.js`** — metadata and group order:

```js
window.BREADBOARD_META = {
	product: "App Name",
	actor: "Primary actor",
	noun: "Core noun",
	date: "DD Mon YYYY",
};
window.BREADBOARD_GROUP_ORDER = ["auth", "onboarding", "core", "mgmt"];
```

Slugs are short kebab-case derived from the group name (e.g. "Entry / Auth" → `auth`, "Core Loop" → `core`). Use whatever
slugs fit the product — not fixed to these four.

3. **One file per group** — `$OUTPUT_DIR/breadboard-group-{slug}.js`:

```js
window.BREADBOARD_GROUP_auth = {
	name: "Entry / Auth",
	accent: "#6366f1",
	screens: [
		{
			num: "auth-01",
			name: "Screen Name",
			jtbd: "One sentence: the job this screen does for the user",
			flows: ["core-01 Dashboard"],
			elements: [
				{ type: "Heading", content: "Title text" },
				{ type: "Input", content: "Label", note: "Optional context note" },
			],
		},
	],
};
```

Variable name: slug with hyphens replaced by underscores, prefixed with `BREADBOARD_GROUP_` (e.g. `core-loop` →
`window.BREADBOARD_GROUP_core_loop`).

Screen `num` format: `{slug}-01`, `{slug}-02`, etc. — sequential within the group, starting at `01`.

**Rule: always use `Write`, never `Edit`.** Every file is always replaced in full.

### Group accent colors

- Entry/Auth: `#6366f1` (indigo)
- Onboarding: `#f59e0b` (amber)
- Core Loop: `#10b981` (emerald)
- Management: `#6b7280` (gray)
- Custom groups: pick a distinct color

### After writing, present the path

Output this to the user (use the real absolute path):

> Open in browser: `file:///absolute/path/to/.lyra/lyra-breadboard/breadboard.html`

Also tell the user: how many screens were generated, which groups, one sentence for the designer, one for the engineer.

---

## Phase 4: Iteration

Use `AskUserQuestion` to ask: "Want to add, remove, or rename any screens? Or adjust any flows?"

**On every iteration:**

- Identify which group is changing → rewrite **only that group's file** (`$OUTPUT_DIR/breadboard-group-{slug}.js`) using
  `Write`
- If metadata changes (product name, date, etc.) → rewrite only `$OUTPUT_DIR/breadboard-index.js`
- If a group is added or removed → rewrite `breadboard-index.js` (update `BREADBOARD_GROUP_ORDER`) and write/remove the group
  file
- Keep screen numbers stable — append new screens at the end of the group with the next `{slug}-NN` number, never renumber
  existing ones
- **Never touch `breadboard.html`**
- After writing, re-present the `file://` path so the user can refresh their browser
