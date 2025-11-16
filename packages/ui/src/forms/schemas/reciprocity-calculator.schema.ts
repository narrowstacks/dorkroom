import { z } from 'zod';

/**
 * Validation schema for Reciprocity Calculator Form
 * Supports time format parsing: "30s", "1m30s", "2h", etc.
 */
export const reciprocityCalculatorSchema = z.object({
  filmType: z
    .string()
    .min(1, 'Please select a film type'),

  customFactor: z
    .number()
    .min(0.1, 'Reciprocity factor must be at least 0.1')
    .max(10, 'Reciprocity factor cannot exceed 10')
    .optional()
    .default(1.3),

  meteredTime: z
    .string()
    .min(1, 'Please enter a metered time')
    .refine(
      (value) => {
        const trimmed = value.trim();
        // Check if it matches time format: "30s", "1m30s", "2h", etc.
        if (/^(\d+(?:\.\d+)?)\s*[smh]/i.test(trimmed)) return true;
        // Check if it's a plain number (assume seconds)
        if (/^\d+(?:\.\d+)?$/.test(trimmed)) return true;
        return false;
      },
      'Enter time in format like "30s", "1m30s", or "2h"'
    ),
});

export type ReciprocityCalculatorFormData = z.infer<typeof reciprocityCalculatorSchema>;
