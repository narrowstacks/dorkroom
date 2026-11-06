import { describe, expect, it } from 'vitest';
import {
  BREAKPOINTS,
  isAtLeastBreakpoint,
  isMobileWidth,
  MOBILE_MAX_WIDTH,
} from '../../constants/breakpoints';

describe('BREAKPOINTS', () => {
  it('matches the Tailwind CSS 4 defaults', () => {
    expect(BREAKPOINTS).toEqual({
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    });
  });
});

describe('isMobileWidth', () => {
  it('treats 768px and below as mobile', () => {
    expect(MOBILE_MAX_WIDTH).toBe(768);
    expect(isMobileWidth(320)).toBe(true);
    expect(isMobileWidth(767)).toBe(true);
    expect(isMobileWidth(768)).toBe(true);
    expect(isMobileWidth(769)).toBe(false);
  });
});

describe('isAtLeastBreakpoint', () => {
  it.each([
    ['sm', 639, false],
    ['sm', 640, true],
    ['md', 767, false],
    ['md', 768, true],
    ['md', 769, true],
    ['lg', 1023, false],
    ['lg', 1024, true],
    ['xl', 1279, false],
    ['xl', 1280, true],
  ] as const)('%s at %ipx -> %s', (name, width, expected) => {
    expect(isAtLeastBreakpoint(width, name)).toBe(expected);
  });
});
