import { describe, expect, it, vi } from 'vitest';

// film-log-export pulls in react-native (Share) and the storage module (MMKV)
// at import time; stub both so the pure builder can be exercised in node.
vi.mock('react-native', () => ({ Share: { share: vi.fn() } }));
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({ getString: vi.fn(), set: vi.fn(), remove: vi.fn() }),
  useMMKVString: () => [undefined, vi.fn()],
}));

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
        iso: 400,
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

  it('serializes to valid JSON', () => {
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
