import { describe, expect, it } from 'vitest';
import type { TimerStage } from '@/lib/timer/types';
import {
  formatClock,
  formatDuration,
  formatTemp,
  stageDisplayName,
  stageKindLabel,
} from './format';

describe('formatClock', () => {
  it('formats whole minutes and seconds as M:SS', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('rounds fractional seconds up so it lands on 0:00 only at the end', () => {
    expect(formatClock(0.1)).toBe('0:01');
    expect(formatClock(59.4)).toBe('1:00');
    expect(formatClock(60.0)).toBe('1:00');
  });

  it('allows unbounded minutes', () => {
    expect(formatClock(7200)).toBe('120:00');
  });

  it('clamps negative and non-finite input to 0:00', () => {
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('rounds to the nearest whole second', () => {
    expect(formatDuration(420)).toBe('7:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(59.6)).toBe('1:00');
  });

  it('clamps bad input to 0:00', () => {
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('formatTemp', () => {
  it('shows both scales for a finite temperature', () => {
    expect(formatTemp(68)).toBe('68°F · 20°C');
    expect(formatTemp(75)).toBe('75°F · 24°C');
  });

  it('returns null when there is no process temperature', () => {
    expect(formatTemp(null)).toBeNull();
    expect(formatTemp(Number.NaN)).toBeNull();
  });
});

describe('stageKindLabel', () => {
  it('maps each kind to a label', () => {
    expect(stageKindLabel('dev')).toBe('Develop');
    expect(stageKindLabel('wash')).toBe('Wash');
    expect(stageKindLabel('custom')).toBe('Custom');
  });
});

describe('stageDisplayName', () => {
  const base: TimerStage = {
    id: 'x',
    kind: 'custom',
    name: '',
    durationSeconds: 0,
    temperatureF: null,
    agitation: null,
    agitationPattern: null,
  };

  it('uses the stage name when present', () => {
    expect(stageDisplayName({ ...base, name: 'Pre-soak' })).toBe('Pre-soak');
  });

  it('falls back to the kind label when the name is blank', () => {
    expect(stageDisplayName({ ...base, name: '   ', kind: 'fix' })).toBe('Fix');
  });
});
