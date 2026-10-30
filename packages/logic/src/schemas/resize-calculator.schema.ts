import { z } from 'zod';
import { RESIZE_STORAGE_KEY } from '../constants/resize-calculator';
import { definePersistedFormFields } from '../utils/persisted-form-fields';
import {
  exposureTimeValidator,
  positiveDimensionValidator,
} from './validators';

/**
 * Validation schema for Resize Calculator Form
 * Handles two modes:
 * 1. Print Size Mode: Calculate time change from original to new print size
 * 2. Enlarger Height Mode: Calculate time change from original to new enlarger height
 */

const positiveNumber = positiveDimensionValidator();

/**
 * Per-field bounds for the Resize Calculator. The form schema below picks its
 * fields from this map, and the localStorage hydration validators are built
 * from all of it: both modes' fields persist, whichever mode is active.
 */
export const resizeCalculatorFieldSchemas = {
  isEnlargerHeightMode: z.boolean(),
  originalWidth: positiveNumber,
  originalLength: positiveNumber,
  newWidth: positiveNumber,
  newLength: positiveNumber,
  originalTime: exposureTimeValidator(),
  originalHeight: positiveNumber,
  newHeight: positiveNumber,
};

const fields = resizeCalculatorFieldSchemas;

export const resizeCalculatorSchema = z
  .object({
    isEnlargerHeightMode: fields.isEnlargerHeightMode,
    originalTime: fields.originalTime,
  })
  .and(
    z.discriminatedUnion('isEnlargerHeightMode', [
      // Print Size Mode
      z.object({
        isEnlargerHeightMode: z.literal(false),
        originalWidth: fields.originalWidth,
        originalLength: fields.originalLength,
        newWidth: fields.newWidth,
        newLength: fields.newLength,
      }),
      // Enlarger Height Mode
      z.object({
        isEnlargerHeightMode: z.literal(true),
        originalHeight: fields.originalHeight,
        newHeight: fields.newHeight,
      }),
    ])
  );

/** Storage key, persist keys and hydration validators for the form. */
export const resizeCalculatorPersistence = definePersistedFormFields(
  RESIZE_STORAGE_KEY,
  resizeCalculatorFieldSchemas
);

export type ResizeCalculatorFormData = z.infer<typeof resizeCalculatorSchema>;

// Export type discriminations for easier use
export type ResizePrintSizeMode = ResizeCalculatorFormData & {
  isEnlargerHeightMode: false;
};
export type ResizeEnlargerHeightMode = ResizeCalculatorFormData & {
  isEnlargerHeightMode: true;
};
