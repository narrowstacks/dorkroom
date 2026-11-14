import { describe, expect, it } from 'vitest';
import {
  frameMapCamera,
  MAP_PADDING,
  MAX_ZOOM,
  MIN_SPAN_DEG,
  MIN_ZOOM,
} from './frame-map-region';

/** The degree span a zoom shows, as expo-maps converts it. */
const spanOf = (zoom: number) => 360 / 2 ** zoom;

describe('frameMapCamera', () => {
  it('is null without usable points', () => {
    expect(frameMapCamera([])).toBeNull();
    expect(
      frameMapCamera([
        { latitude: Number.NaN, longitude: 0 },
        { latitude: 95, longitude: 0 },
        { latitude: 0, longitude: 200 },
      ])
    ).toBeNull();
  });

  it('centers on a single point at the minimum span', () => {
    const camera = frameMapCamera([{ latitude: 51.5, longitude: -0.12 }]);
    expect(camera?.coordinates).toEqual({ latitude: 51.5, longitude: -0.12 });
    expect(spanOf(camera?.zoom ?? 0)).toBeCloseTo(MIN_SPAN_DEG * MAP_PADDING);
  });

  it('treats identical points as one', () => {
    const point = { latitude: 37.7749, longitude: -122.4194 };
    expect(frameMapCamera([point, point, point])).toEqual(
      frameMapCamera([point])
    );
  });

  it('fits the larger span with padding', () => {
    const camera = frameMapCamera([
      { latitude: 40, longitude: -74 },
      { latitude: 41, longitude: -70 },
    ]);
    expect(camera?.coordinates.latitude).toBeCloseTo(40.5);
    expect(camera?.coordinates.longitude).toBeCloseTo(-72);
    expect(spanOf(camera?.zoom ?? 0)).toBeCloseTo(4 * MAP_PADDING);
    // every point is inside the shown square
    expect(spanOf(camera?.zoom ?? 0) / 2).toBeGreaterThan(2);
  });

  it('spans the antimeridian the short way', () => {
    const camera = frameMapCamera([
      { latitude: -17, longitude: 179 },
      { latitude: -18, longitude: -179 },
    ]);
    expect(Math.abs(camera?.coordinates.longitude ?? 0)).toBeCloseTo(180);
    expect(spanOf(camera?.zoom ?? 0)).toBeCloseTo(2 * MAP_PADDING);
  });

  it('keeps an arc that does not cross the antimeridian', () => {
    const camera = frameMapCamera([
      { latitude: 0, longitude: -60 },
      { latitude: 0, longitude: 60 },
      { latitude: 0, longitude: 0 },
    ]);
    // gaps of 60, 60 and 240 degrees: the 240 across 180 is the empty one,
    // so the arc runs from -60 to 60 through 0
    expect(camera?.coordinates.longitude).toBeCloseTo(0);
    expect(spanOf(camera?.zoom ?? 0)).toBeCloseTo(120 * MAP_PADDING);
  });

  it('clamps the zoom to what MapKit can show', () => {
    const world = frameMapCamera([
      { latitude: -60, longitude: -150 },
      { latitude: 70, longitude: 0 },
      { latitude: 10, longitude: 150 },
    ]);
    expect(world?.zoom).toBe(MIN_ZOOM);
    const close = frameMapCamera([{ latitude: 0, longitude: 0 }]);
    expect(close?.zoom).toBeLessThanOrEqual(MAX_ZOOM);
  });

  it('keeps the center inside the projection near a pole', () => {
    const camera = frameMapCamera([{ latitude: 89.9, longitude: 10 }]);
    expect(camera?.coordinates.latitude).toBe(85);
  });
});
