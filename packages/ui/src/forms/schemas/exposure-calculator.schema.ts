import { z } from 'zod';
import { exposureTimeValidator, stopsValidator } from '@dorkroom/logic';

/**
 * Validation schema for Exposure Calculator Form
 */
export const exposureCalculatorSchema = z.object({
  originalTime: exposureTimeValidator(),
  stops: stopsValidator(),
});

export type ExposureCalculatorFormData = z.infer<
  typeof exposureCalculatorSchema
>;
