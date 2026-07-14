import { z } from 'zod';

/**
 * Search param schemas for the routes.
 *
 * These live outside the route files so they can be unit-tested without those
 * files exporting non-components (which would break Fast Refresh).
 *
 * Values arrive as plain strings — see `parseSearch` in ./search-params. Invalid
 * params are silently recovered to undefined for better UX.
 */

export const developmentSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  film: z.string().optional().catch(undefined),
  developer: z.string().optional().catch(undefined),
  dilution: z.string().optional().catch(undefined),
  iso: z.string().optional().catch(undefined),
  recipe: z.string().optional().catch(undefined),
  source: z.string().optional().catch(undefined),
  view: z.enum(['favorites', 'custom']).optional().catch(undefined),
  developerType: z.string().optional().catch(undefined),
  recipeType: z.string().optional().catch(undefined),
  favorites: z.string().optional().catch(undefined),
});

export type DevelopmentSearchParams = z.infer<typeof developmentSearchSchema>;

export const filmsSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  color: z.enum(['bw', 'color', 'slide']).optional().catch(undefined),
  iso: z.string().optional().catch(undefined),
  brand: z.string().optional().catch(undefined),
  status: z.enum(['all', 'active', 'discontinued']).optional().catch(undefined),
  film: z.string().optional().catch(undefined), // direct link to expanded film
});

export type FilmsSearchParams = z.infer<typeof filmsSearchSchema>;
