import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';

const DevelopmentRecipesPage = lazy(
  () => import('../app/pages/development-recipes/development-recipes-page')
);

// Define search param schema for type-safety and validation
const developmentSearchSchema = z.object({
  film: z.string().optional(),
  developer: z.string().optional(),
  dilution: z.string().optional(),
  iso: z.string().optional(),
  recipe: z.string().optional(),
  source: z.string().optional(),
  view: z.enum(['favorites', 'custom']).optional(),
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
