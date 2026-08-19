import { beforeEach, describe, expect, it } from 'vitest';
import { combo } from '@/test/fixtures';
import { consumeTimerPrefill, setTimerPrefill } from './prefill';

describe('timer prefill hand-off', () => {
  // The store is a module singleton; drain it before each test for isolation.
  beforeEach(() => {
    consumeTimerPrefill();
  });

  it('returns null when nothing is queued', () => {
    expect(consumeTimerPrefill()).toBeNull();
  });

  it('hands off the queued combination exactly once (one-shot)', () => {
    const c = combo({ uuid: 'u-1' });
    setTimerPrefill(c);
    expect(consumeTimerPrefill()).toBe(c);
    expect(consumeTimerPrefill()).toBeNull();
  });

  it('keeps only the most recently queued combination', () => {
    setTimerPrefill(combo({ uuid: 'old' }));
    const latest = combo({ uuid: 'new' });
    setTimerPrefill(latest);
    expect(consumeTimerPrefill()).toBe(latest);
  });
});
