import { byteToLinear, linearToSrgb, type RgbaImage } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import type { BaseSample } from './inverter-state';
import {
  AUTO_BASE_SHIFT,
  AUTO_BASE_VOTES,
  type AutoBaseTrack,
  carryToPhoto,
  type LiveCarry,
  type LiveFraming,
  needsStatsPass,
  NO_AUTO_BASE,
  readLiveSnapshot,
  settleAutoBase,
} from './live-reading';

const read = (...args: Parameters<typeof readLiveSnapshot>) =>
  readLiveSnapshot(...args).reading;

/** Orange mask as photographed, in sRGB bytes. */
const BASE = [220, 140, 80] as const;
const baseLinear = BASE.map(byteToLinear);

/**
 * A C-41 negative on a light table, at any size: a border of clipped light
 * table, a strip of clear rebate along the top of the film, and an image whose
 * density rises from left to right, densest in blue.
 */
function negative(width: number, height: number): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  const gamma = [0.6, 0.7, 0.85];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const u = col / width;
      const v = row / height;
      let rgb: number[];
      if (u < 0.1 || u >= 0.9 || v < 0.1 || v >= 0.9) {
        rgb = [255, 255, 255];
      } else if (v < 0.2) {
        rgb = [...BASE];
      } else {
        const density = ((u - 0.1) / 0.8) * 2;
        rgb = baseLinear.map((c, i) =>
          Math.round(linearToSrgb(c * 10 ** (-density * gamma[i])) * 255)
        );
      }
      data.set([...rgb, 255], (row * width + col) * 4);
    }
  }
  return { data, width, height };
}

const live = { width: 300, height: 400 };
const snapshot = { image: negative(75, 100), live };
const auto: LiveFraming = { basePoint: null };

describe('readLiveSnapshot', () => {
  it('finds the base on its own, in live pixels', () => {
    const reading = read(snapshot, auto, 'c41');
    expect(reading.base?.auto).toBe(true);
    reading.base?.rgb.forEach((c, i) =>
      expect(c).toBeCloseTo(baseLinear[i], 2)
    );
    // The rebate is the top strip of the film, scaled up to live pixels.
    const point = reading.base?.point;
    expect(point?.y).toBeGreaterThanOrEqual(0.1 * live.height);
    expect(point?.y).toBeLessThan(0.2 * live.height);
    expect(reading.statistics?.filmType).toBe('c41');
  });

  it('samples a picked base at its point and keeps the point', () => {
    const basePoint = { x: 150, y: 60 };
    const reading = read(snapshot, { basePoint }, 'c41');
    expect(reading.base).toMatchObject({ point: basePoint, auto: false });
    reading.base?.rgb.forEach((c, i) =>
      expect(c).toBeCloseTo(baseLinear[i], 3)
    );
  });

  it('meters the film over the whole frame', () => {
    const reading = read(snapshot, auto, 'c41');
    expect(reading.exposure?.pixels).toBeGreaterThan(0);
  });

  it('has no statistics without a base', () => {
    const blank: RgbaImage = {
      data: new Uint8Array(20 * 20 * 4).fill(255),
      width: 20,
      height: 20,
    };
    const reading = read(
      { image: blank, live: { width: 20, height: 20 } },
      auto,
      'c41'
    );
    expect(reading.base).toBeNull();
    expect(reading.statistics).toBeNull();
    expect(reading.exposure).toBeNull();
  });
});

describe('carryToPhoto', () => {
  const proxy = negative(600, 800);

  it('samples a picked base from the photo', () => {
    const carry: LiveCarry = { live, basePoint: { x: 150, y: 60 } };
    const { base } = carryToPhoto(carry, proxy, 'c41');
    expect(base).toMatchObject({ point: { x: 300, y: 120 }, auto: false });
    base?.rgb.forEach((c, i) => expect(c).toBeCloseTo(baseLinear[i], 3));
  });

  it('finds the base in the photo when it was automatic', () => {
    const { base } = carryToPhoto({ live, basePoint: null }, proxy, 'c41');
    expect(base?.auto).toBe(true);
    base?.rgb.forEach((c, i) => expect(c).toBeCloseTo(baseLinear[i], 2));
  });
});

describe('needsStatsPass', () => {
  const base = (density: number): BaseSample => ({
    point: { x: 1, y: 1 },
    rgb: [0.7 * 10 ** -density, 0.3, 0.1],
    auto: true,
    confidence: 1,
  });

  it('skips an unchanged snapshot when no base is pending', () => {
    expect(needsStatsPass(false, { accepted: base(0), disagreeing: [] })).toBe(
      false
    );
    expect(needsStatsPass(true, { accepted: base(0), disagreeing: [] })).toBe(
      true
    );
  });

  it('settles a new base when the camera holds still on a new negative', () => {
    const next = base(0.2);
    // The first snapshot of the new negative changed; every later one repeats.
    let track: AutoBaseTrack = { accepted: base(0), disagreeing: [] };
    let changed = true;
    for (let i = 0; i < AUTO_BASE_VOTES * 2; i++) {
      if (needsStatsPass(changed, track)) {
        track = settleAutoBase(track, next, false);
      }
      changed = false;
    }
    expect(track.accepted?.rgb[0]).toBeCloseTo(next.rgb[0], 9);
    expect(track.disagreeing).toEqual([]);
  });
});

describe('settleAutoBase', () => {
  const at = (density: number): BaseSample => ({
    point: { x: 1, y: 1 },
    rgb: [0.7 * 10 ** -density, 0.3, 0.1],
    auto: true,
    confidence: 1,
  });
  const a = at(0);
  const steady = { accepted: a, disagreeing: [] };
  const feed = (track: AutoBaseTrack, ...proposals: (BaseSample | null)[]) =>
    proposals.reduce((t, p) => settleAutoBase(t, p, false), track);

  it('takes the first base it is offered', () => {
    expect(settleAutoBase(NO_AUTO_BASE, a, false).accepted).toBe(a);
  });

  it('ignores a base within the noise margin', () => {
    expect(settleAutoBase(steady, at(AUTO_BASE_SHIFT / 2), false)).toEqual(
      steady
    );
  });

  it(`switches after ${AUTO_BASE_VOTES} disagreeing snapshots, to their median`, () => {
    const run = [at(0.1), at(0.12), at(0.11)].slice(0, AUTO_BASE_VOTES);
    const before = feed(steady, ...run.slice(0, -1));
    expect(before.accepted).toBe(a);
    const after = feed(before, run[run.length - 1]);
    expect(after.accepted?.rgb[0]).toBeCloseTo(at(0.11).rgb[0], 9);
    expect(after.disagreeing).toEqual([]);
  });

  it('drops a one-off outlier', () => {
    expect(feed(steady, at(0.2), at(0.01))).toEqual(steady);
  });

  it('is not stuck when proposals alternate between two other bases', () => {
    const track = feed(steady, at(0.2), at(0.4), at(0.2));
    expect(track.accepted?.rgb[0]).toBeCloseTo(at(0.2).rgb[0], 9);
  });

  it('is not stuck when a new base alternates with nothing found', () => {
    const track = feed(steady, at(0.2), null, at(0.2), null, at(0.2));
    expect(track.accepted?.rgb[0]).toBeCloseTo(at(0.2).rgb[0], 9);
  });

  it('keeps the base when detection misses', () => {
    expect(feed(steady, null, null)).toEqual(steady);
  });

  it('switches at once when forced', () => {
    const far = at(0.3);
    expect(settleAutoBase(steady, far, true)).toEqual({
      accepted: far,
      disagreeing: [],
    });
  });
});
