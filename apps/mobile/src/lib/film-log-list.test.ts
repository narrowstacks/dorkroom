import { describe, expect, it } from 'vitest';
import type { FilmLogStats } from '@/lib/film-log-collection';
import type { FilmRoll } from '@/schemas/film-log.schema';
import {
  filmLogCaption,
  filmLogEmptyState,
  firstRollHint,
  frameCountLabel,
  rollDateLabel,
  rollRowText,
  stacksRollRow,
} from './film-log-list';

const stats = (patch: Partial<FilmLogStats> = {}): FilmLogStats => ({
  rollsThisYear: 9,
  framesThisYear: 23,
  ...patch,
});

describe('filmLogCaption', () => {
  const lead = (name: string, rolls = 4) => ({ name, rolls, tied: false });

  it('reads the year, then the all-time film and camera as two facts', () => {
    expect(
      filmLogCaption(
        stats({ topFilm: lead('HP5 Plus'), topCamera: lead('FM2', 5) }),
        2026,
        9
      )
    ).toBe(
      '2026: 9 rolls, 23 frames. All time, most shot: HP5 Plus; most used camera: FM2.'
    );
  });

  it('reads naturally with a personal camera name', () => {
    expect(
      filmLogCaption(stats({ topCamera: lead("Dad's FM2") }), 2026, 9)
    ).toBe("2026: 9 rolls, 23 frames. All time, most used camera: Dad's FM2.");
  });

  it('names the film alone when only the film leads', () => {
    expect(
      filmLogCaption(stats({ topFilm: lead('Portra 400', 2) }), 2026, 9)
    ).toBe('2026: 9 rolls, 23 frames. All time, most shot: Portra 400.');
  });

  it('is null below three rolls, where it would only repeat the rows', () => {
    expect(filmLogCaption(stats({ rollsThisYear: 0 }), 2026, 0)).toBeNull();
    expect(
      filmLogCaption(stats({ rollsThisYear: 1, framesThisYear: 7 }), 2026, 1)
    ).toBeNull();
    expect(
      filmLogCaption(
        stats({ rollsThisYear: 2, topFilm: lead('XP2', 2) }),
        2026,
        2
      )
    ).toBeNull();
    expect(
      filmLogCaption(stats({ rollsThisYear: 3, framesThisYear: 3 }), 2026, 3)
    ).toBe('2026: 3 rolls, 3 frames.');
  });

  it('uses the singular for one roll and one frame this year', () => {
    expect(
      filmLogCaption(stats({ rollsThisYear: 1, framesThisYear: 1 }), 2026, 4)
    ).toBe('2026: 1 roll, 1 frame.');
  });

  it('counts zero frames plainly', () => {
    expect(
      filmLogCaption(stats({ rollsThisYear: 3, framesThisYear: 0 }), 2026, 3)
    ).toBe('2026: 3 rolls, 0 frames.');
  });

  it('says so when no roll was started this year', () => {
    expect(
      filmLogCaption(
        stats({
          rollsThisYear: 0,
          framesThisYear: 0,
          topFilm: lead('Tri-X', 3),
        }),
        2026,
        5
      )
    ).toBe('No rolls started in 2026 yet. All time, most shot: Tri-X.');
  });

  it('makes no "most" claim from a film or camera on one roll', () => {
    expect(
      filmLogCaption(
        stats({
          topFilm: { name: 'XP2', rolls: 1, tied: false },
          topCamera: { name: 'Bessa R', rolls: 1, tied: false },
        }),
        2026,
        9
      )
    ).toBe('2026: 9 rolls, 23 frames.');
  });

  it('leaves out a tied film or camera', () => {
    const caption = (filmTied: boolean, cameraTied: boolean) =>
      filmLogCaption(
        stats({
          topFilm: { name: 'HP5 Plus', rolls: 3, tied: filmTied },
          topCamera: { name: 'FM2', rolls: 3, tied: cameraTied },
        }),
        2026,
        9
      );
    expect(caption(true, false)).toBe(
      '2026: 9 rolls, 23 frames. All time, most used camera: FM2.'
    );
    expect(caption(false, true)).toBe(
      '2026: 9 rolls, 23 frames. All time, most shot: HP5 Plus.'
    );
    expect(caption(true, true)).toBe('2026: 9 rolls, 23 frames.');
  });
});

describe('firstRollHint', () => {
  it('says to add a camera first when there is none, since a roll needs one', () => {
    expect(firstRollHint(0)).toBe(
      'Add your cameras and lenses first, in the More menu.'
    );
  });

  it('only says where they live once there is a camera', () => {
    expect(firstRollHint(2)).toBe(
      'Your cameras and lenses are in the More menu.'
    );
  });
});

describe('filmLogEmptyState', () => {
  it('shows the first-roll state when there are no rolls, whatever the filter', () => {
    expect(filmLogEmptyState(0, 'all', 0)).toEqual({ kind: 'first-roll' });
    expect(filmLogEmptyState(0, 'to-develop', 0)).toEqual({
      kind: 'first-roll',
    });
  });

  it('shows nothing while rolls are visible', () => {
    expect(filmLogEmptyState(3, 'in-camera', 1)).toEqual({ kind: 'none' });
    expect(filmLogEmptyState(3, 'all', 3)).toEqual({ kind: 'none' });
  });

  it('names the filter that hides every roll', () => {
    expect(filmLogEmptyState(3, 'in-camera', 0)).toEqual({
      kind: 'no-match',
      filter: 'in-camera',
      message: 'No rolls in camera right now.',
    });
    expect(filmLogEmptyState(3, 'to-develop', 0)).toMatchObject({
      message: 'No rolls to develop.',
    });
    expect(filmLogEmptyState(3, 'this-year', 0)).toMatchObject({
      message: 'No rolls started this year.',
    });
  });
});

describe('frameCountLabel', () => {
  it('pluralizes', () => {
    expect(frameCountLabel(0)).toBe('0 frames');
    expect(frameCountLabel(1)).toBe('1 frame');
    expect(frameCountLabel(36)).toBe('36 frames');
  });
});

describe('rollDateLabel', () => {
  const now = new Date(2026, 10, 13, 12);

  it('shows month and day this year', () => {
    expect(
      rollDateLabel(new Date(2026, 10, 1).toISOString(), now, 'en-US')
    ).toBe('Nov 1');
  });

  it('adds the year for another year', () => {
    expect(
      rollDateLabel(new Date(2025, 9, 2).toISOString(), now, 'en-US')
    ).toBe('Oct 2, 2025');
  });

  it('is empty for a date that does not parse', () => {
    expect(rollDateLabel('not a date', now, 'en-US')).toBe('');
  });
});

describe('rollRowText', () => {
  const shots = (count: number): FilmRoll['shots'] =>
    Array.from({ length: count }, (_, i) => ({
      id: `s${i}`,
      frameNumber: i + 1,
      source: 'manual' as const,
    }));

  it('titles a roll by its film, with camera, EI and frames under it', () => {
    expect(
      rollRowText(
        {
          filmStockName: 'Ilford XP2 Super',
          iso: 400,
          shots: shots(7),
          status: 'active',
        },
        'Bessa R',
        'Nov 1'
      )
    ).toEqual({
      title: 'Ilford XP2 Super',
      detail: 'Bessa R · EI\u00a0400 · 7\u00a0frames',
      status: 'In camera',
      accessibilityLabel:
        'Ilford XP2 Super, In camera, Bessa R, EI 400, 7 frames, started Nov 1',
    });
  });

  it('keeps the film in the detail when the title is a name', () => {
    const text = rollRowText(
      {
        name: 'Paris trip',
        filmStockName: 'Portra 400',
        shots: shots(1),
        status: 'developed',
      },
      'FM2',
      'Oct 2, 2025'
    );
    expect(text.title).toBe('Paris trip');
    expect(text.detail).toBe('FM2 · Portra 400 · 1\u00a0frame');
    expect(text.status).toBe('Developed');
    expect(text.accessibilityLabel).toBe(
      'Paris trip, Portra 400, Developed, FM2, 1 frame, started Oct 2, 2025'
    );
  });

  it('calls a roll with no name and no film "Roll"', () => {
    const text = rollRowText(
      { shots: shots(2), status: 'active', iso: 200 },
      'FM2',
      'Nov 1'
    );
    expect(text.title).toBe('Roll');
    expect(text.detail).toBe('FM2 · EI\u00a0200 · 2\u00a0frames');
    expect(text.accessibilityLabel).toBe(
      'Roll, In camera, FM2, EI 200, 2 frames, started Nov 1'
    );
  });

  it('shows a named roll with no film by its name, with no film in the detail', () => {
    const text = rollRowText(
      { name: 'Test roll', shots: [], status: 'finished' },
      'FM2',
      'Nov 1'
    );
    expect(text.title).toBe('Test roll');
    expect(text.detail).toBe('FM2 · 0\u00a0frames');
    expect(text.accessibilityLabel).toBe(
      'Test roll, Shot, FM2, 0 frames, started Nov 1'
    );
  });

  it('leaves out a deleted camera, a missing EI and an unparseable date', () => {
    const text = rollRowText(
      { filmStockName: 'Tri-X', shots: [], status: 'finished' },
      undefined,
      ''
    );
    expect(text.detail).toBe('0\u00a0frames');
    expect(text.accessibilityLabel).toBe('Tri-X, Shot, 0 frames');
  });
});

describe('stacksRollRow', () => {
  it('stacks the trailing column from the accessibility text sizes', () => {
    expect(stacksRollRow(1)).toBe(false);
    expect(stacksRollRow(1.35)).toBe(false);
    expect(stacksRollRow(1.5)).toBe(true);
    expect(stacksRollRow(3.1)).toBe(true);
  });
});
