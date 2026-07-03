import type { Combination } from '@dorkroom/api';
import { beforeEach, describe, expect, it } from 'vitest';
import { consumeTimerPrefill, setTimerPrefill } from './prefill';

const combo = (uuid: string): Combination => ({ uuid }) as Combination;

describe('timer prefill hand-off', () => {
  // The store is a module singleton; drain it before each test for isolation.
  beforeEach(() => {
    consumeTimerPrefill();
  });

  it('returns null when nothing is queued', () => {
    expect(consumeTimerPrefill()).toBeNull();
  });

  it('hands off the queued combination exactly once (one-shot)', () => {
    const c = combo('u-1');
    setTimerPrefill(c);
    expect(consumeTimerPrefill()).toBe(c);
    expect(consumeTimerPrefill()).toBeNull();
  });

  it('keeps only the most recently queued combination', () => {
    setTimerPrefill(combo('old'));
    const latest = combo('new');
    setTimerPrefill(latest);
    expect(consumeTimerPrefill()).toBe(latest);
  });
});
