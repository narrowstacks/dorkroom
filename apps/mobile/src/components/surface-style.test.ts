import { describe, expect, it } from 'vitest';
import {
  GROUP_CLASS,
  GROUP_SEPARATOR_CLASS,
  groupRowClassName,
} from './surface-style';

const classes = (value: string) => new Set(value.split(' '));

describe('groupRowClassName', () => {
  it('uses the same fill and outline colour as InsetGroup', () => {
    const group = classes(GROUP_CLASS);
    for (const index of [0, 1, 2]) {
      const row = classes(groupRowClassName(index, 3));
      for (const token of ['bg-surface-inset', 'border-edge']) {
        expect(group.has(token)).toBe(true);
        expect(row.has(token)).toBe(true);
      }
    }
  });

  it('draws the separator above every row but closes only the ends', () => {
    const separator = GROUP_SEPARATOR_CLASS.split(' ');
    const rows = [0, 1, 2].map((index) => classes(groupRowClassName(index, 3)));
    for (const row of rows) {
      for (const token of separator) expect(row.has(token)).toBe(true);
    }
    expect(rows.map((row) => row.has('rounded-t-2xl'))).toEqual([
      true,
      false,
      false,
    ]);
    expect(
      rows.map((row) => row.has('rounded-b-2xl') && row.has('border-b'))
    ).toEqual([false, false, true]);
  });

  it('rounds both ends of a one-row group', () => {
    const row = classes(groupRowClassName(0, 1));
    expect(row.has('rounded-t-2xl') && row.has('rounded-b-2xl')).toBe(true);
  });
});
