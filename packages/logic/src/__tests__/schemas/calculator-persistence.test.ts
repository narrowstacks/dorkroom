import { describe, expect, it } from 'vitest';
import { borderCalculatorPersistence } from '../../hooks/border-calculator/use-border-calculator-state';
import { cameraExposurePersistence } from '../../schemas/camera-exposure-calculator.schema';
import { exposureCalculatorPersistence } from '../../schemas/exposure-calculator.schema';
import { lensCalculatorPersistence } from '../../schemas/lens-calculator.schema';
import { matCalculatorPersistence } from '../../schemas/mat-calculator.schema';
import { reciprocityCalculatorPersistence } from '../../schemas/reciprocity-calculator.schema';
import { resizeCalculatorPersistence } from '../../schemas/resize-calculator.schema';

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
      'exposure',
      exposureCalculatorPersistence,
      'exposureCalculatorState_v1',
      ['originalTime', 'stops'],
    ],
  ])('%s keeps its storage key and persist keys', (_, p, key, keys) => {
    expect(p.storageKey).toBe(key);
    expect(p.persistKeys).toEqual(keys);
    expect(Object.keys(p.validators)).toEqual(keys);
  });

  it('border, resize and reciprocity keep their storage keys', () => {
    expect(borderCalculatorPersistence.storageKey).toBe(
      'borderCalculatorState_v2'
    );
    expect(borderCalculatorPersistence.persistKeys).toHaveLength(
      Object.keys(borderCalculatorPersistence.validators).length
    );
    expect(resizeCalculatorPersistence.storageKey).toBe(
      'resizeCalculatorState_v1'
    );
    expect(reciprocityCalculatorPersistence.storageKey).toBe(
      'reciprocityCalculatorState_v1'
    );
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
