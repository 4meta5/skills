import { createSkillsLibrary } from '@anthropic/skills-library';

export async function showCommand(name: string): Promise<void> {
  if (!name) {
    console.error('Error: Skill name is required.');
    console.log('Usage: skills show <name>');
    process.exit(1);
  }

  const library = createSkillsLibrary();

  try {
    const skill = await library.loadSkill(name);

    console.log(`\n${skill.metadata.name}`);
    console.log('='.repeat(skill.metadata.name.length));
    console.log();
    console.log(`Description: ${skill.metadata.description}`);

    if (skill.metadata.category) {
      console.log(`Category: ${skill.metadata.category}`);
    }

    if (skill.metadata['user-invocable']) {
      console.log('User-invocable: yes (can be used as /<name>)');
    }

    if (skill.metadata['allowed-tools']) {
      console.log(`Allowed tools: ${skill.metadata['allowed-tools']}`);
    }

    if (skill.metadata.context) {
      console.log(`Context: ${skill.metadata.context}`);
    }

    if (skill.metadata.agent) {
      console.log(`Agent: ${skill.metadata.agent}`);
    }

    console.log(`Path: ${skill.path}`);

    if (skill.supportingFiles && skill.supportingFiles.length > 0) {
      console.log(`\nSupporting files:`);
      for (const file of skill.supportingFiles) {
        console.log(`  - ${file}`);
      }
    }

    console.log('\n--- Content ---\n');
    console.log(skill.content);
    console.log();
  } catch (error) {
    console.error(`Error: Skill "${name}" not found.`);
    process.exit(1);
  }
}
