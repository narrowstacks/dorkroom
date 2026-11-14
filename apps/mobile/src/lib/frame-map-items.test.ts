import { describe, expect, it } from 'vitest';
import type { Shot } from '@/schemas/film-log.schema';
import {
  framePoints,
  locatedFrameLabel,
  locatedFrames,
  pointMonogram,
  selectedPoint,
} from './frame-map-items';

function shot(frameNumber: number, patch: Partial<Shot> = {}): Shot {
  return { id: `s${frameNumber}`, frameNumber, source: 'manual', ...patch };
}

describe('locatedFrames', () => {
  it('keeps located frames in frame order', () => {
    const frames = locatedFrames([
      shot(3, { location: { latitude: 3, longitude: 3 } }),
      shot(2),
      shot(1, {
        place: '  Harbor ',
        location: { latitude: 37.7749, longitude: -122.4194 },
      }),
      shot(4, { location: { latitude: 100, longitude: 0 } }),
    ]);
    expect(frames.map((frame) => frame.frameNumber)).toEqual([1, 3]);
    expect(frames[0]).toEqual({
      shotId: 's1',
      frameNumber: 1,
      place: 'Harbor',
      latitude: 37.7749,
      longitude: -122.4194,
      coordinatesText: '37.7749° N, 122.4194° W',
      accuracyText: '',
    });
    expect(frames[1]).not.toHaveProperty('place');
  });

  it('shows a coarse fix coarser, with its accuracy', () => {
    const [frame] = locatedFrames([
      shot(1, {
        location: {
          latitude: 1.23456,
          longitude: 2.34567,
          accuracyMeters: 2500,
        },
      }),
    ]);
    expect(frame?.coordinatesText).toBe('1.23° N, 2.35° E');
    expect(frame?.accuracyText).toBe('±2.5 km');
  });
});

describe('locatedFrameLabel', () => {
  it('reads number, place and coordinates', () => {
    const [plain, coarse] = locatedFrames([
      shot(12, { place: 'Pier', location: { latitude: 0, longitude: 0 } }),
      shot(13, {
        location: { latitude: 0, longitude: 0, accuracyMeters: 500 },
      }),
    ]);
    expect(plain && locatedFrameLabel(plain)).toBe(
      'Frame 12, Pier, 0.0000° N, 0.0000° E'
    );
    expect(coarse && locatedFrameLabel(coarse)).toBe(
      'Frame 13, 0.00° N, 0.00° E, accuracy ±500 m'
    );
  });
});

describe('pointMonogram', () => {
  it('is the frame number for one frame', () => {
    expect(pointMonogram([12])).toBe('12');
  });

  it('is a range for a run, else the first frame and a plus', () => {
    expect(pointMonogram([5, 3, 4])).toBe('3-5');
    expect(pointMonogram([3, 7])).toBe('3+');
    expect(pointMonogram([3, 3])).toBe('3+');
  });

  it('never exceeds 4 characters', () => {
    expect(pointMonogram([9, 10, 11])).toBe('9-11');
    expect(pointMonogram([10, 11, 12])).toBe('10+');
    expect(pointMonogram([1000, 1001])).toBe('2');
    for (const numbers of [[5], [3, 4], [120, 121], [99, 140], [1000, 2000]]) {
      const label = pointMonogram(numbers);
      expect(label.length).toBeLessThanOrEqual(4);
      expect(label).toMatch(/^[0-9+-]+$/);
    }
  });
});

describe('framePoints', () => {
  it('puts frames at the same point on one pin, in frame order', () => {
    const points = framePoints(
      locatedFrames([
        shot(5, { location: { latitude: 1, longitude: 2 } }),
        shot(2, { location: { latitude: 10, longitude: 20 } }),
        shot(3, { location: { latitude: 1, longitude: 2 } }),
        shot(4, { location: { latitude: 1.0000001, longitude: 2 } }),
      ])
    );
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      id: '10.000000,20.000000',
      monogram: '2',
      title: 'Frame 2',
      latitude: 10,
      longitude: 20,
    });
    expect(points[1]?.frames.map((frame) => frame.frameNumber)).toEqual([
      3, 4, 5,
    ]);
    expect(points[1]).toMatchObject({
      id: '1.000000,2.000000',
      monogram: '3-5',
      title: 'Frames 3-5',
    });
  });

  it('keeps points that differ at the sixth decimal apart', () => {
    const points = framePoints(
      locatedFrames([
        shot(1, { location: { latitude: 1, longitude: 2 } }),
        shot(7, { location: { latitude: 1.000001, longitude: 2 } }),
        shot(9, { location: { latitude: 1, longitude: 2 } }),
      ])
    );
    expect(points.map((point) => point.title)).toEqual(['2 frames', 'Frame 7']);
    expect(points[0]?.monogram).toBe('1+');
  });

  it('keeps a point id when the frame that named it is removed', () => {
    const before = framePoints(
      locatedFrames([
        shot(2, { location: { latitude: 1, longitude: 2 } }),
        shot(3, { location: { latitude: 1, longitude: 2 } }),
      ])
    );
    const after = framePoints(
      locatedFrames([
        shot(2),
        shot(3, { location: { latitude: 1, longitude: 2 } }),
      ])
    );
    expect(after[0]?.id).toBe(before[0]?.id);
    expect(after[0]?.title).toBe('Frame 3');
  });

  it('drops a point whose last frame lost its location', () => {
    const before = framePoints(
      locatedFrames([shot(1, { location: { latitude: 1, longitude: 2 } })])
    );
    const selectedId = before[0]?.id ?? null;
    expect(selectedPoint(before, selectedId)?.title).toBe('Frame 1');
    const after = framePoints(locatedFrames([shot(1)]));
    expect(after).toEqual([]);
    expect(selectedPoint(after, selectedId)).toBeUndefined();
    expect(selectedPoint(before, null)).toBeUndefined();
  });

  it('is empty without located frames', () => {
    expect(framePoints([])).toEqual([]);
  });
});
