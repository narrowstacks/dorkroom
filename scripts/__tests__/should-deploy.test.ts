import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(__dirname, '..', 'should-deploy.sh');

// should-deploy.sh reads the changed files from the GitHub compare API with
// curl. A fake curl on PATH records the URL it was called with and prints a
// canned compare response, so the script runs without the network.
let binDir: string;

function run(env: Record<string, string>, files: string[]) {
  const body = files.map((f) => `      "filename": "${f}",`).join('\n');
  writeFileSync(join(binDir, 'response.json'), body);
  const result = spawnSync('bash', [SCRIPT], {
    env: {
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      FAKE_DIR: binDir,
      VERCEL_GIT_REPO_OWNER: 'narrowstacks',
      VERCEL_GIT_REPO_SLUG: 'dorkroom',
      VERCEL_GIT_COMMIT_SHA: 'head',
      VERCEL_GIT_COMMIT_MESSAGE: 'feat: something',
      ...env,
    },
    encoding: 'utf8',
  });
  return { code: result.status, out: result.stdout };
}

beforeEach(() => {
  binDir = mkdtempSync(join(tmpdir(), 'should-deploy-'));
  const curl = join(binDir, 'curl');
  writeFileSync(
    curl,
    '#!/bin/bash\necho "$2" > "$FAKE_DIR/url"\ncat "$FAKE_DIR/response.json"\n'
  );
  chmodSync(curl, 0o755);
});

afterEach(() => {
  rmSync(binDir, { recursive: true, force: true });
});

const SKIP = 0;
const BUILD = 1;

describe('should-deploy.sh', () => {
  it('skips the first push of an iOS-only branch, diffing against main', () => {
    const { code, out } = run({ VERCEL_GIT_COMMIT_REF: 'feat/mobile-x' }, [
      'apps/mobile/src/lib/a.ts',
      'apps/mobile/CHANGELOG.md',
    ]);
    expect(code).toBe(SKIP);
    expect(out).toContain('diffing against main');
    expect(readFileSync(join(binDir, 'url'), 'utf8')).toContain(
      '/compare/main...head'
    );
  });

  it('builds the first push of a branch that touches the web app', () => {
    const { code } = run({ VERCEL_GIT_COMMIT_REF: 'feat/web-x' }, [
      'apps/mobile/src/lib/a.ts',
      'apps/dorkroom/src/app/pages/privacy-page.tsx',
    ]);
    expect(code).toBe(BUILD);
  });

  it('builds main with no previous SHA rather than guess a base', () => {
    const { code } = run({ VERCEL_GIT_COMMIT_REF: 'main' }, [
      'apps/mobile/src/lib/a.ts',
    ]);
    expect(code).toBe(BUILD);
  });

  it('diffs against the previous SHA when Vercel provides one', () => {
    const { code } = run(
      {
        VERCEL_GIT_COMMIT_REF: 'feat/mobile-x',
        VERCEL_GIT_PREVIOUS_SHA: 'prev',
      },
      ['apps/mobile/src/lib/a.ts']
    );
    expect(code).toBe(SKIP);
  });

  it('builds when the compare API returns nothing', () => {
    const { code } = run({ VERCEL_GIT_COMMIT_REF: 'feat/mobile-x' }, []);
    expect(code).toBe(BUILD);
  });
});
