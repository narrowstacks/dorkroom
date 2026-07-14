import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';
import { developmentSearchSchema } from './search-schemas';

const DevelopmentRecipesPage = lazy(
  () => import('../app/pages/development-recipes/development-recipes-page')
);

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
    <Suspense fallback={<LoadingSpinner />}>
      <DevelopmentRecipesPage />
    </Suspense>
  ),
});
