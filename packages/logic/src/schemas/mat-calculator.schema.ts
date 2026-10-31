import { z } from 'zod';
import { MAT_CALCULATOR_STORAGE_KEY } from '../constants/mat-calculator';
import { definePersistedFormFields } from '../utils/persisted-form-fields';

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
export const matCalculatorPersistence = definePersistedFormFields(
  MAT_CALCULATOR_STORAGE_KEY,
  matCalculatorFieldSchemas
);
