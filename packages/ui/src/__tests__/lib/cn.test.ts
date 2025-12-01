import { describe, expect, it } from 'vitest';
import { cn } from '../../lib/cn';

describe('cn utility', () => {
  it('merges classes correctly', () => {
    expect(cn('base', 'additional')).toBe('base additional');
  });

  it('handles conditional classes with clsx', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('merges conflicting Tailwind classes with tailwind-merge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-600')).toBe('text-blue-600');
  });

  it('handles complex class combinations', () => {
    const result = cn('bg-red-500 px-2', 'bg-blue-500 py-3', {
      'text-white': true,
      hidden: false,
    });
    expect(result).toBe('px-2 bg-blue-500 py-3 text-white');
  });

  it('handles empty or undefined inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(undefined)).toBe('');
    expect(cn(null)).toBe('');
  });

  it('filters out falsy values', () => {
    const shouldShow = false;
    expect(cn('base', shouldShow && 'hidden', 'visible')).toBe('base visible');
  });
});
