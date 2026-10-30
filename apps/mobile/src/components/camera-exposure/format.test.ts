import {
  type CameraExposureFormState,
  type ExposureComparison,
  STANDARD_APERTURES,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  describeComparison,
  formatPresetWarning,
  formatSettings,
  formatSignedStops,
  standardLookup,
  standardOptions,
} from './format';

const VALUES: CameraExposureFormState = {
  aperture: 8,
  shutterSpeed: 1 / 125,
  iso: 100,
  solveFor: 'shutterSpeed',
  compareAperture: 8,
  compareShutterSpeed: 1 / 125,
  compareIso: 100,
};

const comparison = (stopsDifference: number): ExposureComparison => ({
  evA: 13,
  evB: 13 - stopsDifference,
  stopsDifference,
  descriptionA: '',
  descriptionB: '',
  isValid: true,
});

describe('standard option helpers', () => {
  it('keys options by label and decodes them back', () => {
    const options = standardOptions(STANDARD_APERTURES);
    expect(options[0]).toEqual({ label: 'f/1', value: 'f/1' });
    expect(standardLookup(STANDARD_APERTURES).get('f/5.6')).toBe(5.6);
  });
});

describe('formatSettings', () => {
  it('joins aperture, shutter and ISO', () => {
    expect(formatSettings(8, 1 / 125, 400)).toBe('f/8 · 1/125 · ISO 400');
  });
});

describe('comparison text', () => {
  it('signs the stops difference', () => {
    expect(formatSignedStops(2)).toBe('+2');
    expect(formatSignedStops(-1.5)).toBe('−1.5');
    expect(formatSignedStops(0)).toBe('0');
  });

  it('describes which exposure is darker', () => {
    expect(describeComparison(comparison(1))).toBe('A is darker than B');
    expect(describeComparison(comparison(-1))).toBe('B is darker than A');
    expect(describeComparison(comparison(0))).toBe('Same exposure');
  });
});

describe('formatPresetWarning', () => {
  it('explains a shutter speed past the long end of the dial', () => {
    expect(
      formatPresetWarning(
        {
          presetEv: -2,
          variable: 'shutterSpeed',
          required: '256"',
          limit: '30"',
          direction: 'over',
        },
        VALUES
      )
    ).toBe(
      'Night Sky (EV -2) needs 256" at f/8, ISO 100: longer than the 30" limit. Use Bulb, or open the aperture / raise ISO.'
    );
  });

  it('names the other two settings for an aperture warning', () => {
    expect(
      formatPresetWarning(
        {
          presetEv: 16,
          variable: 'aperture',
          required: 'f/90',
          limit: 'f/64',
          direction: 'over',
        },
        VALUES
      )
    ).toBe(
      'Snow / Sand (EV 16) needs f/90 at 1/125, ISO 100: smaller than the f/64 limit. Use a faster shutter speed or lower ISO, or an ND filter.'
    );
  });

  it('falls back to the bare EV for an unknown preset', () => {
    expect(
      formatPresetWarning(
        {
          presetEv: 99,
          variable: 'iso',
          required: 'ISO 1',
          limit: 'ISO 25',
          direction: 'under',
        },
        VALUES
      )
    ).toMatch(/^EV 99 needs ISO 1 at f\/8, 1\/125: below the ISO 25 limit\./);
  });
});
