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
  const readme = [
    '![Version](https://img.shields.io/badge/Version-2026.05.28-red)',
    '![React 19](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-7.0_beta-3178C6) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.0-06B6D4)',
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
});
