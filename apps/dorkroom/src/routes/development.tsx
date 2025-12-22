import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';

const DevelopmentRecipesPage = lazy(
  () => import('../app/pages/development-recipes/development-recipes-page')
);

// Define search param schema for type-safety and validation
const developmentSearchSchema = z.object({
  film: z
    .string()
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV) console.warn('Invalid film param:', ctx.error);
      return undefined;
    }),
  developer: z
    .string()
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV)
        console.warn('Invalid developer param:', ctx.error);
      return undefined;
    }),
  dilution: z
    .string()
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV)
        console.warn('Invalid dilution param:', ctx.error);
      return undefined;
    }),
  iso: z
    .string()
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV) console.warn('Invalid iso param:', ctx.error);
      return undefined;
    }),
  recipe: z
    .string()
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV) console.warn('Invalid recipe param:', ctx.error);
      return undefined;
    }),
  source: z
    .string()
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV) console.warn('Invalid source param:', ctx.error);
      return undefined;
    }),
  view: z
    .enum(['favorites', 'custom'])
    .optional()
    .catch((ctx) => {
      if (import.meta.env.DEV) console.warn('Invalid view param:', ctx.error);
      return undefined;
    }),
});

export type DevelopmentSearchParams = z.infer<typeof developmentSearchSchema>;

export const Route = createFileRoute('/development')({
  validateSearch: developmentSearchSchema,
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/development']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/development'] },
      { property: 'og:title', content: ROUTE_TITLES['/development'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/development'],
      },
    ],
  }),
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
