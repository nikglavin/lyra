## Browser Primitives (Playwright MCP)

All browser interactions go through the Playwright MCP server. Tool names follow the pattern
`mcp__plugin_playwright_playwright__<action>`. Use this table as a reference throughout the skill.

| Action                            | Tool                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| Navigate to a URL                 | `mcp__plugin_playwright_playwright__browser_navigate`         |
| Go back in history                | `mcp__plugin_playwright_playwright__browser_navigate_back`    |
| Take a screenshot                 | `mcp__plugin_playwright_playwright__browser_take_screenshot`  |
| Get accessibility snapshot (refs) | `mcp__plugin_playwright_playwright__browser_snapshot`         |
| Click an element                  | `mcp__plugin_playwright_playwright__browser_click`            |
| Hover an element                  | `mcp__plugin_playwright_playwright__browser_hover`            |
| Type into a field                 | `mcp__plugin_playwright_playwright__browser_type`             |
| Fill a whole form at once         | `mcp__plugin_playwright_playwright__browser_fill_form`        |
| Select a `<select>` option        | `mcp__plugin_playwright_playwright__browser_select_option`    |
| Press a key                       | `mcp__plugin_playwright_playwright__browser_press_key`        |
| Drag one element onto another     | `mcp__plugin_playwright_playwright__browser_drag`             |
| Upload a file                     | `mcp__plugin_playwright_playwright__browser_file_upload`      |
| Read console messages / errors    | `mcp__plugin_playwright_playwright__browser_console_messages` |
| Read network requests             | `mcp__plugin_playwright_playwright__browser_network_requests` |
| Handle a `window.alert`/`confirm` | `mcp__plugin_playwright_playwright__browser_handle_dialog`    |
| Resize viewport                   | `mcp__plugin_playwright_playwright__browser_resize`           |
| Switch / open tab                 | `mcp__plugin_playwright_playwright__browser_tabs`             |
| Wait for a condition              | `mcp__plugin_playwright_playwright__browser_wait_for`         |
| Run arbitrary JS in the page      | `mcp__plugin_playwright_playwright__browser_evaluate`         |
| Close the browser (end of run)    | `mcp__plugin_playwright_playwright__browser_close`            |

### Two rules you must follow

**1. Use `browser_snapshot` to get element refs, don't guess selectors.** `browser_snapshot` returns the accessibility tree
with stable refs. Pass those refs to `browser_click`, `browser_type`, etc. Don't compose CSS selectors from memory — they
drift and break.

**2. Screenshots come back inline. Don't `Read` them afterwards.** `browser_take_screenshot` returns the image in the tool
result directly. You already see it. Using the `Read` tool on the saved path re-loads the same bytes and wastes tokens.

### Viewport presets

For responsive checks, use these resize values:

- Mobile: 375 × 812
- Tablet: 768 × 1024
- Desktop-mid: 1280 × 720
- Desktop-large: 1920 × 1080

### Auth caveat

Playwright MCP starts a fresh browser per session — cookies and login state do NOT persist between runs. If the target
requires auth, either script the login flow as part of Phase 8 or point the skill at a publicly-accessible staging URL.
