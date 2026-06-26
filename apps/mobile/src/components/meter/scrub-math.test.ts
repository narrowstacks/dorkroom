import { describe, expect, it } from 'vitest';
import { SCRUB_COL_WIDTH, SCRUB_GAP, scrubLandingIndex } from './scrub-math';

const COL = SCRUB_COL_WIDTH;
const LEN = 8;

describe('scrubLandingIndex', () => {
  it('stays on the base index with no drag', () => {
    expect(scrubLandingIndex(3, 0, LEN, 1)).toBe(3);
  });

  it('advances one stop per column (dir +1: ISO)', () => {
    expect(scrubLandingIndex(3, COL, LEN, 1)).toBe(4);
    expect(scrubLandingIndex(3, -COL, LEN, 1)).toBe(2);
  });

  it('reverses for dir −1 (aperture/shutter): positive drag lowers the index', () => {
    expect(scrubLandingIndex(3, COL, LEN, -1)).toBe(2);
    expect(scrubLandingIndex(3, -COL, LEN, -1)).toBe(4);
  });

  it('returns to the start after a full cycle (incl. the gap)', () => {
    expect(scrubLandingIndex(0, LEN * COL + SCRUB_GAP, LEN, 1)).toBe(0);
  });

  it('wraps forward off the end through the gap', () => {
    // From the last index, dragging one stop + the gap lands on the next
    // cycle's first value (index === len, taken mod len by the caller).
    expect(scrubLandingIndex(LEN - 1, COL + SCRUB_GAP, LEN, 1) % LEN).toBe(0);
  });

  it('wraps backward off the start to the last value', () => {
    expect(scrubLandingIndex(0, -(COL + SCRUB_GAP), LEN, 1)).toBe(LEN - 1);
  });
});
