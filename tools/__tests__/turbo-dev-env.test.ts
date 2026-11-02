import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Turbo runs tasks in strict env mode: a variable reaches the task only when
 * turbo.json declares it. The @vercel/microfrontends Vite plugin reads
 * `MFE_APP_PORT` to pin the dev port (docker-compose.yml depends on it), so the
 * `dev` task must pass it through or `MFE_APP_PORT=4200 bun run dev` silently
 * serves on the hashed default port instead.
 */

const TURBO_JSON = join(import.meta.dirname, '..', '..', 'turbo.json');

interface TurboTask {
  env?: string[];
  passThroughEnv?: string[];
}

describe('turbo.json dev task', () => {
  it('lets MFE_APP_PORT reach the dev server', () => {
    const turbo: { tasks: Record<string, TurboTask> } = JSON.parse(
      readFileSync(TURBO_JSON, 'utf8')
    );
    const dev = turbo.tasks['dev'];
    const declared = [...(dev?.env ?? []), ...(dev?.passThroughEnv ?? [])];
    expect(declared).toContain('MFE_APP_PORT');
  });
});
