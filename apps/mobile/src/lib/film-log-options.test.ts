import { describe, expect, it } from 'vitest';
import type { Shot } from '@/types/film-log';
import { lastUsedLensId } from './film-log-options';

const shot = (frameNumber: number, lensId?: string): Shot => ({
  id: `s${frameNumber}`,
  frameNumber,
  source: 'manual',
  lensId,
});

describe('lastUsedLensId', () => {
  it('returns undefined for no shots', () => {
    expect(lastUsedLensId([])).toBeUndefined();
  });

  it('returns undefined when no shot recorded a lens', () => {
    expect(lastUsedLensId([shot(1), shot(2)])).toBeUndefined();
  });

  it('returns the lens of the most recent shot that has one', () => {
    // Frame 3 has no lens, so the last recorded lens is frame 2's.
    expect(lastUsedLensId([shot(1, 'a'), shot(2, 'b'), shot(3)])).toBe('b');
  });
});
