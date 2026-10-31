import { z } from 'zod';
import { LENS_CALCULATOR_LINK_PARAMS } from '../constants/calculator-link-params';
import {
  LENS_DEFAULTS,
  MAX_FOCAL_LENGTH_MM,
  SENSOR_FORMAT_MAP,
} from '../constants/lens-calculator-defaults';
import { LENS_STORAGE_KEY } from '../types/lens-calculator';
import { defineCalculatorLink } from '../utils/calculator-url-params';
import { definePersistedCalculator } from '../utils/persisted-calculator';

const sensorFormat = z
  .string()
  .refine((key) => SENSOR_FORMAT_MAP[key] !== undefined);

/**
 * Per-field bounds for the lens calculator. Persisted focal lengths outside
 * the range are discarded on hydration; so are unknown sensor formats.
 */
export const lensCalculatorFieldSchemas = {
  focalLength: z.number().positive().max(MAX_FOCAL_LENGTH_MM),
  sourceFormat: sensorFormat,
  targetFormat: sensorFormat,
};

/** Storage key, persist keys and hydration validators for the form. */
export const lensCalculatorPersistence = definePersistedCalculator(
  LENS_STORAGE_KEY,
  lensCalculatorFieldSchemas,
  LENS_DEFAULTS
);

/** Link that opens the lens calculator pre-filled (params: `LENS_CALCULATOR_LINK_PARAMS`). */
export const lensCalculatorLink = defineCalculatorLink(
  lensCalculatorPersistence,
  LENS_CALCULATOR_LINK_PARAMS
);
