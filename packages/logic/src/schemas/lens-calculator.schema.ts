import { z } from 'zod';
import {
  MAX_FOCAL_LENGTH_MM,
  SENSOR_FORMAT_MAP,
} from '../constants/lens-calculator-defaults';
import { LENS_STORAGE_KEY } from '../types/lens-calculator';
import { definePersistedFormFields } from '../utils/persisted-form-fields';

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
export const lensCalculatorPersistence = definePersistedFormFields(
  LENS_STORAGE_KEY,
  lensCalculatorFieldSchemas
);
