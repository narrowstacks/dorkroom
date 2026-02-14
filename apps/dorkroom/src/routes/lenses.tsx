import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const LensCalculatorPage = lazy(
  () => import('../app/pages/lens-calculator/lens-calculator-page')
);

export const Route = createFileRoute('/lenses')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/lenses']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/lenses'] },
      { property: 'og:title', content: ROUTE_TITLES['/lenses'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/lenses'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <LensCalculatorPage />
    </Suspense>
  ),
});
