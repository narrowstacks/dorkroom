import {
  exposureTimeValidator,
  positiveDimensionValidator,
} from '@dorkroom/logic';
import { z } from 'zod';

/**
 * Validation schema for Resize Calculator Form
 * Handles two modes:
 * 1. Print Size Mode: Calculate time change from original to new print size
 * 2. Enlarger Height Mode: Calculate time change from original to new enlarger height
 */

const positiveNumber = positiveDimensionValidator();

export const resizeCalculatorSchema = z
  .object({
    isEnlargerHeightMode: z.boolean(),
    originalTime: exposureTimeValidator(),
  })
  .and(
    z.discriminatedUnion('isEnlargerHeightMode', [
      // Print Size Mode
      z.object({
        isEnlargerHeightMode: z.literal(false),
        originalWidth: positiveNumber,
        originalLength: positiveNumber,
        newWidth: positiveNumber,
        newLength: positiveNumber,
      }),
      // Enlarger Height Mode
      z.object({
        isEnlargerHeightMode: z.literal(true),
        originalHeight: positiveNumber,
        newHeight: positiveNumber,
      }),
    ])
  );

export type ResizeCalculatorFormData = z.infer<typeof resizeCalculatorSchema>;

// Export type discriminations for easier use
export type ResizePrintSizeMode = ResizeCalculatorFormData & {
  isEnlargerHeightMode: false;
};
export type ResizeEnlargerHeightMode = ResizeCalculatorFormData & {
  isEnlargerHeightMode: true;
};
