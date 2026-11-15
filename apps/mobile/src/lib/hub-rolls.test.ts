import { describe, expect, it } from 'vitest';
import type { FilmRoll, Shot } from '@/schemas/film-log.schema';
import {
  DEVELOP_HUB_PATH,
  hubEmptyPlacement,
  hubEmptyState,
  hubRollCounts,
  NEW_ROLL_PATH,
  recentNegativeLabel,
  recentNegativeLine,
} from './hub-rolls';

const NOW = new Date(2026, 10, 14, 12);
const shot: Shot = { id: 's', frameNumber: 1, source: 'manual' };

describe('recentNegativeLine', () => {
  const developedAt = new Date(2026, 10, 13, 9).toISOString();

  it('shows the developed date when there is no recipe', () => {
    expect(
      recentNegativeLine(
        { shots: [], development: { developedAt } },
        NOW,
        'en-US'
      )
    ).toBe('Developed Nov 13');
  });

  it('adds the frame count when there are frames', () => {
    expect(
      recentNegativeLine(
        { shots: [shot, shot], development: { developedAt } },
        NOW,
        'en-US'
      )
    ).toBe('Developed Nov 13 · 2 frames');
  });

  it('shows what it was developed in when the roll has a recipe', () => {
    expect(
      recentNegativeLine(
        {
          shots: [shot],
          development: { developedAt, recipeName: 'HP5+ in DD-X' },
        },
        NOW,
        'en-US'
      )
    ).toBe('HP5+ in DD-X · 1 frame');
  });

  it('never invents a date or leads with zero frames', () => {
    expect(
      recentNegativeLine(
        { shots: [], development: { developedAt: 'nope' } },
        NOW,
        'en-US'
      )
    ).toBe('Developed');
    expect(recentNegativeLine({ shots: [], development: undefined }, NOW)).toBe(
      'Developed'
    );
  });

  it('shows developer and dilution when the recipe name is missing', () => {
    expect(
      recentNegativeLine(
        {
          shots: [shot],
          development: {
            developedAt,
            developer: 'Kodak D-76',
            dilution: '1+1',
          },
        },
        NOW,
        'en-US'
      )
    ).toBe('Kodak D-76 1+1 · 1 frame');
  });

  it('includes the year for an earlier year', () => {
    const old = new Date(2025, 9, 2, 9).toISOString();
    expect(
      recentNegativeLine(
        { shots: [], development: { developedAt: old } },
        NOW,
        'en-US'
      )
    ).toBe('Developed Oct 2, 2025');
  });

  it('reads as one spoken label with the roll name', () => {
    expect(
      recentNegativeLabel(
        {
          name: 'Test Roll B',
          filmStockName: undefined,
          shots: [],
          development: { developedAt },
        },
        NOW,
        'en-US'
      )
    ).toBe('Test Roll B, Developed Nov 13');
  });
});

describe('hubEmptyState', () => {
  const none = { hasRollInCamera: false, waiting: 0, developed: 0 };

  it('offers New roll on Shoot when no roll is in the camera', () => {
    expect(hubEmptyState('shoot', none)).toEqual({
      message: 'No roll in the camera.',
      action: { label: 'New roll', path: NEW_ROLL_PATH },
    });
    expect(
      hubEmptyState('shoot', { ...none, hasRollInCamera: true })
    ).toBeNull();
  });

  it('only says what is missing on Develop and Print', () => {
    expect(hubEmptyState('develop', none)).toEqual({
      message: 'Nothing waiting to be developed.',
    });
    expect(hubEmptyState('develop', { ...none, waiting: 1 })).toBeNull();
    expect(hubEmptyState('print', none)).toEqual({
      message: 'No developed rolls yet.',
    });
    expect(hubEmptyState('print', { ...none, developed: 1 })).toBeNull();
  });

  it('offers To develop on Print when shot rolls are waiting', () => {
    expect(hubEmptyState('print', { ...none, waiting: 2 })).toEqual({
      message: 'No developed rolls yet.',
      action: { label: 'To develop: 2', path: DEVELOP_HUB_PATH },
    });
    expect(DEVELOP_HUB_PATH).toBe('/develop');
  });

  it('puts Shoot above the tools and the others below', () => {
    expect(hubEmptyPlacement('shoot')).toBe('above');
    expect(hubEmptyPlacement('develop')).toBe('below');
    expect(hubEmptyPlacement('print')).toBe('below');
  });

  it('ignores the other phases rolls', () => {
    expect(
      hubEmptyState('develop', {
        hasRollInCamera: true,
        waiting: 0,
        developed: 3,
      })
    ).not.toBeNull();
  });
});

describe('hubRollCounts', () => {
  const base = {
    cameraId: 'c',
    process: 'bw',
    shots: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } satisfies Omit<FilmRoll, 'id' | 'status'>;
  const rolls: FilmRoll[] = [
    { ...base, id: 'a', status: 'active' },
    { ...base, id: 'b', status: 'finished' },
    { ...base, id: 'c2', status: 'finished' },
    {
      ...base,
      id: 'd',
      status: 'developed',
      development: { developedAt: '2026-02-01T00:00:00.000Z' },
    },
    { ...base, id: 'e', status: 'developed' },
  ];

  it('counts with the cards selectors, so a card and its line never both show', () => {
    const counts = hubRollCounts(rolls, rolls[0]);
    expect(counts).toEqual({ hasRollInCamera: true, waiting: 2, developed: 2 });
    expect(hubEmptyState('develop', counts)).toBeNull();
    expect(hubEmptyState('print', counts)).toBeNull();
    expect(hubEmptyState('shoot', counts)).toBeNull();
  });

  it('shows the lines when the cards would be absent', () => {
    const counts = hubRollCounts([rolls[0]!], undefined);
    expect(counts).toEqual({
      hasRollInCamera: false,
      waiting: 0,
      developed: 0,
    });
    expect(hubEmptyState('shoot', counts)).not.toBeNull();
    expect(hubEmptyState('develop', counts)).not.toBeNull();
    expect(hubEmptyState('print', counts)).not.toBeNull();
  });
});
