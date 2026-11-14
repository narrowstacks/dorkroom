import { describe, expect, it } from 'vitest';
import type { FilmRoll } from '@/schemas/film-log.schema';
import {
  defaultRollToDevelop,
  developedInLabel,
  developmentSummaryLine,
  lifecycleTrack,
  lifecycleTrackLabel,
  markDevelopedCopy,
  nextLifecycleAction,
  pushPullLabel,
  recentDevelopedRolls,
  recipesPathForRoll,
  rollFormStatusPatch,
  rollStatusPatch,
  rollsToDevelop,
  rollToDevelopLine,
  showsRollPicker,
} from './roll-lifecycle';

const NOW = '2026-08-01T12:00:00.000Z';

function roll(over: Partial<FilmRoll> & { id: string }): FilmRoll {
  return {
    cameraId: 'cam1',
    process: 'bw',
    status: 'active',
    shots: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('rollStatusPatch', () => {
  it('sets finishedAt when a roll is shot, keeping one it has', () => {
    expect(rollStatusPatch(roll({ id: 'a' }), 'finished', NOW)).toEqual({
      status: 'finished',
      finishedAt: NOW,
    });
    expect(
      rollStatusPatch(
        roll({ id: 'a', finishedAt: '2026-07-01T00:00:00.000Z' }),
        'finished',
        NOW
      ).finishedAt
    ).toBe('2026-07-01T00:00:00.000Z');
  });

  it('gives a developed roll a dated record unless it has one', () => {
    expect(
      rollStatusPatch(roll({ id: 'a', status: 'finished' }), 'developed', NOW)
    ).toEqual({
      status: 'developed',
      finishedAt: NOW,
      development: { developedAt: NOW },
    });
    const development = { developedAt: 'then', developer: 'D-76' };
    expect(
      rollStatusPatch(roll({ id: 'a', development }), 'developed', NOW)
        .development
    ).toBe(development);
  });

  it('clears finishedAt when a roll goes back in the camera, never the record', () => {
    const patch = rollStatusPatch(
      roll({
        id: 'a',
        status: 'developed',
        finishedAt: 'then',
        development: { developedAt: 'then' },
      }),
      'active',
      NOW
    );
    expect(patch).toEqual({ status: 'active', finishedAt: undefined });
    expect('development' in patch).toBe(false);
  });

  it('changes nothing but the status when it stays the same', () => {
    expect(
      rollStatusPatch(roll({ id: 'a', status: 'finished' }), 'finished', NOW)
    ).toEqual({ status: 'finished' });
  });

  it('works for a roll being created', () => {
    expect(rollStatusPatch(undefined, 'active', NOW)).toEqual({
      status: 'active',
      finishedAt: undefined,
    });
    expect(rollStatusPatch(undefined, 'finished', NOW).finishedAt).toBe(NOW);
  });
});

describe('rollsToDevelop', () => {
  it('lists shot rolls only, oldest finishedAt first, updatedAt as fallback', () => {
    const rolls = [
      roll({ id: 'active' }),
      roll({
        id: 'new',
        status: 'finished',
        finishedAt: '2026-07-03T00:00:00Z',
      }),
      roll({
        id: 'old',
        status: 'finished',
        finishedAt: '2026-07-01T00:00:00Z',
      }),
      roll({
        id: 'undated',
        status: 'finished',
        updatedAt: '2026-07-02T00:00:00Z',
      }),
      roll({ id: 'bad', status: 'finished', finishedAt: 'x', updatedAt: 'y' }),
      roll({ id: 'dev', status: 'developed' }),
    ];
    expect(rollsToDevelop(rolls).map((r) => r.id)).toEqual([
      'old',
      'undated',
      'new',
      'bad',
    ]);
  });
});

describe('recentDevelopedRolls', () => {
  it('lists developed rolls newest first by developedAt, else updatedAt, capped', () => {
    const rolls = [
      roll({
        id: 'a',
        status: 'developed',
        development: { developedAt: '2026-07-01T00:00:00Z' },
      }),
      roll({ id: 'b', status: 'developed', updatedAt: '2026-07-05T00:00:00Z' }),
      roll({
        id: 'c',
        status: 'developed',
        development: { developedAt: '2026-07-03T00:00:00Z' },
      }),
      roll({ id: 'd', status: 'developed', updatedAt: 'nope' }),
      roll({ id: 'e', status: 'finished' }),
    ];
    expect(recentDevelopedRolls(rolls, 3).map((r) => r.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(recentDevelopedRolls(rolls, 10).map((r) => r.id)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });
});

describe('row labels', () => {
  it('words push and pull, nothing at box speed', () => {
    expect(pushPullLabel(1)).toBe('Push +1');
    expect(pushPullLabel(-0.5)).toBe('Pull -0.5');
    expect(pushPullLabel(0)).toBeUndefined();
    expect(pushPullLabel(undefined)).toBeUndefined();
  });

  it('builds the line under a roll waiting to be developed', () => {
    expect(rollToDevelopLine({ iso: 1600, pushPull: 2, shots: [] })).toBe(
      'EI 1600 \u00b7\u00a0Push +2 \u00b7\u00a00\u00a0frames'
    );
    expect(rollToDevelopLine({ shots: [] })).toBe('0\u00a0frames');
  });

  it('says what a roll was developed in', () => {
    expect(
      developedInLabel({
        developedAt: 'x',
        recipeName: 'Ilford HP5 Plus in Ilford DD-X',
        developer: 'Ilford DD-X',
      })
    ).toBe('Ilford HP5 Plus in Ilford DD-X');
    expect(
      developedInLabel({
        developedAt: 'x',
        developer: 'Kodak D-76',
        dilution: '1+1',
      })
    ).toBe('Kodak D-76 1+1');
    expect(developedInLabel({ developedAt: 'x' })).toBeUndefined();
    expect(developedInLabel(undefined)).toBeUndefined();
  });
});

describe('recipesPathForRoll', () => {
  it('filters to the film by slug and the EI, and carries the roll', () => {
    expect(
      recipesPathForRoll({ id: 'r1', filmStockId: 'hp5-plus', iso: 800 })
    ).toBe('/develop/recipes?film=hp5-plus&iso=800&roll=r1');
  });

  it('adds the opening marker when given', () => {
    expect(recipesPathForRoll({ id: 'r1', filmStockId: 'hp5-plus' }, 123)).toBe(
      '/develop/recipes?film=hp5-plus&roll=r1&at=123'
    );
  });

  it('opens unfiltered for a roll with no catalog film', () => {
    expect(recipesPathForRoll({ id: 'r1', iso: 400 })).toBe(
      '/develop/recipes?roll=r1'
    );
    expect(
      recipesPathForRoll({ id: 'r1', filmStockId: 'custom-abc', iso: 400 })
    ).toBe('/develop/recipes?roll=r1');
  });

  it('encodes the values', () => {
    expect(recipesPathForRoll({ id: 'a b', filmStockId: 'x&y' })).toBe(
      '/develop/recipes?film=x%26y&roll=a%20b'
    );
  });
});

describe('defaultRollToDevelop', () => {
  const candidates = [{ id: 'a' }, { id: 'b' }];

  it('starts on the roll the run was started for', () => {
    expect(defaultRollToDevelop(candidates, 'b')).toBe('b');
  });

  it('never offers another roll when the session roll is no longer waiting', () => {
    expect(defaultRollToDevelop(candidates, 'gone')).toBeUndefined();
    // Run started for A; A was developed or deleted; B is the only one left.
    expect(defaultRollToDevelop([{ id: 'b' }], 'a')).toBeUndefined();
  });

  it('takes the only waiting roll when the run named none, else none', () => {
    expect(defaultRollToDevelop([{ id: 'a' }], undefined)).toBe('a');
    expect(defaultRollToDevelop(candidates, undefined)).toBeUndefined();
    expect(defaultRollToDevelop([], undefined)).toBeUndefined();
  });
});

describe('rollFormStatusPatch', () => {
  const developed = roll({
    id: 'a',
    status: 'developed',
    finishedAt: 'then',
    development: { developedAt: 'then', developer: 'D-76' },
  });

  it('writes nothing when the status control was not changed', () => {
    expect(rollFormStatusPatch(developed, 'finished', 'finished', NOW)).toEqual(
      {}
    );
  });

  it('writes the change against the roll as it is now', () => {
    expect(
      rollFormStatusPatch(developed, 'developed', 'finished', NOW)
    ).toEqual({ status: 'finished', finishedAt: 'then' });
    expect(
      rollFormStatusPatch(roll({ id: 'b' }), 'active', 'developed', NOW)
    ).toEqual({
      status: 'developed',
      finishedAt: NOW,
      development: { developedAt: NOW },
    });
  });

  it('always writes the status of a roll being created', () => {
    expect(rollFormStatusPatch(undefined, undefined, 'active', NOW)).toEqual({
      status: 'active',
      finishedAt: undefined,
    });
  });
});

describe('showsRollPicker', () => {
  it('lists the rolls when there are several or nothing is preselected', () => {
    expect(showsRollPicker(2, 'a')).toBe(true);
    // The run's own roll moved on and one other waits: pick it, no dead end.
    expect(showsRollPicker(1, undefined)).toBe(true);
    expect(showsRollPicker(1, 'a')).toBe(false);
    expect(showsRollPicker(0, undefined)).toBe(false);
  });
});

describe('markDevelopedCopy', () => {
  const formatDate = (iso: string) => `<${iso}>`;

  it('says the date is today when the roll has no record', () => {
    const copy = markDevelopedCopy({ name: 'Trip' }, formatDate);
    expect(copy.message).toBe(
      "Trip moves to Developed with today's date. Runs saved from the Process Timer also record the recipe."
    );
    expect(copy.accessibilityLabel).toBe(
      "Mark as developed. Records today's date."
    );
  });

  it('says the saved development is kept, with its date', () => {
    const copy = markDevelopedCopy(
      { filmStockName: 'HP5', development: { developedAt: '2026-07-01' } },
      formatDate
    );
    expect(copy.message).toBe(
      'HP5 moves to Developed. Keeps the development saved on <2026-07-01>.'
    );
    expect(copy.accessibilityLabel).toBe(
      'Mark as developed. Keeps the development saved on <2026-07-01>.'
    );
  });
});

describe('lifecycleTrack', () => {
  it('marks the steps before the status done and the rest upcoming', () => {
    expect(lifecycleTrack('finished')).toEqual([
      { status: 'active', label: 'In camera', state: 'done' },
      { status: 'finished', label: 'Shot', state: 'current' },
      { status: 'developed', label: 'Developed', state: 'upcoming' },
    ]);
  });

  it('starts at In camera and ends at Developed', () => {
    expect(lifecycleTrack('active').map((step) => step.state)).toEqual([
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(lifecycleTrack('developed').map((step) => step.state)).toEqual([
      'done',
      'done',
      'current',
    ]);
  });
});

describe('lifecycleTrackLabel', () => {
  it('names the status, its step and the whole track', () => {
    expect(lifecycleTrackLabel('finished')).toBe(
      'Status: Shot, step 2 of 3. In camera, then Shot, then Developed.'
    );
  });
});

describe('nextLifecycleAction', () => {
  it('offers the one next step, and nothing at the last', () => {
    expect(nextLifecycleAction('active')).toEqual({
      kind: 'mark-shot',
      label: 'Mark as shot',
    });
    expect(nextLifecycleAction('finished')).toEqual({
      kind: 'mark-developed',
      label: 'Mark as developed',
    });
    expect(nextLifecycleAction('developed')).toBeNull();
  });
});

describe('developmentSummaryLine', () => {
  const record = { developedAt: NOW };

  it('joins recipe, dilution, temperature and the time set', () => {
    expect(
      developmentSummaryLine(
        {
          ...record,
          recipeName: 'Ilford HP5 Plus in Ilford DD-X',
          developer: 'Ilford DD-X',
          dilution: '1+4',
          temperatureF: 68,
          timeSeconds: 570,
        },
        400
      )
    ).toBe(
      'Ilford HP5 Plus in Ilford DD-X · 1+4 · 20°C (68°F) · Time set 9m 30s'
    );
  });

  it('names developer and dilution once without a recipe', () => {
    expect(
      developmentSummaryLine(
        { ...record, developer: 'Rodinal', dilution: '1+50' },
        undefined
      )
    ).toBe('Rodinal 1+50');
  });

  it("adds the recipe's EI only when it differs from the roll's", () => {
    const run = { ...record, developer: 'D-76', shootingIso: 800 };
    expect(developmentSummaryLine(run, 800)).toBe('D-76');
    expect(developmentSummaryLine(run, 400)).toBe('D-76 · for EI 800');
  });

  it('is undefined for a record with only its date', () => {
    expect(developmentSummaryLine(record, 400)).toBeUndefined();
  });
});
