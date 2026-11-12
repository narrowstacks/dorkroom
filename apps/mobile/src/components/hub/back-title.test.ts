import { describe, expect, it } from 'vitest';
import { backTitleAfter } from './back-title';

const stack = {
  routes: [
    { key: 'a', name: 'index' },
    { key: 'b', name: 'recipes/recipe/[id]' },
    { key: 'c', name: 'recipes/timer' },
    { key: 'd', name: 'recipes/timer' },
  ],
};

describe('backTitleAfter', () => {
  it('titles the back button when opened from the named screen', () => {
    expect(backTitleAfter(stack, 'c', 'recipes/recipe/[id]', 'Recipe')).toBe(
      'Recipe'
    );
  });

  it('leaves the default after any other screen, and on the first', () => {
    expect(backTitleAfter(stack, 'd', 'recipes/recipe/[id]', 'Recipe')).toBe(
      undefined
    );
    expect(backTitleAfter(stack, 'a', 'recipes/recipe/[id]', 'Recipe')).toBe(
      undefined
    );
    expect(backTitleAfter(stack, 'zzz', 'index', 'Recipe')).toBe(undefined);
  });
});
