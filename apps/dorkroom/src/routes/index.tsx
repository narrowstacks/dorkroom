import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const HomePage = lazy(() => import('../app/pages/home-page'));

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: ROUTE_TITLES['/'] },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/'] },
      { property: 'og:title', content: ROUTE_TITLES['/'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <HomePage />
    </Suspense>
  ),
});
