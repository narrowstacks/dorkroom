import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const ExposureCalculatorPage = lazy(
  () => import('../app/pages/exposure-calculator/exposure-calculator-page')
);

export const Route = createFileRoute('/stops')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/stops']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/stops'] },
      { property: 'og:title', content: ROUTE_TITLES['/stops'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/stops'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <ExposureCalculatorPage />
    </Suspense>
  ),
});
