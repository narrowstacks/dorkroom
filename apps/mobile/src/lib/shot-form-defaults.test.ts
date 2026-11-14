import { describe, expect, it } from 'vitest';
import type { Shot } from '@/schemas/film-log.schema';
import {
  firstParam,
  presentParam,
  shotFormDefaults,
  shotFormFields,
  type ShotFormValues,
} from './shot-form-defaults';

const shot = (overrides: Partial<Shot> = {}): Shot => ({
  id: 's1',
  frameNumber: 1,
  source: 'manual',
  ...overrides,
});

const lenses = [{ id: 'l1' }, { id: 'l2' }];
const roll = {
  shots: [shot({ lensId: 'l1', place: 'Harbor' })],
};

describe('firstParam', () => {
  it('takes the first of several values', () => {
    expect(firstParam(['a', 'b'])).toBe('a');
    expect(firstParam('a')).toBe('a');
  });

  it('is undefined when absent or empty', () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam('')).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});

describe('presentParam', () => {
  it('keeps an empty value, which means cleared', () => {
    expect(presentParam('')).toBe('');
    expect(presentParam([''])).toBe('');
    expect(presentParam('a')).toBe('a');
  });

  it('is undefined only when absent', () => {
    expect(presentParam(undefined)).toBeUndefined();
    expect(presentParam([])).toBeUndefined();
  });
});

describe('shotFormDefaults', () => {
  it('treats present-but-empty params as cleared, with no fallback', () => {
    expect(
      shotFormDefaults(
        { lensId: '', place: '', notes: '' },
        undefined,
        roll,
        lenses
      )
    ).toMatchObject({ lensId: undefined, place: '', notes: '' });
  });

  it('falls back only for an absent param', () => {
    expect(
      shotFormDefaults({ place: '' }, undefined, roll, lenses)
    ).toMatchObject({
      lensId: 'l1',
      place: '',
      notes: '',
    });
    expect(
      shotFormDefaults({ lensId: '' }, undefined, roll, lenses)
    ).toMatchObject({
      lensId: undefined,
      place: 'Harbor',
      notes: '',
    });
  });

  it('starts an existing shot as saved, never from params or the roll', () => {
    expect(
      shotFormDefaults(
        { lensId: 'l2', place: 'Pier', notes: 'from params' },
        shot({ id: 'e' }),
        roll,
        lenses
      )
    ).toMatchObject({ lensId: undefined, place: '', notes: '' });
    expect(
      shotFormDefaults(
        {},
        shot({ lensId: 'l2', place: 'Pier', notes: 'kept' }),
        roll,
        lenses
      )
    ).toMatchObject({ lensId: 'l2', place: 'Pier', notes: 'kept' });
  });

  it("leaves an existing shot's unset exposure and back unset", () => {
    const defaults = shotFormDefaults(
      {},
      shot({ shutterSpeed: 30 }),
      { shots: [], back: 'A12 #1' },
      lenses,
      { aperture: 4, shutterSpeed: 0.5 }
    );
    expect(defaults.aperture).toBeUndefined();
    expect(defaults.shutterSpeed).toBe(30);
    expect(defaults.back).toBeUndefined();
  });

  it('starts a new shot at the default exposure and the roll back', () => {
    expect(
      shotFormDefaults({}, undefined, { shots: [], back: 'A12 #1' }, lenses)
    ).toMatchObject({ aperture: 8, shutterSpeed: 0.008, back: 'A12 #1' });
  });

  it('starts a new shot at the metered exposure when one was handed over', () => {
    expect(
      shotFormDefaults({}, undefined, roll, lenses, {
        aperture: 5.6,
        shutterSpeed: 0.004,
      })
    ).toMatchObject({ aperture: 5.6, shutterSpeed: 0.004 });
  });

  it('takes a new shot from the params', () => {
    expect(
      shotFormDefaults(
        { lensId: 'l2', place: 'Pier', notes: 'backlit' },
        undefined,
        roll,
        lenses
      )
    ).toMatchObject({ lensId: 'l2', place: 'Pier', notes: 'backlit' });
  });

  it('falls back to the last lens and place on the roll', () => {
    expect(shotFormDefaults({}, undefined, roll, lenses)).toMatchObject({
      lensId: 'l1',
      place: 'Harbor',
      notes: '',
    });
  });

  it('ignores a lens param that is not one of the roll camera lenses', () => {
    expect(
      shotFormDefaults({ lensId: 'gone' }, undefined, roll, lenses).lensId
    ).toBe('l1');
    expect(shotFormDefaults({ lensId: 'l2' }, undefined, roll, []).lensId).toBe(
      'l1'
    );
  });

  it('reads array params by their first value', () => {
    expect(
      shotFormDefaults(
        { lensId: ['l2', 'l1'], place: ['Pier', 'x'], notes: ['n', 'm'] },
        undefined,
        roll,
        lenses
      )
    ).toMatchObject({ lensId: 'l2', place: 'Pier', notes: 'n' });
  });

  it('copes with no roll', () => {
    expect(shotFormDefaults({}, undefined, undefined, [])).toMatchObject({
      lensId: undefined,
      place: '',
      notes: '',
    });
  });
});

describe('shotFormFields', () => {
  const fromShot = (existing: Shot): ShotFormValues => {
    const defaults = shotFormDefaults({}, existing, undefined, []);
    return {
      frameNumber: existing.frameNumber,
      aperture: defaults.aperture,
      shutterSpeed: defaults.shutterSpeed,
      lensId: defaults.lensId,
      back: defaults.back,
      notes: defaults.notes,
      place: defaults.place,
      photo: existing.photo,
      location: defaults.location,
    };
  };
  const context = { showBacks: false, source: 'manual' as const };

  it('round-trips a non-standard shutter when only the place is edited', () => {
    const existing = shot({
      id: 'e',
      frameNumber: 2,
      shutterSpeed: 188.3,
      notes: 'kept',
      place: 'Mission',
    });
    const fields = shotFormFields(
      { ...fromShot(existing), place: 'Missionx' },
      context
    );
    expect(fields.shutterSpeed).toBe(188.3);
    expect(fields.place).toBe('Missionx');
    expect(fields.notes).toBe('kept');
  });

  it('keeps an unset aperture, back and lens unset', () => {
    const fields = shotFormFields(
      fromShot(shot({ id: 'e', frameNumber: 2, shutterSpeed: 30 })),
      { showBacks: true, source: 'manual' }
    );
    expect(fields.aperture).toBeUndefined();
    expect(fields.back).toBeUndefined();
    expect(fields.lensId).toBeUndefined();
  });

  it('leaves out empty notes and place', () => {
    const fields = shotFormFields(
      {
        ...fromShot(shot({ id: 'e', frameNumber: 2 })),
        notes: '',
        place: '  ',
      },
      context
    );
    expect(fields.notes).toBeUndefined();
    expect(fields.place).toBeUndefined();
  });

  it('writes a new shot its defaults', () => {
    const defaults = shotFormDefaults(
      {},
      undefined,
      { shots: [], back: 'A12' },
      []
    );
    const fields = shotFormFields(
      {
        frameNumber: 1,
        aperture: defaults.aperture,
        shutterSpeed: defaults.shutterSpeed,
        lensId: defaults.lensId,
        back: defaults.back,
        notes: defaults.notes,
        place: defaults.place,
        photo: undefined,
        location: defaults.location,
      },
      { showBacks: true, source: 'meter' }
    );
    expect(fields).toMatchObject({
      frameNumber: 1,
      aperture: 8,
      shutterSpeed: 0.008,
      back: 'A12',
      source: 'meter',
    });
  });

  it('drops the back for a camera that does not use backs', () => {
    expect(
      shotFormFields(
        { ...fromShot(shot({ id: 'e', frameNumber: 1, back: 'A12' })) },
        context
      ).back
    ).toBeUndefined();
  });
});

describe('shot location', () => {
  const location = { latitude: 37.7749, longitude: -122.4194 };
  const fieldsFor = (existing: Shot, patch: Partial<ShotFormValues> = {}) => {
    const defaults = shotFormDefaults({}, existing, undefined, []);
    return shotFormFields(
      {
        frameNumber: existing.frameNumber,
        aperture: defaults.aperture,
        shutterSpeed: defaults.shutterSpeed,
        lensId: defaults.lensId,
        back: defaults.back,
        notes: defaults.notes,
        place: defaults.place,
        photo: existing.photo,
        location: defaults.location,
        ...patch,
      },
      { showBacks: false, source: 'manual' }
    );
  };

  it('starts an existing shot with its own location', () => {
    expect(
      shotFormDefaults({}, shot({ location }), undefined, []).location
    ).toEqual(location);
  });

  it('keeps an existing location when only the notes change', () => {
    expect(fieldsFor(shot({ location }), { notes: 'x' }).location).toEqual(
      location
    );
  });

  it('removes it when the user removes it', () => {
    expect(
      fieldsFor(shot({ location }), { location: undefined }).location
    ).toBeUndefined();
  });

  it('does not give a new shot the previous frame location', () => {
    const previous = { shots: [shot({ place: 'Harbor', location })] };
    const defaults = shotFormDefaults({}, undefined, previous, []);
    expect(defaults.place).toBe('Harbor');
    expect(defaults.location).toBeUndefined();
  });

  it('ignores a location route param, even a valid one', () => {
    const planted = JSON.stringify(location);
    const params = { place: undefined, location: planted };
    expect(
      shotFormDefaults(params, undefined, roll, []).location
    ).toBeUndefined();
    expect(
      shotFormDefaults(params, shot({ id: 'e' }), roll, []).location
    ).toBeUndefined();
  });
});
