import { describe, expect, it } from 'vitest';
import type { FilmRoll, Lens, Shot } from '@/schemas/film-log.schema';
import {
  buildLoggedShot,
  formatReading,
  isoMismatchNote,
  needsLens,
  readingFromValues,
  rollSummary,
} from './log-frame';

const shot = (frameNumber: number): Shot => ({
  id: `s${frameNumber}`,
  frameNumber,
  source: 'manual',
});

const roll = (overrides: Partial<FilmRoll> = {}): FilmRoll => ({
  id: 'r1',
  cameraId: 'cam1',
  filmStockName: 'HP5+',
  process: 'bw',
  iso: 800,
  status: 'active',
  shots: [shot(1), shot(2)],
  startedAt: 'x',
  createdAt: 'x',
  updatedAt: 'x',
  ...overrides,
});

const now = new Date('2026-07-01T10:20:30.000Z');

describe('buildLoggedShot', () => {
  it('numbers the frame after the roll and stamps the time', () => {
    const built = buildLoggedShot({
      roll: roll(),
      reading: { aperture: 8, shutterSpeed: 0.008 },
      source: 'manual',
      now,
    });
    expect(built.frameNumber).toBe(3);
    expect(built.takenAt).toBe('2026-07-01T10:20:30.000Z');
    expect(built.aperture).toBe(8);
    expect(built.shutterSpeed).toBe(0.008);
    expect(built.source).toBe('manual');
  });

  it('starts an empty roll at frame 1', () => {
    expect(
      buildLoggedShot({
        roll: roll({ shots: [] }),
        reading: {},
        source: 'manual',
        now,
      }).frameNumber
    ).toBe(1);
  });

  it('never writes the reading ISO', () => {
    const built = buildLoggedShot({
      roll: roll(),
      reading: { aperture: 4, shutterSpeed: 0.01, iso: 400 },
      source: 'meter',
      now,
    });
    expect('iso' in built).toBe(false);
  });

  it('trims place and notes and drops them when empty', () => {
    const filled = buildLoggedShot({
      roll: roll(),
      reading: {},
      place: '  Pier 4 ',
      notes: ' backlit\n',
      source: 'manual',
      now,
    });
    expect(filled.place).toBe('Pier 4');
    expect(filled.notes).toBe('backlit');
    const blank = buildLoggedShot({
      roll: roll(),
      reading: {},
      place: '   ',
      notes: '',
      source: 'manual',
      now,
    });
    expect('place' in blank).toBe(false);
    expect('notes' in blank).toBe(false);
  });

  it('keeps the lens and photo, and leaves out a missing reading part', () => {
    const photo = {
      fileName: 'a.jpg',
      width: 1,
      height: 2,
      capturedAt: 'x',
      source: 'meter' as const,
    };
    const built = buildLoggedShot({
      roll: roll(),
      reading: { shutterSpeed: 30 },
      lensId: 'lens1',
      photo,
      source: 'meter',
      now,
    });
    expect(built.lensId).toBe('lens1');
    expect(built.photo).toEqual(photo);
    expect('aperture' in built).toBe(false);
    expect(built.shutterSpeed).toBe(30);
  });
});

describe('formatReading', () => {
  it('joins aperture, shutter and EI for a meter reading', () => {
    expect(
      formatReading({ aperture: 8, shutterSpeed: 0.008, iso: 800 }, 'meter')
    ).toBe('f/8 · 1/125 · EI 800');
  });

  it('writes a minute or more as minutes and seconds, like the Reciprocity readout', () => {
    expect(formatReading({ shutterSpeed: 188.3 }, 'manual')).toBe('3m 8.3s');
    expect(formatReading({ shutterSpeed: 60 }, 'manual')).toBe('1m');
    expect(formatReading({ shutterSpeed: 59 }, 'manual')).toBe('59"');
    expect(formatReading({ shutterSpeed: 59.9 }, 'manual')).toBe('59.9"');
    // Rounds to 60 for display, so it reads as a minute, like Reciprocity.
    expect(formatReading({ shutterSpeed: 59.96 }, 'manual')).toBe('1m');
    expect(formatReading({ shutterSpeed: 3600 }, 'manual')).toBe('1h');
    expect(formatReading({ shutterSpeed: 0.5 }, 'manual')).toBe('1/2');
  });

  it('calls a calculator reading ISO, not EI', () => {
    expect(
      formatReading({ aperture: 8, shutterSpeed: 0.008, iso: 100 }, 'manual')
    ).toBe('f/8 · 1/125 · ISO 100');
  });

  it('omits missing parts and is empty for an empty reading', () => {
    expect(formatReading({ shutterSpeed: 0.5 }, 'manual')).toBe('1/2');
    expect(formatReading({ aperture: 5.6, iso: 400 }, 'meter')).toBe(
      'f/5.6 · EI 400'
    );
    expect(formatReading({}, 'meter')).toBe('');
  });
});

describe('rollSummary', () => {
  it('shows the film, its EI and the camera', () => {
    expect(rollSummary(roll(), 'Nikon FM2')).toBe('HP5+ @ 800 · Nikon FM2');
  });

  it('prefers the roll name and drops what is unknown', () => {
    expect(rollSummary(roll({ name: 'Trip' }), undefined)).toBe('Trip @ 800');
    expect(rollSummary(roll({ iso: undefined }), 'Nikon FM2')).toBe(
      'HP5+ · Nikon FM2'
    );
  });
});

describe('isoMismatchNote', () => {
  it('words a meter reading as metered', () => {
    expect(isoMismatchNote({ iso: 400 }, { iso: 800 }, 'meter')).toBe(
      'Metered at ISO 400; this roll is rated EI 800.'
    );
  });

  it('words a calculator reading as worked out', () => {
    expect(isoMismatchNote({ iso: 100 }, { iso: 800 }, 'manual')).toBe(
      'Worked out for ISO 100; this roll is rated EI 800.'
    );
  });

  it('is null when equal or when either is unknown', () => {
    expect(isoMismatchNote({ iso: 800 }, { iso: 800 }, 'meter')).toBeNull();
    expect(isoMismatchNote({}, { iso: 800 }, 'meter')).toBeNull();
    expect(isoMismatchNote({ iso: 400 }, {}, 'manual')).toBeNull();
  });
});

describe('needsLens', () => {
  const lens: Lens = { id: 'l1', name: '50mm', createdAt: 'x' };

  it('needs a pick only when lenses exist and none is chosen', () => {
    expect(needsLens([lens], undefined)).toBe(true);
    expect(needsLens([lens], 'l1')).toBe(false);
    expect(needsLens([], undefined)).toBe(false);
  });
});

describe('readingFromValues', () => {
  it('keeps positive finite numbers', () => {
    expect(
      readingFromValues({ aperture: 8, shutterSpeed: 0.008, iso: 400 })
    ).toEqual({
      aperture: 8,
      shutterSpeed: 0.008,
      iso: 400,
    });
  });

  it('leaves out zero, negative, NaN and infinite parts', () => {
    expect(
      readingFromValues({
        aperture: 0,
        shutterSpeed: Number.NaN,
        iso: Number.POSITIVE_INFINITY,
      })
    ).toEqual({});
    expect(readingFromValues({ aperture: -2, iso: 100 })).toEqual({ iso: 100 });
  });
});
