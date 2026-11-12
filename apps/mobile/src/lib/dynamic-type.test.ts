import { describe, expect, it } from 'vitest';
import { isLargeTextScale, LARGE_TEXT_SCALE } from './dynamic-type';

describe('isLargeTextScale', () => {
  it('keeps rows side by side through the standard sizes', () => {
    expect(isLargeTextScale(1)).toBe(false);
    expect(isLargeTextScale(1.35)).toBe(false);
  });

  it('stacks from the threshold up, through the accessibility sizes', () => {
    expect(isLargeTextScale(LARGE_TEXT_SCALE)).toBe(true);
    expect(isLargeTextScale(1.9)).toBe(true);
    expect(isLargeTextScale(3.12)).toBe(true);
  });

  it('ignores a non-finite scale', () => {
    expect(isLargeTextScale(Number.NaN)).toBe(false);
  });
});
