import { mkdir, writeFile, copyFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type {
  Skill,
  SkillCategory,
  SkillsLibrary,
  SkillsLibraryOptions,
  InstallOptions,
  ProjectTemplate,
  FileStructure
} from './types.js';
import { loadSkillFromPath, loadSkillsFromDirectory } from './loader.js';

/**
 * Get the path to bundled skills in this package
 */
function getBundledSkillsPath(): string {
  return join(__dirname, '..', 'skills');
}

/**
 * Get the user's global skills directory
 */
function getUserSkillsPath(): string {
  return join(homedir(), '.claude', 'skills');
}

/**
 * Get the project skills directory
 */
function getProjectSkillsPath(cwd: string): string {
  return join(cwd, '.claude', 'skills');
}

/**
 * Create the skills library instance
 */
export function createSkillsLibrary(options: SkillsLibraryOptions = {}): SkillsLibrary {
  const cwd = options.cwd || process.cwd();
  const bundledSkillsDir = options.skillsDir || getBundledSkillsPath();

  return {
    /**
     * Load a skill by name from bundled, project, or user locations
     */
    async loadSkill(name: string): Promise<Skill> {
      // Search order: project -> user -> bundled
      const searchPaths = [
        join(getProjectSkillsPath(cwd), name),
        join(getUserSkillsPath(), name),
        join(bundledSkillsDir, name)
      ];

      for (const skillPath of searchPaths) {
        try {
          return await loadSkillFromPath(skillPath);
        } catch {
          // Try next path
        }
      }

      throw new Error(`Skill not found: ${name}`);
    },

    /**
     * List all available skills, optionally filtered by category
     */
    async listSkills(category?: SkillCategory): Promise<Skill[]> {
      const allSkills: Skill[] = [];
      const seenNames = new Set<string>();

      // Load from all locations (project takes precedence)
      const locations = [
        getProjectSkillsPath(cwd),
        getUserSkillsPath(),
        bundledSkillsDir
      ];

      for (const location of locations) {
        const skills = await loadSkillsFromDirectory(location);
        for (const skill of skills) {
          if (!seenNames.has(skill.metadata.name)) {
            seenNames.add(skill.metadata.name);
            allSkills.push(skill);
          }
        }
      }

      if (category) {
        return allSkills.filter(s => s.metadata.category === category);
      }

      return allSkills;
    },

    /**
     * Install a skill to project or user location
     */
    async installSkill(skill: Skill, options: InstallOptions): Promise<void> {
      const targetBase = options.location === 'user'
        ? getUserSkillsPath()
        : getProjectSkillsPath(options.cwd || cwd);

      const targetDir = join(targetBase, skill.metadata.name);

      // Create directory
      await mkdir(targetDir, { recursive: true });

      // Write SKILL.md
      const skillMdContent = formatSkillMd(skill);
      await writeFile(join(targetDir, 'SKILL.md'), skillMdContent, 'utf-8');

      // Copy supporting files
      if (skill.supportingFiles) {
        for (const file of skill.supportingFiles) {
          const sourcePath = join(skill.path, file);
          const targetPath = join(targetDir, file);
          await mkdir(dirname(targetPath), { recursive: true });
          await copyFile(sourcePath, targetPath);
        }
      }
    },

    /**
     * Create a new project from a template
     */
    async createProject(template: ProjectTemplate, targetPath: string): Promise<void> {
      // Create base directory
      await mkdir(targetPath, { recursive: true });

      // Create file structure
      for (const entry of template.structure) {
        const fullPath = join(targetPath, entry.path);
        if (entry.type === 'directory') {
          await mkdir(fullPath, { recursive: true });
        } else {
          await mkdir(dirname(fullPath), { recursive: true });
          await writeFile(fullPath, entry.content, 'utf-8');
        }
      }

      // Write CLAUDE.md
      await writeFile(join(targetPath, 'CLAUDE.md'), template.claudemd, 'utf-8');

      // Install skills
      const tempLibrary = createSkillsLibrary({ cwd: targetPath, skillsDir: bundledSkillsDir });
      for (const skillName of template.skills) {
        try {
          const skill = await this.loadSkill(skillName);
          await tempLibrary.installSkill(skill, { location: 'project', cwd: targetPath });
        } catch (error) {
          console.warn(`Warning: Could not install skill "${skillName}": ${error}`);
        }
      }
    },

    /**
     * Add skills to an existing project
     */
    async extendProject(skills: string[]): Promise<void> {
      for (const skillName of skills) {
        const skill = await this.loadSkill(skillName);
        await this.installSkill(skill, { location: 'project', cwd });
      }

      // Update CLAUDE.md to reference new skills
      const claudeMdPath = join(cwd, 'CLAUDE.md');
      try {
        let content = await readFile(claudeMdPath, 'utf-8');

        // Add skills section if not present
        if (!content.includes('## Installed Skills')) {
          content += '\n\n## Installed Skills\n';
        }

        for (const skillName of skills) {
          const skillRef = `- @.claude/skills/${skillName}/SKILL.md`;
          if (!content.includes(skillRef)) {
            content = content.replace(
              '## Installed Skills\n',
              `## Installed Skills\n${skillRef}\n`
            );
          }
        }

        await writeFile(claudeMdPath, content, 'utf-8');
      } catch {
        // CLAUDE.md doesn't exist, create it
        const skillRefs = skills.map(s => `- @.claude/skills/${s}/SKILL.md`).join('\n');
        const content = `# Project\n\n## Installed Skills\n${skillRefs}\n`;
        await writeFile(claudeMdPath, content, 'utf-8');
      }
    }
  };
}

/**
 * Format a skill back to SKILL.md content
 */
function formatSkillMd(skill: Skill): string {
  const frontmatterLines = ['---'];

  for (const [key, value] of Object.entries(skill.metadata)) {
    if (value !== undefined) {
      frontmatterLines.push(`${key}: ${value}`);
    }
  }

  frontmatterLines.push('---');

  return `${frontmatterLines.join('\n')}\n\n${skill.content}`;
}
