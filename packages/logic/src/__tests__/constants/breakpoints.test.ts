import { describe, expect, it } from 'vitest';
import {
  BREAKPOINTS,
  columnCountForWidth,
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

describe('columnCountForWidth', () => {
  it.each([
    [0, 1],
    [639, 1],
    [640, 2],
    [767, 2],
    [768, 2],
    [769, 2],
    [1023, 2],
    [1024, 3],
    [1279, 3],
    [1280, 4],
    [1920, 4],
  ])('desktop %ipx -> %i', (width, columns) => {
    expect(columnCountForWidth(width, false)).toBe(columns);
  });

  it.each([
    [320, 1],
    [479, 1],
    [480, 2],
    [481, 2],
    [767, 2],
    [768, 2],
  ])('mobile %ipx -> %i', (width, columns) => {
    expect(columnCountForWidth(width, true)).toBe(columns);
  });
});
