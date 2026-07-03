import { describe, expect, it } from 'vitest';
import type { AgitationPattern } from './agitation';
import {
  AGITATION_PRESETS,
  agitationLabel,
  agitationStateAt,
  agitationSummary,
  agitationWindows,
  patternFromRecipe,
} from './agitation';

const pattern = (
  id: AgitationPattern['id'],
  overrides: Partial<AgitationPattern['params']> = {}
): AgitationPattern => ({
  id,
  params:
    id === 'custom'
      ? {
          initialSeconds: 0,
          agitateSeconds: 0,
          intervalSeconds: 0,
          ...overrides,
        }
      : { ...AGITATION_PRESETS[id], ...overrides },
});

describe('agitationWindows', () => {
  it('builds the Ilford schedule for a 480s stage', () => {
    expect(agitationWindows(pattern('ilford'), 480)).toEqual([
      { startSeconds: 0, endSeconds: 30 },
      { startSeconds: 60, endSeconds: 70 },
      { startSeconds: 120, endSeconds: 130 },
      { startSeconds: 180, endSeconds: 190 },
      { startSeconds: 240, endSeconds: 250 },
      { startSeconds: 300, endSeconds: 310 },
      { startSeconds: 360, endSeconds: 370 },
      { startSeconds: 420, endSeconds: 430 },
    ]);
  });

  it('clamps a short Ilford stage to just the initial window', () => {
    expect(agitationWindows(pattern('ilford'), 45)).toEqual([
      { startSeconds: 0, endSeconds: 30 },
    ]);
  });

  it('builds the Kodak schedule for a 120s stage', () => {
    expect(agitationWindows(pattern('kodak'), 120)).toEqual([
      { startSeconds: 0, endSeconds: 5 },
      { startSeconds: 30, endSeconds: 35 },
      { startSeconds: 60, endSeconds: 65 },
      { startSeconds: 90, endSeconds: 95 },
    ]);
  });

  it('builds two Stand windows for a long stage', () => {
    expect(agitationWindows(pattern('stand'), 3600)).toEqual([
      { startSeconds: 0, endSeconds: 10 },
      { startSeconds: 3590, endSeconds: 3600 },
    ]);
  });

  it('merges/clamps overlapping Stand windows on a short stage', () => {
    const windows = agitationWindows(pattern('stand'), 15);
    // No overlap and sorted ascending.
    for (let i = 1; i < windows.length; i += 1) {
      expect(windows[i].startSeconds).toBeGreaterThanOrEqual(
        windows[i - 1].endSeconds
      );
    }
    for (const w of windows) {
      expect(w.startSeconds).toBeGreaterThanOrEqual(0);
      expect(w.endSeconds).toBeLessThanOrEqual(15);
      expect(w.endSeconds).toBeGreaterThan(w.startSeconds);
    }
  });

  it('builds three Semi-stand windows (start, halfway, end)', () => {
    expect(agitationWindows(pattern('semi-stand'), 1800)).toEqual([
      { startSeconds: 0, endSeconds: 10 },
      { startSeconds: 900, endSeconds: 910 },
      { startSeconds: 1790, endSeconds: 1800 },
    ]);
  });

  it('covers the whole stage for Continuous', () => {
    expect(agitationWindows(pattern('continuous'), 60)).toEqual([
      { startSeconds: 0, endSeconds: 60 },
    ]);
  });

  it('has no windows for None', () => {
    expect(agitationWindows(pattern('none'), 300)).toEqual([]);
  });

  it('has no windows for any pattern at a zero or negative duration', () => {
    const ids: AgitationPattern['id'][] = [
      'ilford',
      'kodak',
      'stand',
      'semi-stand',
      'continuous',
      'none',
      'custom',
    ];
    for (const id of ids) {
      expect(agitationWindows(pattern(id), 0)).toEqual([]);
      expect(agitationWindows(pattern(id), -10)).toEqual([]);
    }
  });

  it('builds a custom schedule from its params', () => {
    const custom = pattern('custom', {
      initialSeconds: 20,
      agitateSeconds: 5,
      intervalSeconds: 45,
    });
    expect(agitationWindows(custom, 200)).toEqual([
      { startSeconds: 0, endSeconds: 20 },
      { startSeconds: 45, endSeconds: 50 },
      { startSeconds: 90, endSeconds: 95 },
      { startSeconds: 135, endSeconds: 140 },
      { startSeconds: 180, endSeconds: 185 },
    ]);
  });
});

describe('agitationStateAt', () => {
  const windows = agitationWindows(pattern('ilford'), 480);

  it('reports agitating inside a window, with the correct remaining time', () => {
    const state = agitationStateAt(windows, 65);
    expect(state.agitating).toBe(true);
    expect(state.windowRemainingSeconds).toBe(5); // window [60,70), 65 elapsed
  });

  it('reports the time until the next window between windows', () => {
    const state = agitationStateAt(windows, 40);
    expect(state.agitating).toBe(false);
    expect(state.nextWindowInSeconds).toBe(20); // next window starts at 60
  });

  it('reports no next window once the schedule is exhausted', () => {
    const state = agitationStateAt(windows, 450);
    expect(state.agitating).toBe(false);
    expect(state.nextWindowInSeconds).toBeNull();
  });

  it('never agitates and has no next window for an empty schedule', () => {
    const state = agitationStateAt([], 100);
    expect(state.agitating).toBe(false);
    expect(state.windowRemainingSeconds).toBe(0);
    expect(state.nextWindowInSeconds).toBeNull();
  });
});

describe('agitationLabel', () => {
  it('maps each pattern id to a display label', () => {
    expect(agitationLabel('ilford')).toBe('Ilford');
    expect(agitationLabel('kodak')).toBe('Kodak');
    expect(agitationLabel('stand')).toBe('Stand');
    expect(agitationLabel('semi-stand')).toBe('Semi-stand');
    expect(agitationLabel('continuous')).toBe('Continuous');
    expect(agitationLabel('none')).toBe('None');
    expect(agitationLabel('custom')).toBe('Custom');
  });
});

describe('agitationSummary', () => {
  it('describes each built-in schedule', () => {
    expect(agitationSummary(pattern('ilford'))).toBe(
      'First 30s, then 10s every minute'
    );
    expect(agitationSummary(pattern('kodak'))).toBe('5s every 30s');
    expect(agitationSummary(pattern('stand'))).toBe(
      'Once at start, once at end'
    );
    expect(agitationSummary(pattern('semi-stand'))).toBe('Start, halfway, end');
    expect(agitationSummary(pattern('continuous'))).toBe('Continuous');
    expect(agitationSummary(pattern('none'))).toBe('No agitation');
  });

  it('generates a summary for a custom schedule from its params', () => {
    const custom = pattern('custom', {
      initialSeconds: 20,
      agitateSeconds: 5,
      intervalSeconds: 45,
    });
    expect(agitationSummary(custom)).toBe('First 20s, then 5s every 45s');
  });
});

describe('patternFromRecipe', () => {
  it('maps the stand agitation method regardless of tags', () => {
    expect(patternFromRecipe('stand', []).id).toBe('stand');
  });

  it('maps intermittent to the Ilford cadence', () => {
    expect(patternFromRecipe('intermittent', ['official-kodak']).id).toBe(
      'ilford'
    );
  });

  it('falls back to the source tag when there is no agitation method', () => {
    expect(patternFromRecipe('', ['official-kodak']).id).toBe('kodak');
  });

  it('defaults to Ilford for a source tag with no explicit mapping', () => {
    expect(patternFromRecipe('', ['official-cinestill']).id).toBe('ilford');
  });

  it('is case-insensitive for both the method and the tags', () => {
    expect(patternFromRecipe('STAND', []).id).toBe('stand');
    expect(patternFromRecipe('', ['OFFICIAL-KODAK']).id).toBe('kodak');
  });
});
