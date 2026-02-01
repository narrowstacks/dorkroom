import { SENSOR_FORMAT_MAP } from '@dorkroom/logic';
import { z } from 'zod';

/**
 * Validator for focal length values (in mm)
 */
export const focalLengthValidator = () =>
  z
    .number()
    .min(1, 'Focal length must be at least 1mm')
    .max(2000, 'Focal length cannot exceed 2000mm');

/**
 * Validator for sensor format selection
 */
export const sensorFormatValidator = () =>
  z.string().refine((val) => SENSOR_FORMAT_MAP[val] !== undefined, {
    message: 'Please select a valid format',
  });

/**
 * Validation schema for Lens Calculator Form
 */
export const lensCalculatorSchema = z.object({
  focalLength: focalLengthValidator(),
  sourceFormat: sensorFormatValidator(),
  targetFormat: sensorFormatValidator(),
});

export type LensCalculatorFormData = z.infer<typeof lensCalculatorSchema>;
