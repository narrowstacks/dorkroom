import { z } from 'zod';
import { EXPOSURE_STORAGE_KEY } from '../types/exposure-calculator';
import { definePersistedFormFields } from '../utils/persisted-form-fields';
import { exposureTimeValidator, stopsValidator } from './validators';

/**
 * Per-field bounds for the Exposure Calculator. The form schema and the
 * localStorage hydration validators are both built from this map.
 */
export const exposureCalculatorFieldSchemas = {
  originalTime: exposureTimeValidator(),
  stops: stopsValidator(),
};

/**
 * Validation schema for Exposure Calculator Form
 */
export const exposureCalculatorSchema = z.object(
  exposureCalculatorFieldSchemas
);

export type ExposureCalculatorFormData = z.infer<
  typeof exposureCalculatorSchema
>;

/** Storage key, persist keys and hydration validators for the form. */
export const exposureCalculatorPersistence = definePersistedFormFields(
  EXPOSURE_STORAGE_KEY,
  exposureCalculatorFieldSchemas
);
