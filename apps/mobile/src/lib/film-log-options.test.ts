import { describe, expect, it } from 'vitest';
import type { Shot } from '@/schemas/film-log.schema';
import {
  frameCountLabel,
  lastUsedLensId,
  lastUsedPlace,
  nextFrameNumber,
  ROLL_STATUS_OPTIONS,
  rollLabel,
  rollStatusLabel,
  rollSubtitle,
} from './film-log-options';

const shot = (frameNumber: number, lensId?: string, place?: string): Shot => ({
  id: `s${frameNumber}`,
  frameNumber,
  source: 'manual',
  lensId,
  place,
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

describe('frameCountLabel', () => {
  it('pluralises', () => {
    expect(frameCountLabel(1)).toBe('1 frame');
    expect(frameCountLabel(0)).toBe('0 frames');
    expect(frameCountLabel(24)).toBe('24 frames');
  });
});

describe('rollSubtitle', () => {
  it('names the film only when the label is a roll name', () => {
    expect(
      rollSubtitle({ name: 'Iceland', filmStockName: 'HP5+', shots: [shot(1)] })
    ).toBe('HP5+ · 1 frame');
    expect(
      rollSubtitle({ name: undefined, filmStockName: 'HP5+', shots: [] })
    ).toBe('0 frames');
  });
});

describe('lastUsedPlace', () => {
  it('returns undefined for no shots or no recorded place', () => {
    expect(lastUsedPlace([])).toBeUndefined();
    expect(lastUsedPlace([shot(1), shot(2)])).toBeUndefined();
  });

  it('returns the place of the most recent shot that has one', () => {
    expect(
      lastUsedPlace([
        shot(1, undefined, 'Harbor'),
        shot(2, undefined, 'Market'),
        shot(3),
      ])
    ).toBe('Market');
  });

  it('trims and skips a blank place', () => {
    expect(
      lastUsedPlace([
        shot(1, undefined, 'Harbor'),
        shot(2, undefined, '   '),
        shot(3, undefined, ''),
      ])
    ).toBe('Harbor');
    expect(lastUsedPlace([shot(1, undefined, '  Pier 4 ')])).toBe('Pier 4');
  });
});

describe('nextFrameNumber', () => {
  it('is 1 for an empty roll', () => {
    expect(nextFrameNumber([])).toBe(1);
  });

  it('is one past the highest frame, not the count', () => {
    expect(nextFrameNumber([shot(1), shot(2), shot(3)])).toBe(4);
    expect(nextFrameNumber([shot(7), shot(2)])).toBe(8);
  });
});

describe('roll status words', () => {
  it('names the stored statuses by the phase they stand for', () => {
    expect(rollStatusLabel('active')).toBe('In camera');
    expect(rollStatusLabel('finished')).toBe('Shot');
    expect(rollStatusLabel('developed')).toBe('Developed');
  });

  it('keeps the stored values (no new enum value)', () => {
    expect(ROLL_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'active',
      'finished',
      'developed',
    ]);
  });
});
