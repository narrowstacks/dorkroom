import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <HomePage />
    </Suspense>
  ),
});
