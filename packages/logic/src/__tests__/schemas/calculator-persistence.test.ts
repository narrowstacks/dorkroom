import { describe, expect, it } from 'vitest';
import { CAMERA_EXPOSURE_DEFAULTS } from '../../constants/camera-exposure-defaults';
import {
  DEFAULT_EXPOSURE_ORIGINAL_TIME,
  DEFAULT_EXPOSURE_STOPS,
} from '../../constants/exposure-calculator-defaults';
import { LENS_DEFAULTS } from '../../constants/lens-calculator-defaults';
import { MAT_CALCULATOR_DEFAULTS } from '../../constants/mat-calculator';
import {
  DEFAULT_RECIPROCITY_CUSTOM_FACTOR,
  DEFAULT_RECIPROCITY_METERED_TIME,
  RECIPROCITY_CALCULATOR_DEFAULTS,
} from '../../constants/reciprocity-calculator-defaults';
import { RESIZE_FORM_DEFAULTS } from '../../constants/resize-calculator';
import {
  borderCalculatorPersistence,
  initialState as borderInitialState,
} from '../../hooks/border-calculator/use-border-calculator-state';
import type { PersistedValue } from '../../hooks/use-local-storage-form-persistence';
import { cameraExposurePersistence } from '../../schemas/camera-exposure-calculator.schema';
import { exposureCalculatorPersistence } from '../../schemas/exposure-calculator.schema';
import { lensCalculatorPersistence } from '../../schemas/lens-calculator.schema';
import { matCalculatorPersistence } from '../../schemas/mat-calculator.schema';
import { reciprocityCalculatorPersistence } from '../../schemas/reciprocity-calculator.schema';
import { resizeCalculatorPersistence } from '../../schemas/resize-calculator.schema';
import type { PersistedFormFields } from '../../utils/persisted-form-fields';

// Storage keys and persist-key order for exposure, resize and reciprocity are
// pinned in the web app's hydration tests (#488); this table covers the rest.
// Existing users' saved snapshots are keyed by these exact storage keys and
// field names. Changing one silently drops their saved state, so they are
// pinned here rather than inferred.
describe('calculator persistence contract', () => {
  it.each([
    [
      'mat',
      matCalculatorPersistence,
      'matCalculatorState_v1',
      [
        'outerW',
        'outerH',
        'borderTop',
        'borderBottom',
        'borderLeft',
        'borderRight',
        'artW',
        'artH',
        'reveal',
        'bottomWeight',
      ],
    ],
    [
      'camera exposure',
      cameraExposurePersistence,
      'cameraExposureCalculatorState_v1',
      [
        'aperture',
        'shutterSpeed',
        'iso',
        'solveFor',
        'compareAperture',
        'compareShutterSpeed',
        'compareIso',
      ],
    ],
    [
      'lens',
      lensCalculatorPersistence,
      'lensCalculatorState_v1',
      ['focalLength', 'sourceFormat', 'targetFormat'],
    ],
    [
      'border',
      borderCalculatorPersistence,
      'borderCalculatorState_v2',
      [
        'aspectRatio',
        'paperSize',
        'customAspectWidth',
        'customAspectHeight',
        'customPaperWidth',
        'customPaperHeight',
        'minBorder',
        'enableOffset',
        'ignoreMinBorder',
        'horizontalOffset',
        'verticalOffset',
        'showBlades',
        'showBladeReadings',
        'isLandscape',
        'isRatioFlipped',
        'hasManuallyFlippedPaper',
        'lastValidCustomAspectWidth',
        'lastValidCustomAspectHeight',
        'lastValidCustomPaperWidth',
        'lastValidCustomPaperHeight',
        'lastValidMinBorder',
      ],
    ],
  ])('%s keeps its storage key and persist keys', (_, p, key, keys) => {
    expect(p.storageKey).toBe(key);
    expect(p.persistKeys).toEqual(keys);
    expect(Object.keys(p.validators)).toEqual(keys);
  });

  it('every persisted default passes its own validator', () => {
    const check = <K extends string>(
      name: string,
      persistence: PersistedFormFields<K>,
      defaults: Record<K, PersistedValue>
    ) => {
      for (const key of persistence.persistKeys) {
        expect(
          persistence.validators[key].validate(defaults[key]),
          `${name}.${key}`
        ).toBe(true);
      }
    };
    check('mat', matCalculatorPersistence, MAT_CALCULATOR_DEFAULTS);
    check('camera', cameraExposurePersistence, CAMERA_EXPOSURE_DEFAULTS);
    check('lens', lensCalculatorPersistence, LENS_DEFAULTS);
    check('exposure', exposureCalculatorPersistence, {
      originalTime: DEFAULT_EXPOSURE_ORIGINAL_TIME,
      stops: DEFAULT_EXPOSURE_STOPS,
    });
    check('reciprocity', reciprocityCalculatorPersistence, {
      filmType: RECIPROCITY_CALCULATOR_DEFAULTS.filmType,
      meteredTime: DEFAULT_RECIPROCITY_METERED_TIME,
      customFactor: DEFAULT_RECIPROCITY_CUSTOM_FACTOR,
    });
    check('resize', resizeCalculatorPersistence, RESIZE_FORM_DEFAULTS);
    check('border', borderCalculatorPersistence, borderInitialState);
  });

  it('camera exposure rejects an unknown solveFor and non-positive numbers', () => {
    const { validators } = cameraExposurePersistence;
    expect(validators.solveFor.validate('iso')).toBe(true);
    expect(validators.solveFor.validate('bogus')).toBe(false);
    expect(validators.aperture.validate(0)).toBe(false);
    expect(validators.aperture.validate(undefined)).toBe(false);
  });

  it('lens rejects out-of-range focal lengths and unknown formats', () => {
    const { validators } = lensCalculatorPersistence;
    expect(validators.focalLength.validate(50)).toBe(true);
    expect(validators.focalLength.validate(10001)).toBe(false);
    expect(validators.sourceFormat.validate('full-frame')).toBe(true);
    expect(validators.sourceFormat.validate('nope')).toBe(false);
  });

  it('mat accepts strings for inputs and a boolean for the flag only', () => {
    const { validators } = matCalculatorPersistence;
    expect(validators.outerW.validate('3 1/2')).toBe(true);
    expect(validators.outerW.validate(3)).toBe(false);
    expect(validators.bottomWeight.validate(true)).toBe(true);
    expect(validators.bottomWeight.validate('true')).toBe(false);
  });
});
