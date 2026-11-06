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
    setPinnedIds(['resize']);
    expect(getPinnedIds()).toEqual(['resize']);
  });

  it('keeps one pin of a stored pair from before Home took a tab slot', () => {
    setPinnedIds(['border', 'resize']);
    expect(getPinnedIds()).toEqual(['border']);
  });

  it('falls back to defaults when the saved set is empty', () => {
    setPinnedIds([]);
    expect(getPinnedIds()).toEqual(DEFAULT_PINNED_IDS.slice(0, MAX_PINNED));
  });

  it('drops a non-pinnable tool (film-log) from a stored set', () => {
    setPinnedIds(['film-log', 'border']);
    expect(getPinnedIds()).toEqual(DEFAULT_PINNED_IDS.slice(0, MAX_PINNED));
  });

  it('keeps pinned lens and camera-exposure tools now that both are implemented', () => {
    setPinnedIds(['lens']);
    expect(getPinnedIds()).toEqual(['lens']);
    setPinnedIds(['camera-exposure']);
    expect(getPinnedIds()).toEqual(['camera-exposure']);
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
    const ids = ['border'];
    expect(normalizePinnedIds(JSON.stringify(ids))).toEqual(ids);
  });

  it('returns defaults when value is malformed JSON', () => {
    expect(normalizePinnedIds('not json')).toEqual(
      DEFAULT_PINNED_IDS.slice(0, MAX_PINNED)
    );
  });

  it('drops unknown ids from a mixed array', () => {
    const raw = JSON.stringify(['unknown-tool', 'resize', 'border']);
    const result = normalizePinnedIds(raw);
    expect(result).toEqual(['resize']);
  });

  it('caps results at MAX_PINNED when more valid ids are provided', () => {
    const raw = JSON.stringify([
      'border',
      'resize',
      'meter',
      'exposure',
      'reciprocity',
    ]);
    expect(normalizePinnedIds(raw)).toEqual(['border']);
  });
});

describe('tab bar capacity', () => {
  it('leaves room for Home, Film Log, Recipes and More beside the pins', () => {
    // iOS shows 5 tabs before folding the rest into its own More.
    const PERMANENT_TABS = 4;
    expect(PERMANENT_TABS + MAX_PINNED).toBeLessThanOrEqual(5);
  });

  it('never pins Home, which is a permanent tab', () => {
    expect(normalizePinnedIds(JSON.stringify(['home', 'resize']))).toEqual([
      'resize',
    ]);
  });
});
