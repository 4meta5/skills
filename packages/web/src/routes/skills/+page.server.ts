import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

interface SkillMetadata {
	name: string;
	description: string;
	category?: string;
}

interface Skill {
	name: string;
	description: string;
	category?: string;
}

export async function load(): Promise<{ skills: Skill[] }> {
	const skillsDir = join(process.cwd(), '..', 'skills-library', 'skills');
	const skills: Skill[] = [];

	try {
		const entries = await readdir(skillsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const skillPath = join(skillsDir, entry.name, 'SKILL.md');
				try {
					const content = await readFile(skillPath, 'utf-8');
					const match = content.match(/^---\n([\s\S]*?)\n---/);
					if (match) {
						const frontmatter = parseYaml(match[1]) as SkillMetadata;
						skills.push({
							name: frontmatter.name || entry.name,
							description: frontmatter.description || 'No description',
							category: frontmatter.category
						});
					}
				} catch {
					// Skip invalid skill directories
				}
			}
		}
	} catch {
		// Skills directory may not exist
	}

	// Sort by name
	skills.sort((a, b) => a.name.localeCompare(b.name));

	return { skills };
}
