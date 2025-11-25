import { z } from 'zod';

/**
 * Valid contrast grades for multigrade paper
 */
export const contrastGradeSchema = z.enum([
  '00',
  '0',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '3.5',
  '4',
  '4.5',
  '5',
]);

/**
 * Validation schema for Split-Grade Calculator Form
 */
export const splitGradeCalculatorSchema = z.object({
  baseTime: z
    .number()
    .min(0.1, 'Base time must be greater than 0')
    .max(600, 'Base time cannot exceed 10 minutes (600 seconds)'),

  contrastBalance: z
    .number()
    .min(0, 'Contrast balance cannot be less than 0%')
    .max(100, 'Contrast balance cannot exceed 100%'),

  softGrade: contrastGradeSchema,

  hardGrade: contrastGradeSchema,

  useFilterFactors: z.boolean(),
});

export type SplitGradeCalculatorFormData = z.infer<
  typeof splitGradeCalculatorSchema
>;
