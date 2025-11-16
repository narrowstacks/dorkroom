import { z } from 'zod';

/**
 * Validation schema for Exposure Calculator Form
 */
export const exposureCalculatorSchema = z.object({
  originalTime: z
    .number()
    .min(0.1, 'Original time must be greater than 0')
    .max(3600, 'Original time cannot exceed 1 hour (3600 seconds)'),

  stops: z
    .number()
    .min(-5, 'Stops adjustment cannot be less than -5')
    .max(5, 'Stops adjustment cannot be more than +5'),
});

export type ExposureCalculatorFormData = z.infer<typeof exposureCalculatorSchema>;
