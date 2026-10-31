import { z } from 'zod';
import { EXPOSURE_CALCULATOR_LINK_PARAMS } from '../constants/calculator-link-params';
import {
  DEFAULT_EXPOSURE_ORIGINAL_TIME,
  DEFAULT_EXPOSURE_STOPS,
} from '../constants/exposure-calculator-defaults';
import {
  EXPOSURE_STORAGE_KEY,
  type ExposureFormState,
} from '../types/exposure-calculator';
import { defineCalculatorLink } from '../utils/calculator-url-params';
import { definePersistedCalculator } from '../utils/persisted-calculator';
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

/** The stops calculator's form defaults. */
export const EXPOSURE_FORM_DEFAULTS: ExposureFormState = {
  originalTime: DEFAULT_EXPOSURE_ORIGINAL_TIME,
  stops: DEFAULT_EXPOSURE_STOPS,
};

/** Storage key, persist keys, hydration validators and defaults for the form. */
export const exposureCalculatorPersistence = definePersistedCalculator(
  EXPOSURE_STORAGE_KEY,
  exposureCalculatorFieldSchemas,
  EXPOSURE_FORM_DEFAULTS
);

/** Link that opens the stops calculator pre-filled (params: `EXPOSURE_CALCULATOR_LINK_PARAMS`). */
export const exposureCalculatorLink = defineCalculatorLink(
  exposureCalculatorPersistence,
  EXPOSURE_CALCULATOR_LINK_PARAMS
);
