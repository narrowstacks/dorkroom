import { describe, expect, it } from 'vitest';
import type { Camera, FilmRoll, Lens } from '@/types/film-log';
import { buildRollsExport, FILM_LOG_EXPORT_VERSION } from './film-log-export';

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
});
