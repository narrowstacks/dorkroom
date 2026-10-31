import { z } from 'zod';
import { MAT_CALCULATOR_LINK_PARAMS } from '../constants/calculator-link-params';
import {
  MAT_CALCULATOR_DEFAULTS,
  MAT_CALCULATOR_STORAGE_KEY,
} from '../constants/mat-calculator';
import { defineCalculatorLink } from '../utils/calculator-url-params';
import { definePersistedCalculator } from '../utils/persisted-calculator';

// Mat inputs are fraction-friendly free text ("3 1/2"); unparseable strings
// already render as placeholders, so hydration only has to reject wrong types.
const matInput = z.string();

/**
 * Per-field bounds for the mat calculator. The key order is the persisted
 * snapshot's key order.
 */
export const matCalculatorFieldSchemas = {
  outerW: matInput,
  outerH: matInput,
  borderTop: matInput,
  borderBottom: matInput,
  borderLeft: matInput,
  borderRight: matInput,
  artW: matInput,
  artH: matInput,
  reveal: matInput,
  bottomWeight: z.boolean(),
};

/** Storage key, persist keys and hydration validators for the mat form. */
export const matCalculatorPersistence = definePersistedCalculator(
  MAT_CALCULATOR_STORAGE_KEY,
  matCalculatorFieldSchemas,
  MAT_CALCULATOR_DEFAULTS
);

/** Link that opens the mat calculator pre-filled (params: `MAT_CALCULATOR_LINK_PARAMS`). */
export const matCalculatorLink = defineCalculatorLink(
  matCalculatorPersistence,
  MAT_CALCULATOR_LINK_PARAMS
);
