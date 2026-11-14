import { describe, expect, it } from 'vitest';
import type { Camera, Lens } from '@/schemas/film-log.schema';
import {
  type CameraLenses,
  cameraLensKind,
  camerasForLens,
  FIXED_LENS_CHOICE,
  fixedLensLabel,
  frameLensFields,
  frameLensName,
  initialLensChoice,
  lensChoiceForRoll,
  lensChoices,
  lensesForCamera,
  needsLensChoice,
  newFrameLensChoice,
  RECORDED_LENS_CHOICE,
} from './camera-lenses';

const at = '2026-01-01T00:00:00.000Z';
const camera = (id: string, extra: Partial<Camera> = {}): Camera => ({
  id,
  name: id,
  format: '35mm',
  createdAt: at,
  ...extra,
});
const lens = (id: string, extra: Partial<Lens> = {}): Lens => ({
  id,
  name: id,
  createdAt: at,
  ...extra,
});

/** The rule before #733 (`useLensesForCamera`), verbatim. */
const oldRule = (cameraId: string | undefined, lenses: readonly Lens[]) =>
  lenses.filter((l) => !l.cameraId || l.cameraId === cameraId);

const ids = (result: CameraLenses) =>
  result.kind === 'interchangeable' ? result.lenses.map((l) => l.id) : null;

describe('lensesForCamera: legacy data', () => {
  // Every shape of pin stored before #733, including the odd ones.
  const cameras = [camera('c1'), camera('c2'), camera('c3')];
  const lenses = [
    lens('any-undefined'),
    lens('any-null', { cameraId: null }),
    lens('any-empty', { cameraId: '' }),
    lens('on-c1', { cameraId: 'c1' }),
    lens('on-c2', { cameraId: 'c2' }),
    lens('on-c1-again', { cameraId: 'c1' }),
    lens('on-deleted', { cameraId: 'gone' }),
  ];

  it.each(['c1', 'c2', 'c3', 'gone', undefined])(
    'gives exactly the old list for camera %s',
    (cameraId) => {
      const result = lensesForCamera(cameraId, cameras, lenses);
      expect(result.kind).toBe('interchangeable');
      expect(ids(result)).toEqual(oldRule(cameraId, lenses).map((l) => l.id));
    }
  );

  it('matches the old rule over every subset of lenses and cameras', () => {
    for (let mask = 0; mask < 1 << lenses.length; mask++) {
      const subset = lenses.filter((_, i) => mask & (1 << i));
      for (const cameraId of ['c1', 'c2', 'gone', undefined]) {
        expect(ids(lensesForCamera(cameraId, cameras, subset))).toEqual(
          oldRule(cameraId, subset).map((l) => l.id)
        );
      }
    }
  });

  it('keeps the input order', () => {
    expect(ids(lensesForCamera('c1', cameras, lenses))).toEqual([
      'any-undefined',
      'any-null',
      'any-empty',
      'on-c1',
      'on-c1-again',
    ]);
  });
});

describe('lensesForCamera: mounts', () => {
  const bessa = camera('bessa', { mountId: 'leica-ltm' });
  const leicaM = camera('m6', { mountId: 'leica-m' });
  const fm2 = camera('fm2', { mountId: 'nikon-f' });
  const legacy = camera('old');
  const cameras = [bessa, leicaM, fm2, legacy];
  const skopar = lens('skopar', { mountId: 'leica-ltm' });
  const summicron = lens('summicron', { mountId: 'leica-m' });
  const adapted = lens('adapted', { mountId: 'leica-ltm', cameraId: 'm6' });
  const anyLens = lens('any');
  const pinnedToFm2 = lens('pinned', { cameraId: 'fm2' });
  const lenses = [skopar, summicron, adapted, anyLens, pinnedToFm2];

  it('offers the lenses with its mount, pinned ones and unassigned ones', () => {
    expect(ids(lensesForCamera('bessa', cameras, lenses))).toEqual([
      'skopar',
      'adapted',
      'any',
    ]);
    expect(ids(lensesForCamera('m6', cameras, lenses))).toEqual([
      'summicron',
      'adapted',
      'any',
    ]);
    expect(ids(lensesForCamera('fm2', cameras, lenses))).toEqual([
      'any',
      'pinned',
    ]);
  });

  it('never offers a mounted lens on a camera with no mount unless pinned', () => {
    expect(ids(lensesForCamera('old', cameras, lenses))).toEqual(['any']);
  });

  it('offers a lens on a body added later with the same mount', () => {
    const second = camera('bessa2', { mountId: 'leica-ltm' });
    expect(
      ids(lensesForCamera('bessa2', [...cameras, second], lenses))
    ).toEqual(['skopar', 'adapted', 'any']);
  });

  it('treats an unknown mount id as a mount like any other', () => {
    const odd = camera('odd', { mountId: 'custom-mount-lost' });
    const oddLens = lens('odd-lens', { mountId: 'custom-mount-lost' });
    expect(ids(lensesForCamera('odd', [odd], [oddLens, skopar]))).toEqual([
      'odd-lens',
    ]);
  });

  it('is the inverse of camerasForLens for mounted lenses', () => {
    for (const l of [skopar, summicron, adapted]) {
      for (const c of cameras) {
        const fits = camerasForLens(l, cameras).includes(c);
        const offered = ids(lensesForCamera(c.id, cameras, [l]))?.includes(
          l.id
        );
        // Offered either by mount (fits) or by its pin.
        expect(offered).toBe(fits || l.cameraId === c.id);
      }
    }
    expect(camerasForLens(anyLens, cameras)).toEqual([]);
  });
});

describe('fixed-lens cameras', () => {
  const gw690 = camera('gw', {
    format: '120',
    fixedLens: { focalLength: 90, maxAperture: 3.5 },
  });
  const pinned = lens('pinned', { cameraId: 'gw' });
  const any = lens('any');

  it('offer exactly their own lens, never a saved one', () => {
    expect(lensesForCamera('gw', [gw690], [pinned, any])).toEqual({
      kind: 'fixed',
      label: '90mm f/3.5',
    });
  });

  it('never fit a mounted lens, even with a stray mount id', () => {
    const both = camera('both', {
      mountId: 'leica-ltm',
      fixedLens: {},
    });
    expect(cameraLensKind(both)).toBe('fixed');
    expect(camerasForLens(lens('l', { mountId: 'leica-ltm' }), [both])).toEqual(
      []
    );
    expect(lensesForCamera('both', [both], [])).toEqual({
      kind: 'fixed',
      label: 'Fixed lens',
    });
  });

  it('label the lens by name, else focal length and aperture', () => {
    expect(fixedLensLabel({ name: ' EBC Fujinon ', focalLength: 90 })).toBe(
      'EBC Fujinon'
    );
    expect(fixedLensLabel({ focalLength: 35 })).toBe('35mm');
    expect(fixedLensLabel({ maxAperture: 2.8 })).toBe('f/2.8');
    expect(fixedLensLabel({})).toBe('Fixed lens');
  });

  it('kind is none for a camera with neither', () => {
    expect(cameraLensKind(camera('x'))).toBe('none');
    expect(cameraLensKind(camera('x', { mountId: 'nikon-f' }))).toBe('mount');
  });
});

describe("a frame's lens", () => {
  const fixed: CameraLenses = { kind: 'fixed', label: '90mm f/3.5' };
  const saved = [
    lens('l1', { name: 'Skopar' }),
    lens('l2', { name: 'Nokton' }),
  ];
  const interchangeable: CameraLenses = {
    kind: 'interchangeable',
    lenses: saved,
  };

  it('logs a new frame on a fixed-lens camera with its lens preselected', () => {
    const choice = initialLensChoice(fixed, undefined, 'l1');
    expect(choice).toBe(FIXED_LENS_CHOICE);
    expect(needsLensChoice(fixed, choice)).toBe(false);
    expect(needsLensChoice(fixed, undefined)).toBe(false);
    expect(frameLensFields(choice, fixed, undefined)).toEqual({
      lensId: undefined,
      fixedLensName: '90mm f/3.5',
    });
    expect(lensChoices(fixed, saved)).toEqual([
      { id: FIXED_LENS_CHOICE, name: '90mm f/3.5' },
    ]);
  });

  it('needs a pick only when saved lenses exist and none is chosen', () => {
    expect(needsLensChoice(interchangeable, undefined)).toBe(true);
    expect(needsLensChoice(interchangeable, 'l1')).toBe(false);
    expect(
      needsLensChoice({ kind: 'interchangeable', lenses: [] }, undefined)
    ).toBe(false);
  });

  it('stores a saved lens by id and clears a snapshot', () => {
    expect(
      frameLensFields('l2', interchangeable, { fixedLensName: '90mm f/3.5' })
    ).toEqual({ lensId: 'l2', fixedLensName: undefined });
  });

  it('keeps the snapshot when the camera was later edited', () => {
    const edited: CameraLenses = { kind: 'fixed', label: '65mm f/5.6' };
    const frame = { fixedLensName: '90mm f/3.5' };
    const choice = initialLensChoice(edited, frame, undefined);
    expect(choice).toBe(RECORDED_LENS_CHOICE);
    expect(lensChoices(edited, saved, frame)).toEqual([
      { id: RECORDED_LENS_CHOICE, name: '90mm f/3.5' },
      { id: FIXED_LENS_CHOICE, name: '65mm f/5.6' },
    ]);
    expect(frameLensFields(choice, edited, frame)).toEqual({
      lensId: undefined,
      fixedLensName: '90mm f/3.5',
    });
  });

  it('keeps the snapshot when the camera became interchangeable or was deleted', () => {
    const frame = { fixedLensName: '90mm f/3.5' };
    const none: CameraLenses = { kind: 'interchangeable', lenses: [] };
    const choice = initialLensChoice(none, frame, 'l1');
    expect(choice).toBe(RECORDED_LENS_CHOICE);
    expect(frameLensFields(choice, none, frame).fixedLensName).toBe(
      '90mm f/3.5'
    );
    expect(frameLensName(frame, () => undefined)).toBe('90mm f/3.5');
  });

  it('keeps a saved lens a frame recorded on a camera that is now fixed', () => {
    const frame = { lensId: 'l1' };
    expect(initialLensChoice(fixed, frame, undefined)).toBe('l1');
    expect(lensChoices(fixed, saved, frame)).toEqual([
      { id: FIXED_LENS_CHOICE, name: '90mm f/3.5' },
      { id: 'l1', name: 'Skopar' },
    ]);
    expect(frameLensFields('l1', fixed, frame)).toEqual({
      lensId: 'l1',
      fixedLensName: undefined,
    });
  });

  it('never invents a lens for an existing frame that had none', () => {
    expect(initialLensChoice(fixed, {}, 'l1')).toBeUndefined();
    expect(initialLensChoice(interchangeable, {}, 'l1')).toBeUndefined();
    expect(initialLensChoice(interchangeable, undefined, 'l1')).toBe('l1');
  });

  it('names a frame by its saved lens, else its snapshot', () => {
    const names = (id: string) => (id === 'l1' ? 'Skopar' : undefined);
    expect(frameLensName({ lensId: 'l1' }, names)).toBe('Skopar');
    expect(frameLensName({ lensId: 'deleted' }, names)).toBeUndefined();
    expect(frameLensName({ fixedLensName: '35mm f/2.8' }, names)).toBe(
      '35mm f/2.8'
    );
    expect(frameLensName({}, names)).toBeUndefined();
  });
});

describe('switching the roll of a new frame (#733 review)', () => {
  const fixed: CameraLenses = { kind: 'fixed', label: '90mm f/3.5' };
  const ltm: CameraLenses = {
    kind: 'interchangeable',
    lenses: [lens('skopar'), lens('nokton')],
  };
  const nikon: CameraLenses = {
    kind: 'interchangeable',
    lenses: [lens('nikkor')],
  };

  it('resets to the new roll own default', () => {
    expect(newFrameLensChoice(fixed, 'skopar')).toBe(FIXED_LENS_CHOICE);
    expect(newFrameLensChoice(ltm, 'nokton')).toBe('nokton');
    // A last-used lens the camera no longer offers is no default.
    expect(newFrameLensChoice(nikon, 'skopar')).toBeUndefined();
    expect(newFrameLensChoice(ltm, undefined)).toBeUndefined();
  });

  it('fixed lens to interchangeable: a stale fixed choice stores no lens', () => {
    expect(frameLensFields(FIXED_LENS_CHOICE, ltm, undefined)).toEqual({
      lensId: undefined,
      fixedLensName: undefined,
    });
    // After the reset it stores the chosen lens.
    const choice = newFrameLensChoice(ltm, 'skopar');
    expect(frameLensFields(choice, ltm, undefined)).toEqual({
      lensId: 'skopar',
      fixedLensName: undefined,
    });
  });

  it('interchangeable to fixed lens: a stale lens id is dropped', () => {
    expect(frameLensFields('skopar', fixed, undefined)).toEqual({
      lensId: undefined,
      fixedLensName: undefined,
    });
    expect(
      frameLensFields(newFrameLensChoice(fixed, 'skopar'), fixed, undefined)
    ).toEqual({ lensId: undefined, fixedLensName: '90mm f/3.5' });
  });

  it('a lens from another interchangeable camera is dropped on a new frame', () => {
    expect(frameLensFields('skopar', nikon, undefined).lensId).toBeUndefined();
    expect(frameLensFields(RECORDED_LENS_CHOICE, nikon, undefined)).toEqual({
      lensId: undefined,
      fixedLensName: undefined,
    });
  });

  it('an existing frame keeps a lens that no longer fits or was deleted', () => {
    expect(frameLensFields('skopar', nikon, { lensId: 'skopar' }).lensId).toBe(
      'skopar'
    );
    expect(
      frameLensFields('deleted', fixed, { lensId: 'deleted' }).lensId
    ).toBe('deleted');
  });

  it('an existing fixed-lens frame keeps its snapshot when the camera is no longer fixed', () => {
    expect(
      frameLensFields(FIXED_LENS_CHOICE, ltm, { fixedLensName: '90mm f/3.5' })
    ).toEqual({ lensId: undefined, fixedLensName: '90mm f/3.5' });
  });
});

describe('lensChoiceForRoll (the shot form roll picker)', () => {
  const bessa = camera('bessa', { mountId: 'leica-ltm' });
  const gw = camera('gw', { fixedLens: { focalLength: 90, maxAperture: 3.5 } });
  const skopar = lens('skopar', { mountId: 'leica-ltm' });
  const nikkor = lens('nikkor', { mountId: 'nikon-f' });
  const frame = (lensId?: string) => ({
    id: `f-${lensId ?? 'none'}`,
    frameNumber: 1,
    lensId,
    source: 'manual' as const,
  });
  const rolls = [
    { id: 'r-bessa', cameraId: 'bessa', shots: [frame('skopar')] },
    { id: 'r-gw', cameraId: 'gw', shots: [frame()] },
    { id: 'r-stale', cameraId: 'bessa', shots: [frame('nikkor')] },
  ];
  const all = [skopar, nikkor];

  it('resets to the fixed lens, then back to the roll last-used lens', () => {
    expect(lensChoiceForRoll('r-gw', rolls, [bessa, gw], all)).toBe(
      FIXED_LENS_CHOICE
    );
    expect(lensChoiceForRoll('r-bessa', rolls, [bessa, gw], all)).toBe(
      'skopar'
    );
  });

  it('never resets to a last-used lens the camera no longer offers', () => {
    expect(
      lensChoiceForRoll('r-stale', rolls, [bessa, gw], all)
    ).toBeUndefined();
    expect(lensChoiceForRoll('gone', rolls, [bessa, gw], all)).toBeUndefined();
  });
});
