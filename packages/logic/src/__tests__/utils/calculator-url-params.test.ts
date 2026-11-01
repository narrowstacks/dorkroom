import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  BORDER_CALCULATOR_LINK_PARAMS,
  CAMERA_EXPOSURE_LINK_PARAMS,
  EXPOSURE_CALCULATOR_LINK_PARAMS,
  LENS_CALCULATOR_LINK_PARAMS,
  MAT_CALCULATOR_LINK_PARAMS,
  RECIPROCITY_CALCULATOR_LINK_PARAMS,
  RESIZE_CALCULATOR_LINK_PARAMS,
  SHARED_LINK_MARKER,
} from '../../constants/calculator-link-params';
import { borderCalculatorLink } from '../../schemas/border-calculator-persistence';
import { cameraExposureLink } from '../../schemas/camera-exposure-calculator.schema';
import { lensCalculatorLink } from '../../schemas/lens-calculator.schema';
import { matCalculatorLink } from '../../schemas/mat-calculator.schema';
import { reciprocityCalculatorLink } from '../../schemas/reciprocity-calculator.schema';
import { defineCalculatorLink } from '../../utils/calculator-url-params';
import { definePersistedCalculator } from '../../utils/persisted-calculator';

interface TestForm {
  time: number;
  enabled: boolean;
  label: string;
  notPersisted: string;
}

const DEFAULTS: TestForm = {
  time: 10,
  enabled: false,
  label: 'base',
  notPersisted: '',
};

const definition = definePersistedCalculator(
  'calculatorLinkTest_v1',
  {
    time: z.number().positive().max(100),
    enabled: z.boolean(),
    label: z.enum(['base', 'other']),
  },
  DEFAULTS
);

const link = defineCalculatorLink(definition, {
  t: 'time',
  on: 'enabled',
  label: 'label',
});

describe('defineCalculatorLink', () => {
  describe('read', () => {
    it('reads each param as the type its field validator accepts', () => {
      expect(link.read({ t: '42', on: 'true', label: 'other' })).toEqual({
        time: 42,
        enabled: true,
        label: 'other',
      });
    });

    it('reads a comma decimal and a simple fraction', () => {
      expect(link.read({ t: '12,5' }).time).toBe(12.5);
      expect(link.read({ t: '1/4' }).time).toBe(0.25);
    });

    it('reads a signed fraction, and drops a malformed one', () => {
      const signed = defineCalculatorLink(
        definePersistedCalculator(
          'calculatorLinkSignedTest_v1',
          { stops: z.number().min(-10).max(10) },
          { stops: 0 }
        ),
        { stops: 'stops' }
      );
      expect(signed.read({ stops: '-1/3' }).stops).toBeCloseTo(-1 / 3);
      expect(signed.read({ stops: '-1' }).stops).toBe(-1);
      expect(signed.read({ stops: '1/0' })).toEqual({});
      expect(signed.read({ stops: '1/2/3' })).toEqual({});
    });

    it('trims values, and ignores empty ones for fields that cannot be empty', () => {
      expect(link.read({ t: ' 7 ', label: '  other ' })).toEqual({
        time: 7,
        label: 'other',
      });
      expect(link.read({ t: '', label: '   ' })).toEqual({});
    });

    it.each([
      ['true', true],
      ['TRUE', true],
      ['1', true],
      ['false', false],
      ['False', false],
      ['0', false],
    ])('reads the boolean %s as %s', (raw, expected) => {
      expect(link.read({ on: raw })).toEqual({ enabled: expected });
    });

    it('drops a boolean it cannot read', () => {
      expect(link.read({ on: 'yes' })).toEqual({});
    });

    it('drops values their field validator rejects', () => {
      expect(link.read({ t: '500', label: 'nope' })).toEqual({});
      expect(link.read({ t: 'abc' })).toEqual({});
      expect(link.read({ t: '-3' })).toEqual({});
      expect(link.read({ t: '1,234.5' })).toEqual({});
    });

    it("reads the same text by each field's type", () => {
      // "1" is a number for a numeric field, true for a boolean field.
      expect(link.read({ t: '1', on: '1' })).toEqual({
        time: 1,
        enabled: true,
      });
    });

    it('ignores unknown params, field names and missing values', () => {
      expect(
        link.read({
          preset: 'abc',
          time: '5',
          notPersisted: 'x',
          label: undefined,
        })
      ).toEqual({});
    });
  });

  describe('build', () => {
    it('writes a param per set field', () => {
      expect(link.build({ time: 42, enabled: true, label: 'other' })).toEqual({
        t: '42',
        on: 'true',
        label: 'other',
      });
    });

    it('skips missing and null values', () => {
      expect(link.build({})).toEqual({});
      const values: Partial<TestForm> = { time: undefined };
      expect(link.build(values)).toEqual({});
    });

    it('round-trips through read', () => {
      const values = { time: 12.5, enabled: false, label: 'other' } as const;
      expect(link.read(link.build(values))).toEqual(values);
    });
  });

  describe('lensCalculatorLink', () => {
    it('reads a lens link into the calculator fields', () => {
      expect(
        lensCalculatorLink.read({
          focal: '80',
          from: 'film-6x6',
          to: 'full-frame',
        })
      ).toEqual({
        focalLength: 80,
        sourceFormat: 'film-6x6',
        targetFormat: 'full-frame',
      });
    });

    it('drops an unknown format id', () => {
      expect(lensCalculatorLink.read({ from: 'film-99x99' })).toEqual({});
    });

    it('builds the link back', () => {
      expect(
        lensCalculatorLink.build({ focalLength: 80, sourceFormat: 'film-6x6' })
      ).toEqual({ focal: '80', from: 'film-6x6' });
    });
  });
});

/**
 * Link param names are a public contract: shared links and the home-page
 * search build them, so renaming one breaks every link already out there.
 */
describe('calculator link param names', () => {
  it.each([
    [
      'border',
      BORDER_CALCULATOR_LINK_PARAMS,
      [
        'paper',
        'paperW',
        'paperH',
        'ratio',
        'ratioW',
        'ratioH',
        'border',
        'landscape',
        'flip',
        'offsets',
        'offsetH',
        'offsetV',
        'ignoreMin',
      ],
    ],
    ['stops', EXPOSURE_CALCULATOR_LINK_PARAMS, ['time', 'stops']],
    [
      'resize',
      RESIZE_CALCULATOR_LINK_PARAMS,
      ['height', 'fromW', 'fromL', 'toW', 'toL', 'time', 'fromH', 'toH'],
    ],
    ['lenses', LENS_CALCULATOR_LINK_PARAMS, ['focal', 'from', 'to']],
    [
      'reciprocity',
      RECIPROCITY_CALCULATOR_LINK_PARAMS,
      ['film', 'time', 'factor'],
    ],
    [
      'mat',
      MAT_CALCULATOR_LINK_PARAMS,
      [
        'outerW',
        'outerH',
        'top',
        'bottom',
        'left',
        'right',
        'artW',
        'artH',
        'reveal',
        'bottomWeight',
      ],
    ],
    [
      'exposure',
      CAMERA_EXPOSURE_LINK_PARAMS,
      ['aperture', 'shutter', 'iso', 'solve'],
    ],
  ] as const)('%s', (_route, params, names) => {
    expect(Object.keys(params)).toEqual(names);
  });

  it('reads border offsets within the slider bounds', () => {
    expect(
      borderCalculatorLink.read({
        offsetH: '1.5',
        offsetV: '-4',
        offsets: 'true',
        ignoreMin: '1',
      })
    ).toEqual({
      horizontalOffset: 1.5,
      enableOffset: true,
      ignoreMinBorder: true,
    });
  });

  it('keeps the border link clear of the shared-preset param', () => {
    expect(BORDER_CALCULATOR_LINK_PARAMS).not.toHaveProperty('preset');
  });

  it('pins the shared-link marker, the one recipe links already carry', () => {
    expect(SHARED_LINK_MARKER).toEqual({ param: 'source', value: 'share' });
  });

  it.each([
    BORDER_CALCULATOR_LINK_PARAMS,
    EXPOSURE_CALCULATOR_LINK_PARAMS,
    RESIZE_CALCULATOR_LINK_PARAMS,
    LENS_CALCULATOR_LINK_PARAMS,
    RECIPROCITY_CALCULATOR_LINK_PARAMS,
    MAT_CALCULATOR_LINK_PARAMS,
    CAMERA_EXPOSURE_LINK_PARAMS,
  ])('keeps every link clear of the shared-link marker', (params) => {
    expect(params).not.toHaveProperty(SHARED_LINK_MARKER.param);
  });

  it('reads a shared link as if the marker were absent', () => {
    expect(lensCalculatorLink.read({ focal: '80', source: 'share' })).toEqual(
      lensCalculatorLink.read({ focal: '80' })
    );
  });

  it('reads a camera shutter speed written as a fraction', () => {
    expect(
      cameraExposureLink.read({ shutter: '1/125', solve: 'aperture' })
    ).toEqual({
      shutterSpeed: 1 / 125,
      solveFor: 'aperture',
    });
  });

  it('keeps mat inputs as the fraction-friendly text they are', () => {
    expect(matCalculatorLink.read({ top: '3 1/2', bottomWeight: '1' })).toEqual(
      {
        borderTop: '3 1/2',
        bottomWeight: true,
      }
    );
  });

  it('clears a mat input for an empty param, as clearing it in the form does', () => {
    expect(matCalculatorLink.read({ artW: '', artH: ' ', reveal: '' })).toEqual(
      {
        artW: '',
        artH: '',
        reveal: '',
      }
    );
  });

  it('keeps cleared mat inputs in the link it builds', () => {
    const values = { outerW: '16', artW: '', reveal: '' };
    const search = matCalculatorLink.build(values);
    expect(search).toEqual({ outerW: '16', artW: '', reveal: '' });
    expect(matCalculatorLink.read(search)).toEqual(values);
  });

  it('reads a reciprocity film id and metered time', () => {
    expect(
      reciprocityCalculatorLink.read({
        film: 'hp5',
        time: '1m30s',
        factor: '1,4',
      })
    ).toEqual({ filmType: 'hp5', meteredTime: '1m30s', customFactor: 1.4 });
    expect(reciprocityCalculatorLink.read({ film: 'nope' })).toEqual({});
  });
});
