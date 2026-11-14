import { describe, expect, it } from 'vitest';
import {
  MAX_THUMBNAIL_DOTS,
  THUMBNAIL_INSET,
  thumbnailDots,
} from './frame-map-thumbnail';

const close = (value: number, expected: number) =>
  expect(value).toBeCloseTo(expected, 9);

describe('thumbnailDots', () => {
  it('is empty without usable points', () => {
    expect(thumbnailDots([])).toEqual([]);
    expect(
      thumbnailDots([
        { latitude: Number.NaN, longitude: 0 },
        { latitude: 91, longitude: 0 },
      ])
    ).toEqual([]);
  });

  it('centres a single spot, and points at one spot are one dot', () => {
    const spot = { latitude: 37.7955, longitude: -122.3937 };
    expect(thumbnailDots([spot, { ...spot }])).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  it('puts north up and east right, inside the inset', () => {
    const [west, east] = thumbnailDots([
      { latitude: 0, longitude: 10 },
      { latitude: 0, longitude: 11 },
    ]);
    close(west?.x ?? 0, THUMBNAIL_INSET);
    close(east?.x ?? 0, 1 - THUMBNAIL_INSET);
    close(west?.y ?? 0, 0.5);

    const [north, south] = thumbnailDots([
      { latitude: 51, longitude: 0 },
      { latitude: 50, longitude: 0 },
    ]);
    close(north?.y ?? 0, THUMBNAIL_INSET);
    close(south?.y ?? 0, 1 - THUMBNAIL_INSET);
    close(north?.x ?? 0, 0.5);
  });

  it('uses one scale for both axes, so the shorter axis is centred', () => {
    const dots = thumbnailDots([
      { latitude: 0, longitude: 0 },
      { latitude: 0.5, longitude: 2 },
    ]);
    // Longitude spans 2 degrees, latitude 0.5: a quarter of the room.
    const room = 1 - 2 * THUMBNAIL_INSET;
    close(dots[0]?.y ?? 0, 0.5 + 0.125 * room);
    close(dots[1]?.y ?? 0, 0.5 - 0.125 * room);
  });

  it('spans the antimeridian the short way', () => {
    const [a, b] = thumbnailDots([
      { latitude: 0, longitude: 179 },
      { latitude: 0, longitude: -179 },
    ]);
    close(a?.x ?? 0, THUMBNAIL_INSET);
    close(b?.x ?? 0, 1 - THUMBNAIL_INSET);
  });

  it('keeps every dot inside the box', () => {
    const dots = thumbnailDots([
      { latitude: 48.8584, longitude: 2.2945 },
      { latitude: 51.5007, longitude: -0.1246 },
      { latitude: 35.6586, longitude: 139.7454 },
      { latitude: -33.8568, longitude: 151.2153 },
    ]);
    for (const dot of dots) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(1);
      expect(dot.y).toBeGreaterThanOrEqual(0);
      expect(dot.y).toBeLessThanOrEqual(1);
    }
  });

  it(`draws at most ${MAX_THUMBNAIL_DOTS} dots`, () => {
    const points = Array.from({ length: 40 }, (_, index) => ({
      latitude: index / 100,
      longitude: index / 100,
    }));
    expect(thumbnailDots(points)).toHaveLength(MAX_THUMBNAIL_DOTS);
  });
});
