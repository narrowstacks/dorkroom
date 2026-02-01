import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const LensCalculatorPage = lazy(
  () => import('../app/pages/lens-calculator/lens-calculator-page')
);

export const Route = createFileRoute('/lens')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/lens']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/lens'] },
      { property: 'og:title', content: ROUTE_TITLES['/lens'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/lens'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <LensCalculatorPage />
    </Suspense>
  ),
});
