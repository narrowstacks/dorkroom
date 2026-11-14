import { describe, expect, it } from 'vitest';
import { joinFacts, spokenText } from '@/lib/film-log-options';
import type { Camera, Lens } from '@/schemas/film-log.schema';
import {
  cameraDetailLine,
  cameraDisplayName,
  fitsLine,
  lensDetailLine,
  lensDisplayName,
  mountName,
} from './gear-display';

const at = '2026-01-01T00:00:00.000Z';
const camera = (extra: Partial<Camera> = {}): Camera => ({
  id: 'c1',
  name: 'Bessa R',
  format: '35mm',
  createdAt: at,
  ...extra,
});
const lens = (extra: Partial<Lens> = {}): Lens => ({
  id: 'l1',
  name: '35mm f/2.5 Color Skopar',
  createdAt: at,
  ...extra,
});
const customMounts = [{ id: 'custom-mount-1', name: 'Graflex XL' }];

describe('cameraDisplayName', () => {
  it('shows a camera with no brand exactly as before', () => {
    expect(cameraDisplayName(camera())).toBe('Bessa R');
    expect(cameraDisplayName(camera({ brand: '  ' }))).toBe('Bessa R');
  });

  it('puts the brand first', () => {
    expect(cameraDisplayName(camera({ brand: 'Voigtländer' }))).toBe(
      'Voigtländer Bessa R'
    );
  });

  it('does not double a brand the name already has', () => {
    expect(cameraDisplayName({ brand: 'Nikon', name: 'Nikon FM2' })).toBe(
      'Nikon FM2'
    );
    expect(cameraDisplayName({ brand: 'Nikon', name: 'nikon FM2' })).toBe(
      'nikon FM2'
    );
    expect(
      cameraDisplayName({ brand: 'Voigtländer', name: 'Voigtlander Bessa R' })
    ).toBe('Voigtlander Bessa R');
    expect(cameraDisplayName({ brand: 'Leica', name: 'Leica' })).toBe('Leica');
  });

  it("skips a built-in brand's alias at the start, as a whole word", () => {
    expect(
      cameraDisplayName({ brand: 'Pentax', name: 'Asahi Pentax Spotmatic' })
    ).toBe('Asahi Pentax Spotmatic');
    expect(cameraDisplayName({ brand: 'Fujifilm', name: 'Fuji GW690' })).toBe(
      'Fuji GW690'
    );
    expect(cameraDisplayName({ brand: 'Fujifilm', name: 'Fujica ST801' })).toBe(
      'Fujica ST801'
    );
    // No false positive: an alias or brand that is only part of a word.
    expect(cameraDisplayName({ brand: 'Leica', name: 'Leicaflex SL' })).toBe(
      'Leica Leicaflex SL'
    );
    expect(cameraDisplayName({ brand: 'Fujifilm', name: 'Fujiyama 1' })).toBe(
      'Fujifilm Fujiyama 1'
    );
    // A custom brand has no aliases.
    expect(cameraDisplayName({ brand: 'Shen Hao', name: 'HZX45' })).toBe(
      'Shen Hao HZX45'
    );
  });

  it('only skips a whole-word brand at the start', () => {
    expect(cameraDisplayName({ brand: 'Nikon', name: 'Nikonos V' })).toBe(
      'Nikon Nikonos V'
    );
    expect(cameraDisplayName({ brand: 'Canon', name: 'AE-1 Canon' })).toBe(
      'Canon AE-1 Canon'
    );
  });

  it('uses the same rule for lenses', () => {
    expect(lensDisplayName(lens({ brand: 'Voigtländer' }))).toBe(
      'Voigtländer 35mm f/2.5 Color Skopar'
    );
    expect(lensDisplayName(lens())).toBe('35mm f/2.5 Color Skopar');
  });
});

describe('mountName', () => {
  it('names built-in, custom and unknown mounts', () => {
    expect(mountName('leica-ltm', [])).toBe('Leica thread mount (L39)');
    expect(mountName('custom-mount-1', customMounts)).toBe('Graflex XL');
    expect(mountName('custom-mount-lost', customMounts)).toBe('Unknown mount');
  });
});

// The lines are display strings (`joinFacts`, no-break spaces); compare
// them as VoiceOver reads them.
const cameraDetail = (...args: Parameters<typeof cameraDetailLine>) =>
  spokenText(cameraDetailLine(...args));
const lensDetail = (...args: Parameters<typeof lensDetailLine>) =>
  spokenText(lensDetailLine(...args));

it('joins detail facts with joinFacts', () => {
  expect(cameraDetailLine(camera({ mountId: 'leica-m' }), [])).toBe(
    joinFacts(['Leica M', '35mm'])
  );
});

describe('cameraDetailLine', () => {
  it('reads as before for a camera with no mount or fixed lens', () => {
    expect(cameraDetail(camera(), [])).toBe('35mm');
    expect(cameraDetail(camera({ format: '4x5', backs: ['A', 'B'] }), [])).toBe(
      '4×5 · 2 backs'
    );
    expect(cameraDetail(camera({ backs: ['A'] }), [])).toBe('35mm · 1 back');
  });

  it('leads with the mount or the fixed lens', () => {
    expect(cameraDetail(camera({ mountId: 'leica-ltm' }), [])).toBe(
      'Leica thread mount (L39) · 35mm'
    );
    expect(
      cameraDetail(
        camera({
          format: '120',
          fixedLens: { focalLength: 90, maxAperture: 3.5 },
        }),
        []
      )
    ).toBe('Fixed lens 90mm f/3.5 · 120');
    expect(cameraDetail(camera({ fixedLens: {} }), [])).toBe(
      'Fixed lens · 35mm'
    );
    expect(cameraDetail(camera({ mountId: 'gone' }), [])).toBe(
      'Unknown mount · 35mm'
    );
  });
});

describe('lensDetailLine', () => {
  const cameras = [camera(), camera({ id: 'c2', name: 'M6', brand: 'Leica' })];

  it('reads as before for a lens with no mount', () => {
    expect(lensDetail(lens({ focalLength: 35 }), cameras, [])).toBe(
      '35mm · Any camera'
    );
    expect(lensDetail(lens({ cameraId: 'c1' }), cameras, [])).toBe('Bessa R');
    expect(lensDetail(lens({ cameraId: 'deleted' }), cameras, [])).toBe(
      'Any camera'
    );
  });

  it('shows the mount, and a camera it is also pinned to', () => {
    expect(
      lensDetail(lens({ focalLength: 35, mountId: 'leica-ltm' }), cameras, [])
    ).toBe('35mm · Leica thread mount (L39)');
    expect(
      lensDetail(lens({ mountId: 'leica-ltm', cameraId: 'c2' }), cameras, [])
    ).toBe('Leica thread mount (L39) · also Leica M6');
  });
});

describe('fitsLine', () => {
  it('lists the cameras or says there are none', () => {
    expect(fitsLine([])).toBe('No cameras with this mount yet.');
    expect(
      fitsLine([
        camera({ brand: 'Voigtländer' }),
        camera({ id: 'c2', name: 'Leica IIIf' }),
      ])
    ).toBe('Fits: Voigtländer Bessa R, Leica IIIf');
  });
});
