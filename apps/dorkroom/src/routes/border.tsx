import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const BorderCalculatorPage = lazy(
  () => import('../app/pages/border-calculator/border-calculator-page')
);

export const Route = createFileRoute('/border')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/border']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/border'] },
      { property: 'og:title', content: ROUTE_TITLES['/border'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/border'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <BorderCalculatorPage />
    </Suspense>
  ),
});
