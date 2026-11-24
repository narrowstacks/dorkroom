import { describe, expect, it } from 'vitest';
import { toBundleShortVersion } from '../../app.config';

describe('toBundleShortVersion', () => {
  it('keeps an unpadded CalVer as is', () => {
    expect(toBundleShortVersion('2026.10.30')).toBe('2026.10.30');
  });

  it('strips zero padding from months and days', () => {
    expect(toBundleShortVersion('2026.07.03')).toBe('2026.7.3');
  });

  it('accepts one to three parts', () => {
    expect(toBundleShortVersion('2026')).toBe('2026');
    expect(toBundleShortVersion('2026.11')).toBe('2026.11');
  });

  it('trims surrounding whitespace', () => {
    expect(toBundleShortVersion(' 2026.11.2 ')).toBe('2026.11.2');
  });

  it.each([
    '',
    '1.2.3.4',
    '2026.10.30-beta.1',
    '2026..3',
    'v2026.1.1',
    '1.2.x',
    '-1.2',
  ])('rejects %j', (bad) => {
    expect(() => toBundleShortVersion(bad)).toThrow(/Invalid app version/);
  });
});
