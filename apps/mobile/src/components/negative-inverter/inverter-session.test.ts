import { DEFAULT_INVERSION_ADJUSTMENTS } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  orphanedSources,
  parseSession,
  restoreSession,
  serializeSession,
  SESSION_VERSION,
  type SessionRecord,
  toSessionRecord,
} from './inverter-session';
import {
  initialInverterState,
  inverterReducer,
  type InverterState,
} from './inverter-state';

type Negative = { id: string };

const proxy = { width: 300, height: 200 };

function editedState(): InverterState<Negative> {
  return {
    ...initialInverterState<Negative>(),
    generation: 3,
    negative: { id: 'a' },
    filmType: 'c41',
    crop: { x: 10, y: 20, width: 200, height: 150 },
    base: {
      point: { x: 4, y: 9 },
      rgb: [0.7, 0.4, 0.2],
      auto: false,
      confidence: 1,
    },
    neutral: { point: { x: 100, y: 100 }, rgb: [0.2, 0.21, 0.19] },
    adjustments: { ...DEFAULT_INVERSION_ADJUSTMENTS, exposure: 0.5 },
    orientation: { quarterTurns: 3, mirrored: true },
    tool: 'crop',
  };
}

/** The record for a state that has one. */
function recordOf(state: InverterState<Negative>): SessionRecord {
  const record = toSessionRecord(state, 'abc.jpg');
  if (!record) throw new Error('expected a session record');
  return record;
}

describe('session records', () => {
  it('round-trips everything worth keeping', () => {
    const record = recordOf(editedState());
    const back = parseSession(serializeSession(record));
    expect(back).toEqual(record);
    expect(back).toMatchObject({
      version: SESSION_VERSION,
      fileName: 'abc.jpg',
      orientation: { quarterTurns: 3, mirrored: true },
      adjustments: { exposure: 0.5 },
    });
  });

  it('keeps nothing without a photo', () => {
    expect(toSessionRecord(initialInverterState<Negative>(), 'a.jpg')).toBe(
      null
    );
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not JSON', '{oops'],
    ['not an object', '42'],
    ['a future version', JSON.stringify({ version: SESSION_VERSION + 1 })],
  ])('degrades a %s record to no session', (_, raw) => {
    expect(parseSession(raw)).toBeNull();
  });

  it('rejects a record with a bad field rather than throwing', () => {
    const good = recordOf(editedState());
    const bad = [
      { ...good, fileName: '../escape.jpg' },
      { ...good, crop: { x: 0, y: 0, width: 0, height: 10 } },
      { ...good, orientation: { quarterTurns: 4, mirrored: false } },
      { ...good, adjustments: { ...good.adjustments, exposure: null } },
      { ...good, filmType: 'e6' },
    ];
    for (const record of bad) {
      expect(parseSession(JSON.stringify(record))).toBeNull();
    }
  });
});

describe('restoreSession', () => {
  const record = recordOf(editedState());

  it('reapplies a record to its photo', () => {
    const state = inverterReducer(initialInverterState<Negative>(), {
      type: 'restore',
      negative: { id: 'a' },
      session: restoreSession(record, proxy),
    });
    expect(state).toMatchObject({
      negative: { id: 'a' },
      filmType: 'c41',
      crop: record.crop,
      base: record.base,
      neutral: record.neutral,
      adjustments: record.adjustments,
      orientation: record.orientation,
      tool: null,
      view: 'positive',
      generation: 1,
    });
  });

  it('clips the crop and drops picks that no longer fit the photo', () => {
    const restored = restoreSession(record, { width: 80, height: 60 });
    expect(restored.crop).toEqual({ x: 10, y: 20, width: 70, height: 40 });
    expect(restored.base).not.toBeNull();
    expect(restored.neutral).toBeNull();
  });

  it('asks for a base when the record has none', () => {
    const state = inverterReducer(initialInverterState<Negative>(), {
      type: 'restore',
      negative: { id: 'a' },
      session: restoreSession({ ...record, base: null }, proxy),
    });
    expect(state.tool).toBe('base');
    expect(state.view).toBe('negative');
  });

  it('drops a neutral on black and white film', () => {
    expect(
      restoreSession({ ...record, filmType: 'bw' }, proxy).neutral
    ).toBeNull();
  });
});

describe('orphanedSources', () => {
  it('keeps the photo the session points at and offers the rest', () => {
    expect(orphanedSources(['a1.jpg', 'b2.jpg', 'c3.heic'], 'b2.jpg')).toEqual([
      'a1.jpg',
      'c3.heic',
    ]);
  });

  it('offers every copy when there is no session', () => {
    expect(orphanedSources(['a1.jpg'], null)).toEqual(['a1.jpg']);
  });

  it('never offers something that is not one of its copies', () => {
    expect(orphanedSources(['.DS_Store', 'notes', 'x/y.jpg'], null)).toEqual(
      []
    );
  });
});
