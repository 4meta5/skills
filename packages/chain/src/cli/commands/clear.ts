import { StateManager } from '../../session/index.js';

interface ClearOptions {
  cwd?: string;
  force?: boolean;
}

export async function clearCommand(options: ClearOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  try {
    const manager = new StateManager(cwd);
    const state = await manager.loadCurrent();

    if (!state) {
      console.log('No active chain session to clear.');
      process.exit(0);
    }

    if (!options.force) {
      console.log(`Active session: ${state.profile_id} (${state.session_id})`);
      console.log('Use --force to confirm clearing the session.');
      process.exit(1);
    }

    const cleared = await manager.clearCurrent();

    if (cleared) {
      console.log(`✓ Cleared session: ${state.session_id}`);
    } else {
      console.log('Failed to clear session.');
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}
