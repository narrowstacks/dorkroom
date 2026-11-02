import { describe, expect, it } from 'vitest';
import {
  routerPreloadOptions,
  routerPreloadOptionsFor,
} from '../router-preload-options';

describe('routerPreloadOptionsFor', () => {
  it('keeps intent preloading in a modern browser', () => {
    expect(routerPreloadOptionsFor(false)).toEqual(routerPreloadOptions);
    expect(routerPreloadOptionsFor(false).defaultPreload).toBe('intent');
  });

  it('turns preloading off in a legacy browser, keeping the other options (#636)', () => {
    expect(routerPreloadOptionsFor(true)).toEqual({
      ...routerPreloadOptions,
      defaultPreload: false,
    });
  });
});
