import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';

const DevelopmentRecipesPage = lazy(
  () => import('../app/pages/development-recipes/development-recipes-page')
);

// Define search param schema for type-safety and validation
const developmentSearchSchema = z.object({
  film: z.string().optional().catch(undefined),
  developer: z.string().optional().catch(undefined),
  dilution: z.string().optional().catch(undefined),
  iso: z.string().optional().catch(undefined),
  recipe: z.string().optional().catch(undefined),
  source: z.string().optional().catch(undefined),
  view: z.enum(['favorites', 'custom']).optional().catch(undefined),
});

export type DevelopmentSearchParams = z.infer<typeof developmentSearchSchema>;

export const Route = createFileRoute('/development')({
  validateSearch: developmentSearchSchema,
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <DevelopmentRecipesPage />
    </Suspense>
  ),
});
