import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const SKILL_FILE = "SKILL.md";
const MAX_DESC_LENGTH = 1024;
const FORBIDDEN_REGEX = /[<>]/;
const SKILLS_DIR = join(import.meta.dir, "..", ".agents", "skills");

async function lintSkills() {
	const entries = await readdir(SKILLS_DIR, { withFileTypes: true }).catch(() => {
		console.error(`❌ Error: Build output not found at ${SKILLS_DIR}. Run \`bun run build\` first.`);
		process.exit(1);
	});
	const skillFolders = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

	let hasError = false;

	for (const folder of skillFolders) {
		const folderPath = join(SKILLS_DIR, folder.name);

		// 1. Kebab-case naming check
		if (!/^[a-z0-9-]+$/.test(folder.name)) {
			console.error(`❌ Error: Folder "${folder.name}" must be kebab-case (no capitals/spaces).`);
			hasError = true;
		}

		// 2. Exact SKILL.md naming check
		const files = await readdir(folderPath);
		if (!files.includes(SKILL_FILE)) {
			console.error(`❌ Error: Folder "${folder.name}" is missing ${SKILL_FILE} (Case-Sensitive!).`);
			hasError = true;
			continue;
		}

		// 3. Content Validation
		const content = await readFile(join(folderPath, SKILL_FILE), "utf-8");
		const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)/);

		if (!frontmatterMatch) {
			console.error(`❌ Error: ${folder.name}/${SKILL_FILE} is missing valid YAML frontmatter delimiters (---).`);
			hasError = true;
			continue;
		}

		// 4. Body content check
		if (!frontmatterMatch[2].trim()) {
			console.error(`❌ Error: ${folder.name}/${SKILL_FILE} has no content after frontmatter.`);
			hasError = true;
		}

		try {
			const data = parse(frontmatterMatch[1]);

			// Name & Description presence
			if (!data.name || !data.description) {
				console.error(`❌ Error: ${folder.name} frontmatter must contain both 'name' and 'description'.`);
				hasError = true;
			}

			// Reserved Names (case-insensitive)
			const nameLower = (data.name ?? "").toLowerCase();
			if (nameLower.includes("claude") || nameLower.includes("anthropic")) {
				console.error(`❌ Error: Skill name "${data.name}" uses reserved words (anthropic/claude).`);
				hasError = true;
			}

			// Description Constraints
			if (data.description?.length > MAX_DESC_LENGTH) {
				console.error(`❌ Error: ${folder.name} description exceeds ${MAX_DESC_LENGTH} characters.`);
				hasError = true;
			}

			const textValues = [data.name, data.description].filter(Boolean).join(" ");
			if (FORBIDDEN_REGEX.test(textValues)) {
				console.error(`❌ Error: ${folder.name} frontmatter contains forbidden XML characters (< or >).`);
				hasError = true;
			}
		} catch {
			console.error(`❌ Error: ${folder.name} has invalid YAML syntax.`);
			hasError = true;
		}
	}

	if (!hasError) console.log("✅ All skills passed structural validation!");
	process.exit(hasError ? 1 : 0);
}

lintSkills();
