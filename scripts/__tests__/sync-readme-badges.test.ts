import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyBadgeUpdates,
  deriveBadgeValues,
  parseTypescriptVersion,
} from '../sync-readme-badges';

describe('parseTypescriptVersion', () => {
  it('reads the resolved typescript-7 alias version from bun.lock', () => {
    const lock = [
      '    "typescript": ["typescript@6.0.3", "", {}, "sha512-aaa=="],',
      '    "typescript-7": ["typescript@7.0.1-rc", "", {}, "sha512-bbb=="],',
    ].join('\n');
    expect(parseTypescriptVersion(lock)).toBe('7.0.1-rc');
  });

  it('throws when the typescript-7 alias is absent', () => {
    expect(() => parseTypescriptVersion('{}')).toThrow(/typescript-7/i);
  });
});

describe('deriveBadgeValues', () => {
  it('extracts CalVer, React major, full Tailwind, and TS major.minor + prerelease tag', () => {
    const pkg = {
      version: '2026.05.28',
      dependencies: { react: '19.2.3' },
      devDependencies: { tailwindcss: '4.3.0' },
    };
    expect(deriveBadgeValues(pkg, '7.0.1-rc')).toEqual({
      version: '2026.05.28',
      react: '19',
      tailwind: '4.3.0',
      typescript: '7.0_rc',
    });
  });

  it('strips leading ^ and ~ from ranges and honors other prerelease tags', () => {
    const pkg = {
      version: '2026.06.03',
      dependencies: { react: '^20.0.1' },
      devDependencies: { tailwindcss: '~4.5.0' },
    };
    expect(deriveBadgeValues(pkg, '7.1.0-beta.1')).toEqual({
      version: '2026.06.03',
      react: '20',
      tailwind: '4.5.0',
      typescript: '7.1_beta',
    });
  });

  it('omits the suffix for a stable release', () => {
    const pkg = {
      version: '2026.06.03',
      dependencies: { react: '19.2.3' },
      devDependencies: { tailwindcss: '4.3.0' },
    };
    expect(deriveBadgeValues(pkg, '7.0.0').typescript).toBe('7.0');
  });

  it('throws when react is missing', () => {
    expect(() =>
      deriveBadgeValues(
        {
          version: '2026.06.03',
          devDependencies: { tailwindcss: '4.3.0' },
        },
        '7.0.1-rc'
      )
    ).toThrow(/react/i);
  });

  it('throws when tailwindcss is missing', () => {
    expect(() =>
      deriveBadgeValues(
        {
          version: '2026.06.03',
          dependencies: { react: '19.2.3' },
        },
        '7.0.1-rc'
      )
    ).toThrow(/tailwind/i);
  });

  it('throws when the typescript version is malformed', () => {
    expect(() =>
      deriveBadgeValues(
        {
          version: '2026.06.03',
          dependencies: { react: '19.2.3' },
          devDependencies: { tailwindcss: '4.3.0' },
        },
        ''
      )
    ).toThrow(/typescript/i);
  });
});

describe('applyBadgeUpdates', () => {
  // The target badges sit among others that share their shape, as in the
  // real README: License shares Version's line, and TanStack Query's badge
  // also ends in `-red`. A pattern that spans badges would eat them.
  const neighbours = [
    '[![License](https://img.shields.io/badge/License-AGPL_V3.0-blue)](https://github.com/narrowstacks/dorkroom/blob/main/LICENSE)',
    '![TanStack Query](https://img.shields.io/badge/-TanStack%20Query-red?style=flat-square&logo=react-query&logoColor=white)',
    '![Biome](https://img.shields.io/badge/Biome-60A5FA?logo=biome&logoColor=fff)',
  ];
  const readme = [
    `![Version](https://img.shields.io/badge/Version-2026.05.28-red) ${neighbours[0]}`,
    `![React 19](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-7.0_beta-3178C6) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.0-06B6D4) ${neighbours[1]} ${neighbours[2]}`,
  ].join('\n');

  it('rewrites only the four target badge values', () => {
    const out = applyBadgeUpdates(readme, {
      version: '2026.06.03',
      react: '20',
      tailwind: '4.5.0',
      typescript: '7.1_beta',
    });
    expect(out).toContain('badge/Version-2026.06.03-red');
    expect(out).toContain('badge/React-20-61DAFB');
    expect(out).toContain('badge/TypeScript-7.1_beta-3178C6');
    expect(out).toContain('badge/Tailwind-4.5.0-06B6D4');
    expect(out).not.toContain('2026.05.28');
    expect(out).not.toContain('7.0_beta');
    for (const neighbour of neighbours) {
      expect(out).toContain(neighbour);
    }
  });

  it('is a no-op when values already match', () => {
    const out = applyBadgeUpdates(readme, {
      version: '2026.05.28',
      react: '19',
      tailwind: '4.3.0',
      typescript: '7.0_beta',
    });
    expect(out).toBe(readme);
  });

  // The fixture above can only prove the patterns against a copy. This runs
  // them against the README the workflow actually rewrites, so a renamed or
  // duplicated badge there fails here instead of silently going stale.
  it('matches each target badge in the real README exactly once', () => {
    const real = readFileSync(
      join(import.meta.dirname, '..', '..', 'README.md'),
      'utf8'
    );
    const out = applyBadgeUpdates(real, {
      version: 'SYNC_VERSION',
      react: 'SYNC_REACT',
      tailwind: 'SYNC_TAILWIND',
      typescript: 'SYNC_TYPESCRIPT',
    });
    for (const badge of [
      'badge/Version-SYNC_VERSION-red',
      'badge/React-SYNC_REACT-61DAFB',
      'badge/TypeScript-SYNC_TYPESCRIPT-3178C6',
      'badge/Tailwind-SYNC_TAILWIND-06B6D4',
    ]) {
      expect(out.split(badge).length - 1, badge).toBe(1);
    }
  });
});
