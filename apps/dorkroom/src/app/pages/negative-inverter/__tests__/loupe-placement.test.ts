import { describe, expect, it } from 'vitest';
import { LOUPE_GAP, LOUPE_SIZE, loupeBelow } from '../loupe-placement';

const NEEDED = LOUPE_SIZE + LOUPE_GAP;

describe('loupeBelow', () => {
  it('floats above a point with room in the frame and the viewport', () => {
    expect(loupeBelow({ yInFrame: NEEDED + 10, clientY: 500 })).toBe(false);
  });

  it('drops below near the top of the photo, wherever the page is scrolled', () => {
    // The top rebate of a strip: the photo sits mid-screen, so the viewport
    // has room, but the card around the photo would clip the loupe.
    expect(loupeBelow({ yInFrame: 20, clientY: 420 })).toBe(true);
    expect(loupeBelow({ yInFrame: NEEDED - 1, clientY: 800 })).toBe(true);
  });

  it('drops below near the top of the viewport', () => {
    expect(loupeBelow({ yInFrame: 400, clientY: 60 })).toBe(true);
  });
});
