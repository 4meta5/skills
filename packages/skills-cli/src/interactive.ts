import { checkbox, confirm } from '@inquirer/prompts';
import type { Skill } from '@4meta5/skills';

export interface SkillChoice {
  name: string;
  value: string;
  checked?: boolean;
}

export async function selectSkills(
  skills: Skill[],
  preselected: string[] = []
): Promise<string[]> {
  const preselectedSet = new Set(preselected);

  const choices: SkillChoice[] = skills.map(skill => ({
    name: `${skill.metadata.name} - ${skill.metadata.description}`,
    value: skill.metadata.name,
    checked: preselectedSet.has(skill.metadata.name)
  }));

  if (choices.length === 0) {
    console.log('No skills available.');
    return [];
  }

  const selected = await checkbox({
    message: 'Select skills to add:',
    choices,
    pageSize: 15
  });

  return selected;
}

export async function confirmAction(message: string): Promise<boolean> {
  return confirm({ message, default: true });
}
