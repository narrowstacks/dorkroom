import { beforeEach, describe, expect, it } from 'vitest';
import {
  addRoll,
  storage as filmLogStorage,
  updateRoll,
} from './film-log-storage';
import {
  currentMeterRollId,
  METER_ROLL_KEY,
  pickMeterRoll,
} from './meter-roll';
import { meterStorage } from './meter-settings';

const rolls = [
  { id: 'done', status: 'finished' },
  { id: 'a', status: 'active' },
  { id: 'b', status: 'active' },
];

describe('pickMeterRoll', () => {
  it('is the stored roll while it is active', () => {
    expect(pickMeterRoll(rolls, 'b')?.id).toBe('b');
  });

  it('falls back to the first active roll', () => {
    expect(pickMeterRoll(rolls, undefined)?.id).toBe('a');
    expect(pickMeterRoll(rolls, 'gone')?.id).toBe('a');
    expect(pickMeterRoll(rolls, 'done')?.id).toBe('a');
  });

  it('is undefined with no active roll', () => {
    expect(pickMeterRoll([rolls[0]], 'done')).toBeUndefined();
    expect(pickMeterRoll([], undefined)).toBeUndefined();
  });
});

describe('currentMeterRollId', () => {
  beforeEach(() => {
    filmLogStorage.clearAll();
    meterStorage.clearAll();
  });

  const startRoll = () =>
    addRoll({
      cameraId: 'cam1',
      process: 'bw',
      status: 'active',
      startedAt: '2026-01-01T00:00:00.000Z',
    });

  it('reads the meter roll the same way the meter does', () => {
    expect(currentMeterRollId()).toBeUndefined();
    const first = startRoll();
    const second = startRoll();
    // addRoll puts the newest first.
    expect(currentMeterRollId()).toBe(second.id);
    meterStorage.set(METER_ROLL_KEY, first.id);
    expect(currentMeterRollId()).toBe(first.id);
    updateRoll(first.id, { status: 'finished' });
    expect(currentMeterRollId()).toBe(second.id);
  });
});
