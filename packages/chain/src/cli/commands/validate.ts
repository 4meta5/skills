import { join } from 'path';
import { validateConfigs, getDefaultChainsDir } from '../../loader/index.js';

interface ValidateOptions {
  skills?: string;
  profiles?: string;
  json?: boolean;
}

export async function validateCommand(
  dir: string | undefined,
  options: ValidateOptions
): Promise<void> {
  const chainsDir = dir ?? getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const profilesPath = options.profiles ?? join(chainsDir, 'profiles.yaml');

  try {
    const result = await validateConfigs(skillsPath, profilesPath);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.valid ? 0 : 1);
    }

    // Human-readable output
    if (result.valid) {
      console.log('✓ Configuration is valid\n');
    } else {
      console.log('✗ Configuration has errors\n');
    }

    if (result.errors.length > 0) {
      console.log('Errors:');
      for (const error of result.errors) {
        const location = error.path ? `${error.file}:${error.path}` : error.file;
        console.log(`  ✗ ${location}`);
        console.log(`    ${error.message}\n`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('Warnings:');
      for (const warning of result.warnings) {
        const location = warning.path ? `${warning.file}:${warning.path}` : warning.file;
        console.log(`  ⚠ ${location}`);
        console.log(`    ${warning.message}\n`);
      }
    }

    // Summary
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    console.log(`${errorCount} error(s), ${warningCount} warning(s)`);

    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}
