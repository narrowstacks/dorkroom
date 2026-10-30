// src/lib/tab-bar-settings.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getPinnedIds,
  MAX_PINNED,
  normalizePinnedIds,
  setPinnedIds,
  storage,
} from './tab-bar-settings';
import { DEFAULT_PINNED_IDS } from './tools';

describe('tab-bar-settings', () => {
  beforeEach(() => storage.clearAll());

  it('returns the defaults when unset', () => {
    expect(getPinnedIds()).toEqual(DEFAULT_PINNED_IDS.slice(0, MAX_PINNED));
  });

  it('round-trips a saved set', () => {
    setPinnedIds(['border', 'resize']);
    expect(getPinnedIds()).toEqual(['border', 'resize']);
  });

  it('falls back to defaults when the saved set is empty', () => {
    setPinnedIds([]);
    expect(getPinnedIds()).toEqual(DEFAULT_PINNED_IDS.slice(0, MAX_PINNED));
  });

  it('drops a non-pinnable tool (film-log) from a stored set', () => {
    setPinnedIds(['film-log', 'border']);
    const result = getPinnedIds();
    expect(result).not.toContain('film-log');
    expect(result).toContain('border');
  });

  it('keeps pinned lens and camera-exposure tools now that both are implemented', () => {
    setPinnedIds(['lens', 'camera-exposure']);
    expect(getPinnedIds()).toEqual(['lens', 'camera-exposure']);
  });

  it('falls back to defaults when the stored set is only non-pinnable ids', () => {
    setPinnedIds(['film-log', 'recipes']);
    expect(getPinnedIds()).toEqual(DEFAULT_PINNED_IDS.slice(0, MAX_PINNED));
  });
});

describe('normalizePinnedIds', () => {
  it('returns defaults when value is undefined', () => {
    expect(normalizePinnedIds(undefined)).toEqual(
      DEFAULT_PINNED_IDS.slice(0, MAX_PINNED)
    );
  });

  it('returns valid ids from a well-formed JSON array', () => {
    const ids = ['border', 'resize'];
    expect(normalizePinnedIds(JSON.stringify(ids))).toEqual(ids);
  });

  it('returns defaults when value is malformed JSON', () => {
    expect(normalizePinnedIds('not json')).toEqual(
      DEFAULT_PINNED_IDS.slice(0, MAX_PINNED)
    );
  });

  it('drops unknown ids from a mixed array', () => {
    const raw = JSON.stringify(['border', 'unknown-tool', 'resize']);
    const result = normalizePinnedIds(raw);
    expect(result).toContain('border');
    expect(result).toContain('resize');
    expect(result).not.toContain('unknown-tool');
  });

  it('caps results at MAX_PINNED when more valid ids are provided', () => {
    const raw = JSON.stringify([
      'border',
      'resize',
      'meter',
      'exposure',
      'reciprocity',
    ]);
    expect(normalizePinnedIds(raw)).toEqual(['border', 'resize']);
  });
});
