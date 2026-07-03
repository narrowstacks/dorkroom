import { describe, expect, it } from 'vitest';
import type { TimerStage } from '@/lib/timer/types';
import {
  appendStage,
  durationFromParts,
  durationToParts,
  moveStage,
  removeStageAt,
  updateStageAt,
} from './stage-edits';

function stage(id: string, name = id): TimerStage {
  return {
    id,
    kind: 'custom',
    name,
    durationSeconds: 60,
    temperatureF: null,
    agitation: null,
    agitationPattern: null,
  };
}

const base = [stage('a'), stage('b'), stage('c')];

describe('updateStageAt', () => {
  it('patches the targeted stage immutably', () => {
    const next = updateStageAt(base, 1, { name: 'patched' });
    expect(next[1].name).toBe('patched');
    expect(next).not.toBe(base);
    expect(base[1].name).toBe('b');
  });

  it('is a no-op for an out-of-range index', () => {
    expect(updateStageAt(base, 5, { name: 'x' })).toBe(base);
    expect(updateStageAt(base, -1, { name: 'x' })).toBe(base);
  });
});

describe('removeStageAt', () => {
  it('removes the targeted stage', () => {
    expect(removeStageAt(base, 1).map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('is a no-op for an out-of-range index', () => {
    expect(removeStageAt(base, 9)).toBe(base);
  });
});

describe('moveStage', () => {
  it('moves a stage up', () => {
    expect(moveStage(base, 2, -1).map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('moves a stage down', () => {
    expect(moveStage(base, 0, 1).map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('is a no-op at the edges', () => {
    expect(moveStage(base, 0, -1)).toBe(base);
    expect(moveStage(base, 2, 1)).toBe(base);
  });
});

describe('appendStage', () => {
  it('appends a stage with a unique id', () => {
    const next = appendStage(base);
    expect(next).toHaveLength(4);
    const ids = next.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('durationFromParts / durationToParts', () => {
  it('combines minutes and seconds', () => {
    expect(durationFromParts(7, 0)).toBe(420);
    expect(durationFromParts(1, 30)).toBe(90);
  });

  it('clamps negatives to zero', () => {
    expect(durationFromParts(-1, -5)).toBe(0);
  });

  it('splits seconds back into parts', () => {
    expect(durationToParts(420)).toEqual({ minutes: 7, seconds: 0 });
    expect(durationToParts(95)).toEqual({ minutes: 1, seconds: 35 });
    expect(durationToParts(-10)).toEqual({ minutes: 0, seconds: 0 });
  });

  it('round-trips', () => {
    const { minutes, seconds } = durationToParts(275);
    expect(durationFromParts(minutes, seconds)).toBe(275);
  });
});
