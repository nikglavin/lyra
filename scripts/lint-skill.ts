import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const SKILL_FILE = "SKILL.md";
const MAX_DESC_LENGTH = 1024;
const FORBIDDEN_REGEX = /[<>]/;

async function lintSkills() {
  const entries = await readdir(".", { withFileTypes: true });
  const skillFolders = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith("."),
  );

  let hasError = false;

  for (const folder of skillFolders) {
    const folderPath = join(import.meta.dir, folder.name);

    // 1. Kebab-case naming check
    if (!/^[a-z0-9-]+$/.test(folder.name)) {
      console.error(
        `❌ Error: Folder "${folder.name}" must be kebab-case (no capitals/spaces).`,
      );
      hasError = true;
    }

    // 2. Exact SKILL.md naming check [cite: 174, 175]
    const files = await readdir(folderPath);
    if (!files.includes(SKILL_FILE)) {
      console.error(
        `❌ Error: Folder "${folder.name}" is missing ${SKILL_FILE} (Case-Sensitive!).`,
      );
      hasError = true;
      continue;
    }

    // 3. Content Validation
    const content = await readFile(join(folderPath, SKILL_FILE), "utf-8");
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);

    if (!frontmatterMatch) {
      console.error(
        `❌ Error: ${folder.name}/${SKILL_FILE} is missing valid YAML frontmatter delimiters (---).`,
      );
      hasError = true;
      continue;
    }

    try {
      const data = parse(frontmatterMatch[1]);

      // Name & Description presence [cite: 188, 192]
      if (!data.name || !data.description) {
        console.error(
          `❌ Error: ${folder.name} frontmatter must contain both 'name' and 'description'.`,
        );
        hasError = true;
      }

      // Reserved Names [cite: 202, 311]
      if (data.name?.includes("claude") || data.name?.includes("anthropic")) {
        console.error(
          `❌ Error: Skill name "${data.name}" uses reserved words (anthropic/claude).`,
        );
        hasError = true;
      }

      // Description Constraints [cite: 196, 197]
      if (data.description?.length > MAX_DESC_LENGTH) {
        console.error(
          `❌ Error: ${folder.name} description exceeds ${MAX_DESC_LENGTH} characters.`,
        );
        hasError = true;
      }

      if (FORBIDDEN_REGEX.test(frontmatterMatch[1])) {
        console.error(
          `❌ Error: ${folder.name} frontmatter contains forbidden XML characters (< or >).`,
        );
        hasError = true;
      }
    } catch (e) {
      console.error(`❌ Error: ${folder.name} has invalid YAML syntax.`);
      hasError = true;
    }
  }

  if (!hasError) console.log("✅ All skills passed structural validation!");
  process.exit(hasError ? 1 : 0);
}

lintSkills();
