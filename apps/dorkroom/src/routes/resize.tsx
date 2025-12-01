import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const ResizeCalculatorPage = lazy(
  () => import('../app/pages/resize-calculator/resize-calculator-page')
);

export const Route = createFileRoute('/resize')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/resize']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/resize'] },
      { property: 'og:title', content: ROUTE_TITLES['/resize'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/resize'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <ResizeCalculatorPage />
    </Suspense>
  ),
});
