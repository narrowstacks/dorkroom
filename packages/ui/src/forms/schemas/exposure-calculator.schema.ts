import { exposureTimeValidator, stopsValidator } from '@dorkroom/logic';
import { z } from 'zod';

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
