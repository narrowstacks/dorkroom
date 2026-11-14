import { describe, expect, it } from 'vitest';
import type { FilmRoll } from '@/schemas/film-log.schema';
import {
  daysInCamera,
  locatedCountLabel,
  noFramesMessage,
  offersMeterShortcut,
  rollDatesLine,
  rollSetupLine,
  stacksLifecycleTrack,
  stacksSummary,
} from './roll-summary';

const NOW = new Date(2026, 10, 13, 12);
const local = (month: number, day: number, hour = 9) =>
  new Date(2026, month, day, hour).toISOString();

function roll(over: Partial<FilmRoll> = {}): FilmRoll {
  return {
    id: 'r1',
    cameraId: 'cam1',
    process: 'bw',
    status: 'active',
    shots: [],
    startedAt: local(10, 1),
    createdAt: local(10, 1),
    updatedAt: local(10, 1),
    ...over,
  };
}

describe('rollSetupLine', () => {
  it('reads camera, EI and process for a roll titled by its film', () => {
    expect(
      rollSetupLine(
        roll({ filmStockName: 'Ilford XP2 Super', iso: 400 }),
        'Voigtlander Bessa R'
      )
    ).toBe('Voigtlander Bessa R · EI 400 · B&W');
  });

  it('adds the film when the title is a name, and a push or pull to the EI', () => {
    expect(
      rollSetupLine(
        roll({
          name: 'Mission walk',
          filmStockName: 'Kodak Tri-X 400',
          iso: 1600,
          pushPull: 2,
        }),
        'Leica M6'
      )
    ).toBe('Leica M6 · Kodak Tri-X 400 · EI 1600 (Push +2) · B&W');
    expect(
      rollSetupLine(
        roll({
          filmStockName: 'Portra 160',
          iso: 200,
          pushPull: -1,
          process: 'color',
        }),
        'FM2'
      )
    ).toBe('FM2 · EI 200 (Pull -1) · Color');
  });

  it('says Unknown camera for a deleted camera and leaves out a missing EI', () => {
    expect(
      rollSetupLine(
        roll({ filmStockName: 'Velvia 50', process: 'slide' }),
        undefined
      )
    ).toBe('Unknown camera · Slide');
  });

  it('says No film set for a roll without a film, named or not', () => {
    expect(rollSetupLine(roll({ iso: 400 }), 'FM2')).toBe(
      'FM2 · No film set · EI 400 · B&W'
    );
    expect(rollSetupLine(roll({ name: 'Test' }), 'FM2')).toBe(
      'FM2 · No film set · B&W'
    );
  });
});

describe('daysInCamera', () => {
  it('counts local calendar days, 0 on the day it was loaded', () => {
    expect(daysInCamera(local(10, 13, 7), NOW)).toBe(0);
    expect(daysInCamera(local(10, 12, 23), NOW)).toBe(1);
    expect(daysInCamera(local(10, 1), NOW)).toBe(12);
  });

  it('counts a day across a daylight saving change as one', () => {
    // Nov 1 2026 is the US fall-back day; in any zone the count stays whole.
    expect(daysInCamera(local(9, 30), new Date(2026, 10, 2, 12))).toBe(3);
  });

  it('is undefined for a bad date or one ahead', () => {
    expect(daysInCamera('not a date', NOW)).toBeUndefined();
    expect(daysInCamera(local(10, 14), NOW)).toBeUndefined();
  });
});

describe('rollDatesLine', () => {
  it('shows the start and the days in camera of a loaded roll', () => {
    expect(rollDatesLine(roll(), NOW, 'en-US')).toBe(
      'Started Nov 1 · 12 days in camera'
    );
    expect(
      rollDatesLine(roll({ startedAt: local(10, 12) }), NOW, 'en-US')
    ).toBe('Started Nov 12 · 1 day in camera');
  });

  it('leaves out the days on the day it was loaded', () => {
    expect(
      rollDatesLine(roll({ startedAt: local(10, 13, 8) }), NOW, 'en-US')
    ).toBe('Started Nov 13');
  });

  it('shows the shot date of a shot roll, and the developed date once developed', () => {
    expect(
      rollDatesLine(
        roll({ status: 'finished', finishedAt: local(10, 10) }),
        NOW,
        'en-US'
      )
    ).toBe('Started Nov 1 · Shot Nov 10');
    expect(
      rollDatesLine(
        roll({
          status: 'developed',
          finishedAt: local(10, 10),
          development: { developedAt: local(10, 12) },
        }),
        NOW,
        'en-US'
      )
    ).toBe('Started Nov 1 · Shot Nov 10 · Developed Nov 12');
  });

  it('only shows dates the roll has', () => {
    expect(rollDatesLine(roll({ status: 'developed' }), NOW, 'en-US')).toBe(
      'Started Nov 1'
    );
    expect(rollDatesLine(roll({ startedAt: 'garbage' }), NOW, 'en-US')).toBe(
      ''
    );
  });

  it('adds the year to a date from another year', () => {
    expect(
      rollDatesLine(
        roll({
          status: 'finished',
          startedAt: new Date(2025, 11, 20).toISOString(),
          finishedAt: local(0, 5),
        }),
        NOW,
        'en-US'
      )
    ).toBe('Started Dec 20, 2025 · Shot Jan 5');
  });
});

describe('locatedCountLabel', () => {
  it('counts located frames, and is undefined for none', () => {
    expect(locatedCountLabel(3)).toBe('3 with a location');
    expect(locatedCountLabel(1)).toBe('1 with a location');
    expect(locatedCountLabel(0)).toBeUndefined();
  });
});

describe('noFramesMessage', () => {
  it('points a roll in the camera at the Meter', () => {
    expect(noFramesMessage('active')).toContain('Meter');
    expect(noFramesMessage('finished')).not.toContain('Meter');
    expect(noFramesMessage('developed')).not.toContain('Meter');
  });
});

describe('offersMeterShortcut', () => {
  it('is only for a roll in the camera', () => {
    expect(offersMeterShortcut('active')).toBe(true);
    expect(offersMeterShortcut('finished')).toBe(false);
    expect(offersMeterShortcut('developed')).toBe(false);
  });
});

describe('stacksSummary', () => {
  it('stacks from the accessibility text sizes', () => {
    expect(stacksSummary(1)).toBe(false);
    expect(stacksSummary(1.35)).toBe(false);
    expect(stacksSummary(1.5)).toBe(true);
    expect(stacksSummary(3.1)).toBe(true);
  });
});

describe('stacksLifecycleTrack', () => {
  it('stacks from iOS XXL, before the rest of the summary', () => {
    expect(stacksLifecycleTrack(1)).toBe(false);
    expect(stacksLifecycleTrack(1.12)).toBe(false);
    expect(stacksLifecycleTrack(1.2)).toBe(true);
    expect(stacksLifecycleTrack(1.35)).toBe(true);
  });
});
