import { describe, expect, it } from 'vitest';
import { clampText } from '../../lib/clamp-text';

describe('clampText', () => {
  it('returns null when already in range', () => {
    expect(clampText('5', 0, 10)).toBeNull();
  });

  it('clamps below min and above max', () => {
    expect(clampText('-4', 0)).toBe('0');
    expect(clampText('12.5', undefined, 10)).toBe('10');
  });

  it('returns null for unparseable or empty text', () => {
    expect(clampText('', 0, 10)).toBeNull();
    expect(clampText('abc', 0, 10)).toBeNull();
  });

  it('ignores non-finite bounds', () => {
    expect(clampText('5', Number.NaN)).toBeNull();
    expect(clampText('5', undefined, Number.NaN)).toBeNull();
    expect(
      clampText('5', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
    ).toBeNull();
  });

  it('lets max win when min > max', () => {
    expect(clampText('5', 10, 0)).toBe('0');
  });

  it('normalizes negative zero to "0"', () => {
    expect(clampText('-0', 0)).toBe('0');
    expect(clampText('-0.0', 0, 10)).toBe('0');
    expect(clampText('0', 0)).toBeNull();
  });
});
