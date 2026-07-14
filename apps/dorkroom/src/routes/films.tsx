import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';
import { filmsSearchSchema } from './search-schemas';

const FilmsPage = lazy(() => import('../app/pages/films/films-page'));

export const Route = createFileRoute('/films')({
  validateSearch: filmsSearchSchema,
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/films']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/films'] },
      { property: 'og:title', content: ROUTE_TITLES['/films'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/films'],
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <FilmsPage />
    </Suspense>
  ),
});
