import { describe, expect, it } from 'vitest';
import type { Shot } from '@/schemas/film-log.schema';
import {
  lastUsedLensId,
  rollLabel,
  rollSubtitle,
  shotCountLabel,
} from './film-log-options';

const shot = (frameNumber: number, lensId?: string): Shot => ({
  id: `s${frameNumber}`,
  frameNumber,
  source: 'manual',
  lensId,
});

describe('lastUsedLensId', () => {
  it('returns undefined for no shots', () => {
    expect(lastUsedLensId([])).toBeUndefined();
  });

  it('returns undefined when no shot recorded a lens', () => {
    expect(lastUsedLensId([shot(1), shot(2)])).toBeUndefined();
  });

  it('returns the lens of the most recent shot that has one', () => {
    // Frame 3 has no lens, so the last recorded lens is frame 2's.
    expect(lastUsedLensId([shot(1, 'a'), shot(2, 'b'), shot(3)])).toBe('b');
  });
});

describe('rollLabel', () => {
  const roll = { name: undefined, filmStockName: undefined };

  it('prefers the roll name, then the film, then a generic label', () => {
    expect(rollLabel({ ...roll, name: 'Iceland' })).toBe('Iceland');
    expect(rollLabel({ ...roll, filmStockName: 'HP5+' })).toBe('HP5+');
    expect(rollLabel({ ...roll, name: '  ', filmStockName: 'HP5+' })).toBe(
      'HP5+'
    );
    expect(rollLabel(roll)).toBe('Roll');
  });
});

describe('shotCountLabel', () => {
  it('pluralises', () => {
    expect(shotCountLabel(1)).toBe('1 shot');
    expect(shotCountLabel(0)).toBe('0 shots');
    expect(shotCountLabel(24)).toBe('24 shots');
  });
});

describe('rollSubtitle', () => {
  it('names the film only when the label is a roll name', () => {
    expect(
      rollSubtitle({ name: 'Iceland', filmStockName: 'HP5+', shots: [shot(1)] })
    ).toBe('HP5+ · 1 shot');
    expect(
      rollSubtitle({ name: undefined, filmStockName: 'HP5+', shots: [] })
    ).toBe('0 shots');
  });
});
