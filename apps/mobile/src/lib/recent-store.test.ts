import { afterEach, describe, expect, it } from 'vitest';
import {
  getRecentRecipeIds,
  getRecipeHistoryIds,
  getRecipeHistoryRaw,
  MAX_RECENT_RECIPES,
  MAX_RECIPE_HISTORY,
  recordRecipeOpen,
  subscribeRecipeHistory,
} from './recent-store';

// The store is the library's in-memory MMKV under vitest, shared per module.
const openAll = (count: number) => {
  for (let i = 0; i < count; i += 1) recordRecipeOpen(`r${i}`);
};

describe('recent recipes', () => {
  afterEach(() => {
    // Push everything from this test out of the capped history.
    for (let i = 0; i < MAX_RECIPE_HISTORY; i += 1) recordRecipeOpen(`z${i}`);
  });

  it('keeps a longer history than Home shows, newest first', () => {
    openAll(MAX_RECIPE_HISTORY + 5);
    const history = getRecipeHistoryIds();
    expect(history).toHaveLength(MAX_RECIPE_HISTORY);
    expect(history[0]).toBe(`r${MAX_RECIPE_HISTORY + 4}`);
    expect(getRecentRecipeIds()).toEqual(history.slice(0, MAX_RECENT_RECIPES));
  });

  it('moves a reopened recipe to the front without a duplicate', () => {
    openAll(4);
    recordRecipeOpen('r1');
    expect(getRecipeHistoryIds().slice(0, 4)).toEqual(['r1', 'r3', 'r2', 'r0']);
  });

  it('tells subscribers when the history changes', () => {
    let calls = 0;
    const unsubscribe = subscribeRecipeHistory(() => {
      calls += 1;
    });
    recordRecipeOpen('x');
    expect(calls).toBe(1);
    expect(getRecipeHistoryRaw()).toContain('"x"');
    unsubscribe();
    recordRecipeOpen('y');
    expect(calls).toBe(1);
  });
});
