import { describe, expect, it } from 'vitest';
import { applyBadgeUpdates, deriveBadgeValues } from '../sync-readme-badges';

describe('deriveBadgeValues', () => {
  it('extracts CalVer, React major, full Tailwind, and TS major.minor + _beta', () => {
    const pkg = {
      version: '2026.05.28',
      dependencies: { react: '19.2.3' },
      devDependencies: {
        tailwindcss: '4.3.0',
        '@typescript/native-preview': '7.0.0-dev.20260421.2',
      },
    };
    expect(deriveBadgeValues(pkg)).toEqual({
      version: '2026.05.28',
      react: '19',
      tailwind: '4.3.0',
      typescript: '7.0_beta',
    });
  });

  it('strips leading ^ and ~ from ranges', () => {
    const pkg = {
      version: '2026.06.03',
      dependencies: { react: '^20.0.1' },
      devDependencies: {
        tailwindcss: '~4.5.0',
        '@typescript/native-preview': '7.1.0-dev.1',
      },
    };
    expect(deriveBadgeValues(pkg)).toEqual({
      version: '2026.06.03',
      react: '20',
      tailwind: '4.5.0',
      typescript: '7.1_beta',
    });
  });

  it('throws when react is missing', () => {
    expect(() =>
      deriveBadgeValues({
        version: '2026.06.03',
        devDependencies: {
          tailwindcss: '4.3.0',
          '@typescript/native-preview': '7.0.0-dev.1',
        },
      })
    ).toThrow(/react/i);
  });

  it('throws when tailwindcss is missing', () => {
    expect(() =>
      deriveBadgeValues({
        version: '2026.06.03',
        dependencies: { react: '19.2.3' },
        devDependencies: { '@typescript/native-preview': '7.0.0-dev.1' },
      })
    ).toThrow(/tailwind/i);
  });

  it('throws when @typescript/native-preview is missing or malformed', () => {
    expect(() =>
      deriveBadgeValues({
        version: '2026.06.03',
        dependencies: { react: '19.2.3' },
        devDependencies: { tailwindcss: '4.3.0' },
      })
    ).toThrow(/typescript|native-preview/i);
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
