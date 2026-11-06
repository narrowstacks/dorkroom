import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(__dirname, '..', 'should-deploy.sh');

function run(env: 'production' | 'preview', message: string) {
  const result = spawnSync('bash', [SCRIPT], {
    env: {
      PATH: process.env.PATH ?? '',
      VERCEL_ENV: env,
      VERCEL_GIT_COMMIT_SHA: 'head',
      VERCEL_GIT_COMMIT_MESSAGE: message,
    },
    encoding: 'utf8',
  });
  return result.status;
}

const SKIP = 0;
const BUILD = 1;

describe('should-deploy.sh', () => {
  it('builds production on [deploy]', () => {
    expect(run('production', 'feat(web): new page (#700) [deploy]')).toBe(
      BUILD
    );
  });

  it('builds a preview on [preview]', () => {
    expect(run('preview', 'chore: preview [preview]')).toBe(BUILD);
  });

  it.each(['production', 'preview'] as const)(
    'skips an unmarked %s commit',
    (env) => {
      expect(run(env, 'feat(web): new page')).toBe(SKIP);
    }
  );

  it('skips production on [preview], so a preview request cannot ship', () => {
    expect(run('production', 'chore: preview [preview] (#700)')).toBe(SKIP);
  });

  it('skips a preview on [deploy]', () => {
    expect(run('preview', 'feat(web): new page [deploy]')).toBe(SKIP);
  });

  it('skips a squash merge whose marker is only in a branch commit in the body', () => {
    expect(
      run(
        'production',
        'feat(web): new page (#700)\n\n* feat(web): new page\n\n* chore: ship [deploy]'
      )
    ).toBe(SKIP);
  });

  it('builds a marked squash merge with a multi-line body', () => {
    expect(
      run(
        'production',
        'feat(web): new page (#700) [deploy]\n\n* feat(web): new page'
      )
    ).toBe(BUILD);
  });

  it.each(['[DEPLOY]', 'deploy', '[deploy', '[build]', '[release]'])(
    'skips the near-miss marker %s',
    (marker) => {
      expect(run('production', `feat(web): new page ${marker}`)).toBe(SKIP);
    }
  );

  it('skips automation commits', () => {
    expect(
      run('production', 'chore: sync README version badges [skip ci]')
    ).toBe(SKIP);
    expect(
      run('production', 'chore: update homepage screenshot [skip ci]')
    ).toBe(SKIP);
  });

  it('builds when there is no commit message to mark', () => {
    expect(run('production', '')).toBe(BUILD);
  });
});
