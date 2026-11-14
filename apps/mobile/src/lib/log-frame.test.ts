import { describe, expect, it } from 'vitest';
import {
  frameLensFields,
  initialLensChoice,
  needsLensChoice,
} from '@/lib/camera-lenses';
import {
  type FilmRoll,
  type Lens,
  type Shot,
  shotSchema,
} from '@/schemas/film-log.schema';
import {
  buildLoggedShot,
  formatShutter,
  frameReadout,
  isoMismatchNote,
  lensChipOptions,
  placeCardValue,
  placeRowLabel,
  readingFromValues,
  selectedLens,
  spokenShutter,
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
    expect('fixedLensName' in built).toBe(false);
  });

  it("logs a fixed-lens camera's frame with its lens snapshot (#733)", () => {
    const cameraLenses = { kind: 'fixed', label: '90mm f/3.5' } as const;
    const choice = initialLensChoice(cameraLenses, undefined, 'lens1');
    expect(needsLensChoice(cameraLenses, choice)).toBe(false);
    const built = buildLoggedShot({
      roll: roll(),
      reading: { aperture: 8, shutterSpeed: 1 / 125 },
      ...frameLensFields(choice, cameraLenses, undefined),
      source: 'meter',
      now,
    });
    expect(built.fixedLensName).toBe('90mm f/3.5');
    expect('lensId' in built).toBe(false);
    // And it is a valid stored frame.
    expect(shotSchema.parse({ ...built, id: 's1' }).fixedLensName).toBe(
      '90mm f/3.5'
    );
  });
});

describe('formatShutter', () => {
  it('writes a minute or more as minutes and seconds, like the Reciprocity readout', () => {
    expect(formatShutter(188.3)).toBe('3m 8.3s');
    expect(formatShutter(60)).toBe('1m');
    expect(formatShutter(59)).toBe('59"');
    expect(formatShutter(59.9)).toBe('59.9"');
    // Rounds to 60 for display, so it reads as a minute, like Reciprocity.
    expect(formatShutter(59.96)).toBe('1m');
    expect(formatShutter(3600)).toBe('1h');
    expect(formatShutter(0.5)).toBe('1/2');
    expect(formatShutter(0.008)).toBe('1/125');
  });
});

describe('spokenShutter', () => {
  it('says a fraction as a fraction of a second', () => {
    expect(spokenShutter(0.008)).toBe('1/125 second');
    expect(spokenShutter(0.5)).toBe('1/2 second');
  });

  it('says whole and decimal seconds in words', () => {
    expect(spokenShutter(1)).toBe('1 second');
    expect(spokenShutter(2)).toBe('2 seconds');
    expect(spokenShutter(1.5)).toBe('1.5 seconds');
  });

  it('says long times in minutes and hours', () => {
    expect(spokenShutter(60)).toBe('1 minute');
    expect(spokenShutter(188.3)).toBe('3 minutes 8.3 seconds');
    expect(spokenShutter(3600)).toBe('1 hour');
    expect(spokenShutter(3900)).toBe('1 hour 5 minutes');
  });

  it('says the time, not "1/1", where the shared formatter shows 1/1', () => {
    // Display quirk in formatShutterSpeed (0.67 s to 1 s reads "1/1"),
    // left for its own fix; only the spoken form is corrected here.
    expect(formatShutter(0.7)).toBe('1/1');
    expect(spokenShutter(0.7)).toBe('0.7 seconds');
    expect(spokenShutter(0.8)).toBe('0.8 seconds');
    expect(spokenShutter(0.97)).toBe('1 second');
  });
});

describe('frameReadout', () => {
  const xp2 = roll({ filmStockName: 'Ilford XP2 Super', iso: 400 });

  it('leads with the frame, then the exposure and the roll', () => {
    expect(
      frameReadout({
        frameNumber: 8,
        reading: { aperture: 8, shutterSpeed: 0.008, iso: 400 },
        source: 'meter',
        roll: xp2,
        cameraName: 'Bessa R',
      })
    ).toEqual({
      figure: '08',
      exposure: 'f/8 · 1/125',
      subtitle: 'Ilford XP2 Super · Bessa R · EI 400',
      spoken:
        'Frame 8, f/8 at 1/125 second, Ilford XP2 Super on Bessa R, EI 400',
    });
  });

  it('names the roll before its film and pads only short numbers', () => {
    const readout = frameReadout({
      frameNumber: 36,
      reading: { shutterSpeed: 188.3 },
      source: 'manual',
      roll: roll({ name: 'Trip' }),
      cameraName: undefined,
    });
    expect(readout.figure).toBe('36');
    expect(readout.exposure).toBe('3m 8.3s');
    expect(readout.subtitle).toBe('Trip · EI 800');
    expect(readout.spoken).toBe(
      'Frame 36, 3 minutes 8.3 seconds, Trip, EI 800'
    );
  });

  it('writes wide and narrow apertures and three-digit frames', () => {
    const wide = frameReadout({
      frameNumber: 100,
      reading: { aperture: 1.4, shutterSpeed: 1 / 1000 },
      source: 'meter',
      roll: xp2,
      cameraName: undefined,
    });
    expect(wide.figure).toBe('100');
    expect(wide.exposure).toBe('f/1.4 · 1/1000');
    expect(wide.spoken).toBe(
      'Frame 100, f/1.4 at 1/1000 second, Ilford XP2 Super, EI 400'
    );
    const narrow = frameReadout({
      frameNumber: 120,
      reading: { aperture: 22, shutterSpeed: 4 },
      source: 'manual',
      roll: xp2,
      cameraName: 'Bessa R',
    });
    expect(narrow.figure).toBe('120');
    expect(narrow.exposure).toBe('f/22 · 4"');
    expect(narrow.spoken).toBe(
      'Frame 120, f/22 at 4 seconds, Ilford XP2 Super on Bessa R, EI 400'
    );
  });

  it("falls back to the reading's speed when the roll has no EI", () => {
    const meter = frameReadout({
      frameNumber: 1,
      reading: { aperture: 5.6, iso: 400 },
      source: 'meter',
      roll: roll({ iso: undefined }),
      cameraName: 'Nikon FM2',
    });
    expect(meter.exposure).toBe('f/5.6');
    expect(meter.subtitle).toBe('HP5+ · Nikon FM2 · EI 400');
    const manual = frameReadout({
      frameNumber: 1,
      reading: { iso: 100 },
      source: 'manual',
      roll: roll({ iso: undefined }),
      cameraName: undefined,
    });
    expect(manual.subtitle).toBe('HP5+ · ISO 100');
  });

  it('has no exposure line for an empty reading, and says so', () => {
    const readout = frameReadout({
      frameNumber: 3,
      reading: {},
      source: 'meter',
      roll: roll({ iso: undefined }),
      cameraName: undefined,
    });
    expect(readout.exposure).toBeNull();
    expect(readout.subtitle).toBe('HP5+');
    expect(readout.spoken).toBe('Frame 3, no exposure, HP5+');
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

describe('buildLoggedShot location', () => {
  const base = { roll: roll(), reading: {}, source: 'manual' as const, now };

  it('stores a usable location as given', () => {
    const location = { latitude: 37.7749, longitude: -122.4194 };
    expect(buildLoggedShot({ ...base, location }).location).toEqual(location);
  });

  it('writes no location key when none was added', () => {
    expect('location' in buildLoggedShot(base)).toBe(false);
  });

  it('drops an unusable location', () => {
    const built = buildLoggedShot({
      ...base,
      location: { latitude: 120, longitude: 0 },
    });
    expect('location' in built).toBe(false);
  });

  it('keeps place text and location independent', () => {
    const built = buildLoggedShot({
      ...base,
      place: 'Pier 4',
      location: { latitude: 1, longitude: 2 },
    });
    expect(built.place).toBe('Pier 4');
    expect(built.location).toEqual({ latitude: 1, longitude: 2 });
  });
});

describe('placeCardValue', () => {
  const location = { latitude: 37.7749, longitude: -122.4194 };

  it('prefers the place text', () => {
    expect(placeCardValue(' Pier 4 ', location)).toBe('Pier 4');
  });

  it('falls back to compact coordinates', () => {
    expect(placeCardValue('  ', location)).toBe('37.77 N 122.42 W');
  });

  it('is null with neither', () => {
    expect(placeCardValue('', undefined)).toBeNull();
  });
});

describe('placeRowLabel', () => {
  const location = { latitude: 37.7749, longitude: -122.4194 };

  it('names the place', () => {
    expect(placeRowLabel(' Pier 4 ', location)).toBe('Place, Pier 4');
  });

  it('says a location was added without reading the coordinates', () => {
    const label = placeRowLabel('', location);
    expect(label).toBe('Place, not set, location added');
    expect(label).not.toMatch(/\d/);
  });

  it('says when there is neither', () => {
    expect(placeRowLabel('  ', undefined)).toBe('Place, not set');
  });
});

describe('lens chips', () => {
  const lenses: Lens[] = [
    { id: 'l1', name: 'Color Skopar 35', createdAt: 'x' },
    { id: 'l2', name: 'Nokton 50', createdAt: 'x' },
  ];

  it('offers every lens in order, spoken as a lens', () => {
    expect(lensChipOptions(lenses)).toEqual([
      {
        label: 'Color Skopar 35',
        value: 'l1',
        accessibilityLabel: 'Lens, Color Skopar 35',
      },
      {
        label: 'Nokton 50',
        value: 'l2',
        accessibilityLabel: 'Lens, Nokton 50',
      },
    ]);
    expect(lensChipOptions([])).toEqual([]);
  });

  it('moves the lens selected at opening to the front', () => {
    const many: Lens[] = [
      ...lenses,
      { id: 'l3', name: 'Heliar 75', createdAt: 'x' },
    ];
    expect(lensChipOptions(many, 'l3').map((chip) => chip.value)).toEqual([
      'l3',
      'l1',
      'l2',
    ]);
    // An unknown or absent lead keeps the order.
    expect(lensChipOptions(many, 'gone').map((chip) => chip.value)).toEqual([
      'l1',
      'l2',
      'l3',
    ]);
    expect(lensChipOptions(many, undefined).map((chip) => chip.value)).toEqual([
      'l1',
      'l2',
      'l3',
    ]);
  });

  it("selects the picked lens only while it is one of the camera's", () => {
    expect(selectedLens(lenses, 'l2')?.name).toBe('Nokton 50');
    // Deleted, or on another body: no pick, so the frame needs one.
    expect(selectedLens(lenses, 'gone')).toBeUndefined();
    expect(selectedLens(lenses, undefined)).toBeUndefined();
  });
});
