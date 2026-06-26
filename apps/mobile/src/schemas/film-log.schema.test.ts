import { describe, expect, it } from 'vitest';
import { shotSchema } from './film-log.schema';

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
