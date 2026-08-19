import { z } from 'zod';

/**
 * Which recipes the development-recipes list shows. Shared by the filter UI and
 * the `recipeType` URL parameter, so a URL value is parsed into this contract
 * once and stays narrowed downstream.
 */
export const customRecipeFilterSchema = z.enum([
  'all',
  'hide-custom',
  'only-custom',
  'official',
]);

export type CustomRecipeFilter = z.infer<typeof customRecipeFilterSchema>;
