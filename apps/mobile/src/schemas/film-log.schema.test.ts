import { describe, expect, it } from 'vitest';
import {
  filmRollSchema,
  type ShotLocationFields,
  shotSchema,
} from './film-log.schema';

const baseShot = { id: 's1', frameNumber: 1, source: 'meter' as const };

describe('shotSchema photo', () => {
  it('accepts a shot with no photo', () => {
    expect(shotSchema.safeParse(baseShot).success).toBe(true);
  });

  it('accepts a valid photo', () => {
    const shot = {
      ...baseShot,
      photo: {
        fileName: 'abc.jpg',
        width: 4032,
        height: 3024,
        capturedAt: '2026-06-24T00:00:00.000Z',
        source: 'meter',
        grayscale: true,
      },
    };
    expect(shotSchema.safeParse(shot).success).toBe(true);
  });

  it('rejects a photo missing fileName', () => {
    const shot = {
      ...baseShot,
      photo: { width: 1, height: 1, capturedAt: 'x', source: 'meter' },
    };
    expect(shotSchema.safeParse(shot).success).toBe(false);
  });
});

describe('shotSchema location', () => {
  const parse = (location: NonNullable<unknown> | null) =>
    shotSchema.safeParse({ ...baseShot, location });

  it('leaves an old shot with no location unchanged', () => {
    const parsed = shotSchema.parse({ ...baseShot, place: 'Harbor' });
    expect(parsed).toEqual({ ...baseShot, place: 'Harbor' });
    expect('location' in parsed).toBe(false);
  });

  it('round-trips a full location', () => {
    const location = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracyMeters: 12.5,
      altitudeMeters: 16,
      capturedAt: '2026-11-13T23:04:05.000Z',
    };
    expect(shotSchema.parse({ ...baseShot, location }).location).toEqual(
      location
    );
  });

  it('round-trips a partial location', () => {
    const location = { latitude: -33.9, longitude: 151.2 };
    expect(shotSchema.parse({ ...baseShot, location }).location).toEqual(
      location
    );
  });

  it('keeps place and location independent', () => {
    const shot = shotSchema.parse({
      ...baseShot,
      place: 'Pier',
      location: { latitude: 1, longitude: 2 },
    });
    expect(shot.place).toBe('Pier');
    expect(shot.location).toEqual({ latitude: 1, longitude: 2 });
  });

  it.each([
    ['missing latitude', { longitude: 2 }],
    ['missing longitude', { latitude: 2 }],
    ['latitude out of range', { latitude: 91, longitude: 2 }],
    ['longitude out of range', { latitude: 2, longitude: -181 }],
    ['string coordinates', { latitude: '2', longitude: '3' }],
    ['NaN latitude', { latitude: Number.NaN, longitude: 3 }],
    ['not an object', 'here'],
    ['null', null],
  ])('degrades %s to no location without failing the shot', (_name, bad) => {
    const result = parse(bad);
    expect(result.success).toBe(true);
    expect(result.data?.location).toBeUndefined();
    expect(result.data?.id).toBe('s1');
  });

  it('drops only a malformed optional field', () => {
    const result = parse({
      latitude: 10,
      longitude: 20,
      accuracyMeters: 'close',
      altitudeMeters: 5,
      capturedAt: 7,
    });
    expect(result.data?.location).toEqual({
      latitude: 10,
      longitude: 20,
      altitudeMeters: 5,
    });
  });

  it('keeps keys a newer build adds', () => {
    const result = parse({ latitude: 10, longitude: 20, source: 'gps' });
    expect(result.data?.location).toMatchObject({ source: 'gps' });
  });

  it('does not fail its roll', () => {
    const roll = {
      id: 'r1',
      cameraId: 'c1',
      process: 'bw',
      status: 'active',
      shots: [{ ...baseShot, location: { latitude: 500, longitude: 0 } }],
      startedAt: '2026-11-13T00:00:00.000Z',
      createdAt: '2026-11-13T00:00:00.000Z',
      updatedAt: '2026-11-13T00:00:00.000Z',
    };
    const parsed = filmRollSchema.safeParse(roll);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.shots[0]?.location).toBeUndefined();
  });
});

describe('ShotLocationFields', () => {
  it('rejects a misspelled key at compile time', () => {
    const typo: ShotLocationFields = {
      latitude: 1,
      longitude: 2,
      // @ts-expect-error accuracyMeter is not a field
      accuracyMeter: 5,
    };
    expect(typo.latitude).toBe(1);
  });
});
