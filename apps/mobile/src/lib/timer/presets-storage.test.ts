import { beforeEach, describe, expect, it } from 'vitest';
import { getQuarantined } from '@/lib/stored-collection';
import { DEFAULT_BW_PRESET } from './presets';
import { addPreset, getUserPresets, KEYS, storage } from './presets-storage';

describe('timer preset storage', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('keeps valid presets and quarantines an invalid one on write (#532)', () => {
    const good = { ...DEFAULT_BW_PRESET, id: 'good' };
    const bad = { ...DEFAULT_BW_PRESET, id: 'bad', stages: 'none' };
    storage.set(KEYS.presets, JSON.stringify([good, bad]));
    expect(getUserPresets().map((p) => p.id)).toEqual(['good']);
    const created = addPreset('Rodinal', []);
    expect(getUserPresets().map((p) => p.id)).toEqual([created.id, 'good']);
    expect(getQuarantined(storage, KEYS.presets)).toEqual([
      JSON.stringify(bad),
    ]);
  });
});
