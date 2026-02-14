import { focalLengthValidator, sensorFormatValidator } from '@dorkroom/logic';
import { z } from 'zod';

/**
 * Validation schema for Lens Calculator Form
 */
export const lensCalculatorSchema = z.object({
  focalLength: focalLengthValidator(),
  sourceFormat: sensorFormatValidator(),
  targetFormat: sensorFormatValidator(),
});

export type LensCalculatorFormData = z.infer<typeof lensCalculatorSchema>;
