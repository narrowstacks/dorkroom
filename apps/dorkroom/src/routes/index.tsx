import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { lazyPage } from '../app/lib/lazy-page';
import { LoadingSpinner } from '../components/loading-spinner';

const HomePage = lazyPage(() => import('../app/pages/home-page'));

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: ROUTE_TITLES['/'] },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/'] },
      { property: 'og:title', content: ROUTE_TITLES['/'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/'] },
    ],
  }),
  loader: () => HomePage.preload(),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <HomePage />
    </Suspense>
  ),
});
