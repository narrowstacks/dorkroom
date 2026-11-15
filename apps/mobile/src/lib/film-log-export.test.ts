import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Camera, FilmRoll, Lens } from '@/schemas/film-log.schema';
import { buildRollsExport, FILM_LOG_EXPORT_VERSION } from './film-log-export';
import {
  parseCameras,
  parseCustomBrands,
  parseCustomMounts,
  parseLenses,
  parseRolls,
} from './film-log-storage';

const cameras: Camera[] = [
  { id: 'cam1', name: 'Hasselblad 500C/M', format: '120', createdAt: 'x' },
];
const lenses: Lens[] = [
  { id: 'lens1', name: 'Planar 80mm', cameraId: 'cam1', createdAt: 'x' },
];
const rolls: FilmRoll[] = [
  {
    id: 'roll1',
    cameraId: 'cam1',
    filmStockName: 'Kodak Tri-X 400',
    process: 'bw',
    iso: 400,
    status: 'active',
    startedAt: 'x',
    createdAt: 'x',
    updatedAt: 'x',
    shots: [
      {
        id: 'shot1',
        frameNumber: 1,
        aperture: 8,
        shutterSpeed: 0.008,
        lensId: 'lens1',
        place: 'Harbor',
        source: 'meter',
      },
    ],
  },
];

describe('buildRollsExport', () => {
  const result = buildRollsExport({
    rolls,
    cameras,
    lenses,
    exportedAt: '2026-06-23T00:00:00.000Z',
  });

  it('stamps a versioned dorkroom film-log envelope', () => {
    expect(result.app).toBe('dorkroom');
    expect(result.kind).toBe('film-log');
    expect(result.version).toBe(FILM_LOG_EXPORT_VERSION);
    expect(result.exportedAt).toBe('2026-06-23T00:00:00.000Z');
  });

  it('resolves camera and lens names for portability', () => {
    expect(result.rolls[0]?.cameraName).toBe('Hasselblad 500C/M');
    expect(result.rolls[0]?.shots[0]?.lensName).toBe('Planar 80mm');
  });

  it("carries each shot's place through", () => {
    expect(result.rolls[0]?.shots[0]?.place).toBe('Harbor');
  });

  it("carries each shot's location through JSON, and none when absent", () => {
    const location = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracyMeters: 10,
    };
    const withLocation = buildRollsExport({
      rolls: [
        {
          ...rolls[0],
          shots: [
            { id: 's1', frameNumber: 1, source: 'manual', location },
            { id: 's2', frameNumber: 2, source: 'manual' },
          ],
        },
      ],
      cameras,
      lenses,
      exportedAt: '2026-06-23T00:00:00.000Z',
    });
    const parsed: { rolls: { shots: object[] }[] } = JSON.parse(
      JSON.stringify(withLocation)
    );
    expect(parsed.rolls[0].shots[0]).toHaveProperty('location', location);
    expect(parsed.rolls[0].shots[1]).not.toHaveProperty('location');
  });

  it('adds human-readable exposure labels', () => {
    expect(result.rolls[0]?.shots[0]?.apertureLabel).toBe('f/8');
    expect(result.rolls[0]?.shots[0]?.shutterLabel).toBe('1/125');
  });

  it('drops labels for a shot without aperture or shutter through JSON', () => {
    const bare = buildRollsExport({
      rolls: [
        {
          ...rolls[0],
          shots: [{ id: 'shot2', frameNumber: 2, source: 'manual' }],
        },
      ],
      cameras,
      lenses,
      exportedAt: '2026-06-23T00:00:00.000Z',
    });
    const parsed: { rolls: { shots: object[] }[] } = JSON.parse(
      JSON.stringify(bare)
    );
    const shot = parsed.rolls[0].shots[0];
    expect(shot).not.toHaveProperty('apertureLabel');
    expect(shot).not.toHaveProperty('shutterLabel');
    expect(shot).not.toHaveProperty('lensName');
  });

  it('carries a roll development record as stored', () => {
    const development = {
      developedAt: '2026-06-26T18:00:00.000Z',
      recipeName: 'Kodak Tri-X 400 in Kodak D-76',
      dilution: '1+1',
      temperatureF: 68,
      timeSeconds: 585,
    };
    const developed = buildRollsExport({
      rolls: [{ ...rolls[0], status: 'developed', development }],
      cameras,
      lenses,
      exportedAt: '2026-06-27T00:00:00.000Z',
    });
    const parsed: { rolls: { development?: unknown }[] } = JSON.parse(
      JSON.stringify(developed)
    );
    expect(parsed.rolls[0]?.development).toEqual(development);
  });
});

/** The export envelope's lists, loosely: each record is left to the app's
 * own parsers. */
const envelopeSchema = z.looseObject({
  rolls: z.array(z.unknown()).optional(),
  cameras: z.array(z.unknown()).optional(),
  lenses: z.array(z.unknown()).optional(),
  customBrands: z.array(z.unknown()).optional(),
  customMounts: z.array(z.unknown()).optional(),
});

describe('brands, mounts and fixed lenses (#733)', () => {
  const at = '2026-01-01T00:00:00.000Z';
  const bessa: Camera = {
    id: 'bessa',
    name: 'Bessa R',
    format: '35mm',
    createdAt: at,
    brand: 'Voigtländer',
    mountId: 'leica-ltm',
  };
  const gw690: Camera = {
    id: 'gw',
    name: 'GW690III',
    format: '120',
    createdAt: at,
    brand: 'Fujifilm',
    fixedLens: { focalLength: 90, maxAperture: 3.5 },
  };
  const skopar: Lens = {
    id: 'skopar',
    name: '35mm f/2.5 Color Skopar',
    createdAt: at,
    brand: 'Voigtländer',
    mountId: 'leica-ltm',
  };
  const roll = (id: string, cameraId: string, shots: FilmRoll['shots']) =>
    ({
      id,
      cameraId,
      process: 'bw',
      status: 'active',
      shots,
      startedAt: at,
      createdAt: at,
      updatedAt: at,
    }) satisfies FilmRoll;
  const newRolls = [
    roll('r1', 'bessa', [
      { id: 's1', frameNumber: 1, lensId: 'skopar', source: 'manual' },
    ]),
    roll('r2', 'gw', [
      {
        id: 's2',
        frameNumber: 1,
        fixedLensName: '90mm f/3.5',
        source: 'manual',
      },
    ]),
  ];
  const customBrands = [
    { id: 'custom-brand-1', name: 'Shen Hao', createdAt: at },
  ];
  const customMounts = [
    { id: 'custom-mount-1', name: 'Graflex XL', createdAt: at },
  ];

  /** What an import does with an export: each collection back through the
   * app's own per-record parsers, from the JSON text. */
  const reimport = (json: string) => {
    const data = envelopeSchema.parse(JSON.parse(json));
    const raw = (list: unknown[] | undefined) =>
      list === undefined ? undefined : JSON.stringify(list);
    return {
      rolls: parseRolls(raw(data.rolls)),
      cameras: parseCameras(raw(data.cameras)),
      lenses: parseLenses(raw(data.lenses)),
      customBrands: parseCustomBrands(raw(data.customBrands)),
      customMounts: parseCustomMounts(raw(data.customMounts)),
    };
  };

  it('exports the new fields, the custom lists and display names', () => {
    const payload = buildRollsExport({
      rolls: newRolls,
      cameras: [bessa, gw690],
      lenses: [skopar],
      customBrands,
      customMounts,
      exportedAt: at,
    });
    expect(payload.cameras[0]).toMatchObject({
      brand: 'Voigtländer',
      mountId: 'leica-ltm',
    });
    expect(payload.cameras[1]?.fixedLens).toEqual({
      focalLength: 90,
      maxAperture: 3.5,
    });
    expect(payload.lenses[0]?.mountId).toBe('leica-ltm');
    expect(payload.customBrands).toEqual(customBrands);
    expect(payload.customMounts).toEqual(customMounts);
    expect(payload.rolls[0]?.cameraName).toBe('Voigtländer Bessa R');
    expect(payload.rolls[0]?.shots[0]?.lensName).toBe(
      '35mm f/2.5 Color Skopar'
    );
    expect(payload.rolls[1]?.cameraName).toBe('Fujifilm GW690III');
    expect(payload.rolls[1]?.shots[0]?.lensName).toBe('90mm f/3.5');
    // The stored snapshot is exported as stored, beside the display name.
    expect(payload.rolls[1]?.shots[0]?.fixedLensName).toBe('90mm f/3.5');
  });

  it('round-trips a new export to the same data', () => {
    const json = JSON.stringify(
      buildRollsExport({
        rolls: newRolls,
        cameras: [bessa, gw690],
        lenses: [skopar],
        customBrands,
        customMounts,
        exportedAt: at,
      })
    );
    expect(reimport(json)).toEqual({
      rolls: newRolls,
      cameras: [bessa, gw690],
      lenses: [skopar],
      customBrands,
      customMounts,
    });
  });

  it('round-trips an old export (no new fields, no custom lists) unchanged', () => {
    // Built by the pre-#733 code path: no brand, mount or snapshot anywhere.
    const json = JSON.stringify(
      buildRollsExport({ rolls, cameras, lenses, exportedAt: at })
    );
    const {
      customBrands: _brands,
      customMounts: _mounts,
      ...old
    } = envelopeSchema.parse(JSON.parse(json));
    expect(old).not.toHaveProperty('customBrands');
    const back = reimport(JSON.stringify(old));
    expect(back.rolls).toEqual(rolls);
    expect(back.cameras).toEqual(cameras);
    expect(back.lenses).toEqual(lenses);
    expect(back.customBrands).toEqual([]);
    expect(back.customMounts).toEqual([]);
    // The derived lensName on an exported shot is not read back as a snapshot.
    expect(back.rolls[0]?.shots[0]?.fixedLensName).toBeUndefined();
  });

  it('keeps an item whose custom mount was lost', () => {
    const lost: Camera = { ...bessa, mountId: 'custom-mount-gone' };
    const json = JSON.stringify(
      buildRollsExport({
        rolls: [],
        cameras: [lost],
        lenses: [],
        exportedAt: at,
      })
    );
    expect(reimport(json).cameras).toEqual([lost]);
  });
});
