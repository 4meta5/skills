import { resolve, sep } from 'path';

export function assertTestSafeProjectPath(projectPath: string, action: string): void {
  const testRoot = process.env.SKILLS_TEST_ROOT?.trim();
  if (!testRoot) {
    return;
  }

  const resolvedRoot = resolve(testRoot);
  const resolvedProject = resolve(projectPath);

  if (resolvedProject === resolvedRoot) {
    return;
  }

  if (!resolvedProject.startsWith(resolvedRoot + sep)) {
    throw new Error(`Test mode: refusing to ${action} outside ${resolvedRoot}: ${projectPath}`);
  }
}
