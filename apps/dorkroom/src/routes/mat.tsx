import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const MatCalculatorPage = lazy(
  () => import('../app/pages/mat-calculator/mat-calculator-page')
);

export const Route = createFileRoute('/mat')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/mat']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/mat'] },
      { property: 'og:title', content: ROUTE_TITLES['/mat'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/mat'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <MatCalculatorPage />
    </Suspense>
  ),
});
