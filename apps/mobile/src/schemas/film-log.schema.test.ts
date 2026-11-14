import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  cameraFormatSchema,
  cameraSchema,
  customBrandSchema,
  customMountSchema,
  filmRollSchema,
  lensSchema,
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

describe('cameras and lenses: brands, mounts and fixed lenses (#733)', () => {
  // The schemas as they were before #733, to prove old data reads the same.
  const oldCameraSchema = z.object({
    id: z.string(),
    name: z.string(),
    format: cameraFormatSchema,
    backs: z.array(z.string()).optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  });
  const oldLensSchema = z.object({
    id: z.string(),
    name: z.string(),
    cameraId: z.string().nullish(),
    focalLength: z.number().optional(),
    maxAperture: z.number().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  });
  const at = '2020-01-01T00:00:00.000Z';
  const legacyCameras = [
    { id: 'c1', name: 'Nikon FM2', format: '35mm', createdAt: at },
    {
      id: 'c2',
      name: 'Chamonix 045N-2',
      format: '4x5',
      backs: ['Holder 1', 'Holder 2'],
      notes: '',
      createdAt: at,
    },
  ];
  const legacyLenses = [
    { id: 'l1', name: '50mm', createdAt: at },
    { id: 'l2', name: 'Planar', cameraId: null, createdAt: at },
    {
      id: 'l3',
      name: 'Nikkor 105',
      cameraId: 'c1',
      focalLength: 105,
      maxAperture: 2.5,
      notes: 'AI-S',
      createdAt: at,
    },
  ];

  it('reads old cameras and lenses exactly as the old schemas did, byte for byte', () => {
    for (const camera of legacyCameras) {
      const parsed = cameraSchema.parse(camera);
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(camera));
      expect(parsed).toStrictEqual(oldCameraSchema.parse(camera));
      expect(Object.keys(parsed)).toEqual(Object.keys(camera));
    }
    for (const lens of legacyLenses) {
      const parsed = lensSchema.parse(lens);
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(lens));
      expect(parsed).toStrictEqual(oldLensSchema.parse(lens));
    }
  });

  it('keeps a frame with no lens snapshot unchanged', () => {
    // In the order the app writes a shot (the schema's).
    const shot = { id: 's1', frameNumber: 1, lensId: 'l3', source: 'meter' };
    expect(JSON.stringify(shotSchema.parse(shot))).toBe(JSON.stringify(shot));
  });

  it('reads the new fields', () => {
    const camera = cameraSchema.parse({
      ...legacyCameras[0],
      brand: 'Voigtländer',
      mountId: 'leica-ltm',
    });
    expect(camera.brand).toBe('Voigtländer');
    expect(camera.mountId).toBe('leica-ltm');
    const gw = cameraSchema.parse({
      ...legacyCameras[0],
      fixedLens: { focalLength: 90, maxAperture: 3.5, coating: 'EBC' },
    });
    // Loose: a key a newer build adds survives.
    expect(gw.fixedLens).toEqual({
      focalLength: 90,
      maxAperture: 3.5,
      coating: 'EBC',
    });
    expect(
      lensSchema.parse({
        ...legacyLenses[0],
        brand: 'Nikon',
        mountId: 'nikon-f',
      })
    ).toMatchObject({ brand: 'Nikon', mountId: 'nikon-f' });
    expect(
      shotSchema.parse({ ...baseShot, fixedLensName: '90mm f/3.5' })
        .fixedLensName
    ).toBe('90mm f/3.5');
  });

  it.each([
    ['a number brand', { brand: 7 }],
    ['a null mount', { mountId: null }],
    ['an object mount', { mountId: { id: 'nikon-f' } }],
    ['a string fixed lens', { fixedLens: '90mm' }],
    ['a null fixed lens', { fixedLens: null }],
  ])('drops %s without failing the camera', (_name, bad) => {
    const result = cameraSchema.safeParse({ ...legacyCameras[0], ...bad });
    expect(result.success).toBe(true);
    // The bad value reads as absent; nothing else changes.
    expect(JSON.stringify(result.data)).toBe(JSON.stringify(legacyCameras[0]));
  });

  it('drops only the malformed fields of a fixed lens', () => {
    const result = cameraSchema.parse({
      ...legacyCameras[0],
      fixedLens: { name: 3, focalLength: -1, maxAperture: 'fast' },
    });
    expect(result.fixedLens).toEqual({});
  });

  it.each([
    ['a number brand', { brand: false }],
    ['a number mount', { mountId: 42 }],
  ])('drops %s without failing the lens', (_name, bad) => {
    const result = lensSchema.safeParse({ ...legacyLenses[2], ...bad });
    expect(result.success).toBe(true);
    expect(JSON.stringify(result.data)).toBe(JSON.stringify(legacyLenses[2]));
  });

  it('drops a malformed lens snapshot without failing the frame or its roll', () => {
    const roll = filmRollSchema.safeParse({
      id: 'r1',
      cameraId: 'c1',
      process: 'bw',
      status: 'active',
      shots: [{ ...baseShot, fixedLensName: { focal: 90 } }],
      startedAt: at,
      createdAt: at,
      updatedAt: at,
    });
    expect(roll.success).toBe(true);
    expect(roll.data?.shots[0]).toEqual(baseShot);
    expect(roll.data?.shots[0]?.fixedLensName).toBeUndefined();
  });

  it('reads custom brands and mounts, requiring only id and name', () => {
    expect(
      customMountSchema.safeParse({ id: 'custom-mount-1', name: 'X' }).success
    ).toBe(true);
    expect(
      customMountSchema.parse({ id: 'm', name: 'X', createdAt: 5 })
    ).toEqual({ id: 'm', name: 'X' });
    expect(customBrandSchema.safeParse({ id: 'b' }).success).toBe(false);
  });
});
