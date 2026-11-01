import { describe, expect, it } from 'vitest';
import {
  type BufferOrientation,
  bufferToOutputMatrix,
  downscaleSteps,
  fitWithin,
  livePointToPhoto,
  uprightSize,
} from './live-geometry';

/** Apply a row-major 3x3 affine matrix to a point. */
function apply(m: number[], x: number, y: number) {
  return { x: m[0] * x + m[1] * y + m[2], y: m[3] * x + m[4] * y + m[5] };
}

// The back camera's buffer is landscape; the phone is held upright.
const buffer = { width: 1440, height: 1080 };

describe('uprightSize', () => {
  it('swaps the sides for a quarter turn only', () => {
    expect(uprightSize(buffer, 'right')).toEqual({ width: 1080, height: 1440 });
    expect(uprightSize(buffer, 'left')).toEqual({ width: 1080, height: 1440 });
    expect(uprightSize(buffer, 'up')).toEqual(buffer);
    expect(uprightSize(buffer, 'down')).toEqual(buffer);
  });
});

describe('fitWithin', () => {
  it('scales the long edge down and keeps the aspect ratio', () => {
    expect(fitWithin({ width: 1080, height: 1440 }, 1024)).toEqual({
      width: 768,
      height: 1024,
    });
  });

  it('never scales up', () => {
    expect(fitWithin({ width: 300, height: 400 }, 1024)).toEqual({
      width: 300,
      height: 400,
    });
  });
});

describe('downscaleSteps', () => {
  it('halves, then makes one last short step', () => {
    expect(downscaleSteps({ width: 768, height: 1024 }, 320)).toEqual([
      { width: 384, height: 512 },
      { width: 240, height: 320 },
    ]);
  });

  it('halves all the way when the target is a power of two below', () => {
    expect(downscaleSteps({ width: 1280, height: 960 }, 320)).toEqual([
      { width: 640, height: 480 },
      { width: 320, height: 240 },
    ]);
  });

  it('has nothing to do when already small enough', () => {
    expect(downscaleSteps({ width: 300, height: 200 }, 320)).toEqual([]);
  });
});

describe('bufferToOutputMatrix', () => {
  // Where each buffer corner must land in an upright image of the same scale.
  // For 'right' the pixels are turned 90° clockwise, so the buffer's top-right
  // corner is the upright image's top-left.
  const cases: [BufferOrientation, Record<string, [number, number]>][] = [
    ['up', { tl: [0, 0], tr: [1440, 0], bl: [0, 1080], br: [1440, 1080] }],
    ['right', { tl: [0, 1440], tr: [0, 0], bl: [1080, 1440], br: [1080, 0] }],
    ['left', { tl: [1080, 0], tr: [1080, 1440], bl: [0, 0], br: [0, 1440] }],
    ['down', { tl: [1440, 1080], tr: [0, 1080], bl: [1440, 0], br: [0, 0] }],
  ];
  const corners = {
    tl: [0, 0],
    tr: [1440, 0],
    bl: [0, 1080],
    br: [1440, 1080],
  } satisfies Record<string, [number, number]>;

  for (const [orientation, expected] of cases) {
    it(`turns a '${orientation}' buffer upright`, () => {
      const out = uprightSize(buffer, orientation);
      const m = bufferToOutputMatrix(buffer, orientation, false, out);
      for (const [corner, [x, y]] of Object.entries(corners)) {
        const p = apply(m, x, y);
        expect(p.x).toBeCloseTo(expected[corner][0], 9);
        expect(p.y).toBeCloseTo(expected[corner][1], 9);
      }
    });
  }

  it('fills the output exactly, whatever its scale', () => {
    const out = { width: 768, height: 1024 };
    const m = bufferToOutputMatrix(buffer, 'right', false, out);
    const xs = Object.values(corners).map(([x, y]) => apply(m, x, y));
    expect(Math.min(...xs.map((p) => p.x))).toBeCloseTo(0, 9);
    expect(Math.max(...xs.map((p) => p.x))).toBeCloseTo(768, 9);
    expect(Math.min(...xs.map((p) => p.y))).toBeCloseTo(0, 9);
    expect(Math.max(...xs.map((p) => p.y))).toBeCloseTo(1024, 9);
  });

  it('mirrors after turning upright', () => {
    const out = uprightSize(buffer, 'right');
    const plain = bufferToOutputMatrix(buffer, 'right', false, out);
    const mirrored = bufferToOutputMatrix(buffer, 'right', true, out);
    const a = apply(plain, 200, 300);
    const b = apply(mirrored, 200, 300);
    expect(b.x).toBeCloseTo(out.width - a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
  });

  it('is a plain matrix with no perspective', () => {
    const m = bufferToOutputMatrix(buffer, 'left', true, buffer);
    expect(m).toHaveLength(9);
    expect(m.slice(6)).toEqual([0, 0, 1]);
  });
});

describe('live to photo', () => {
  const live = { width: 768, height: 1024 };

  it('scales between images of the same aspect ratio', () => {
    const photo = { width: 6048, height: 8064 };
    const p = livePointToPhoto({ x: 384, y: 256 }, live, photo);
    expect(p.x).toBeCloseTo(3024, 6);
    expect(p.y).toBeCloseTo(2016, 6);
  });

  it('treats a narrower live image as a centred crop of the photo', () => {
    // A 9:16 stream from a 3:4 photo: same height, narrower.
    const narrow = { width: 576, height: 1024 };
    const photo = { width: 3024, height: 4032 };
    const shownWidth = (576 / 1024) * 4032;
    const left = (3024 - shownWidth) / 2;
    const p = livePointToPhoto({ x: 0, y: 512 }, narrow, photo);
    expect(p.x).toBeCloseTo(left, 6);
    expect(p.y).toBeCloseTo(2016, 6);
  });

  it('keeps points inside the photo', () => {
    const photo = { width: 300, height: 400 };
    const p = livePointToPhoto({ x: 768, y: 1024 }, live, photo);
    expect(p).toEqual({ x: 299, y: 399 });
  });
});
