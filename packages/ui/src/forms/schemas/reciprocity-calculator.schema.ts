import { z } from 'zod';

/**
 * Validation schema for Reciprocity Calculator Form
 * Supports time format parsing: "30s", "1m30s", "2h", etc.
 */
export const reciprocityCalculatorSchema = z.object({
  filmType: z.string().min(1, 'Please select a film type'),

  customFactor: z
    .number()
    .min(0.1, 'Reciprocity factor must be at least 0.1')
    .max(10, 'Reciprocity factor cannot exceed 10')
    .optional()
    .default(1.3),

  meteredTime: z
    .string()
    .min(1, 'Please enter a metered time')
    .refine((value) => {
      const trimmed = value.trim();
      // Check if it matches time format: one or more unit groups (number + optional decimal + optional spaces + unit [s/m/h]) with optional spaces between groups
      // Examples: "30s", "1m30s", "2h", "1.5m", "1h 30m 45s", "1 h 30 m"
      if (/^(\d+(?:\.\d+)?\s*[smh])(\s*\d+(?:\.\d+)?\s*[smh])*$/i.test(trimmed))
        return true;
      // Check if it's a plain number (assume seconds)
      if (/^\d+(?:\.\d+)?$/.test(trimmed)) return true;
      return false;
    }, 'Enter time in format like "30s", "1m30s", "2h", or "1h 30m 45s"'),
});

export type ReciprocityCalculatorFormData = z.infer<
  typeof reciprocityCalculatorSchema
>;
