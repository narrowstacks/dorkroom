import { describe, expect, it } from 'vitest';
import {
  buttonClassName,
  buttonLabelClassName,
  type ButtonVariant,
} from './button-style';

const VARIANTS: ButtonVariant[] = [
  'commit',
  'secondary',
  'plain',
  'destructive',
];

describe('buttonClassName', () => {
  it.each(VARIANTS)('%s is at least 44pt tall', (variant) => {
    expect(buttonClassName(variant, false).split(' ')).toContain('min-h-11');
  });

  it.each(VARIANTS)(
    '%s dims when disabled and only presses when enabled',
    (variant) => {
      expect(buttonClassName(variant, true)).toContain('opacity-40');
      expect(buttonClassName(variant, true)).not.toContain('active:');
      expect(buttonClassName(variant, false)).toContain('active:opacity-70');
    }
  );

  it('fills secondary and destructive with the flat surface, never a raw white', () => {
    for (const variant of ['secondary', 'destructive'] as const) {
      expect(buttonClassName(variant, false)).toContain(
        'border-hw border-line bg-surface'
      );
    }
    for (const variant of ['commit', 'plain'] as const) {
      expect(buttonClassName(variant, false)).not.toContain('bg-');
    }
    for (const variant of VARIANTS) {
      expect(buttonClassName(variant, false)).not.toMatch(/bg-white|bg-rose/);
    }
  });

  it('appends layout classes', () => {
    expect(buttonClassName('secondary', false, 'flex-1')).toMatch(/ flex-1$/);
  });
});

describe('buttonLabelClassName', () => {
  it('colours destructive rose and secondary white; the others come from a style', () => {
    expect(buttonLabelClassName('destructive')).toContain('text-rose-400');
    expect(buttonLabelClassName('secondary')).toContain('text-white');
    expect(buttonLabelClassName('commit')).not.toMatch(/text-(white|rose)/);
    expect(buttonLabelClassName('plain')).not.toMatch(/text-(white|rose)/);
  });
});
