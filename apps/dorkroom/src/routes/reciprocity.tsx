import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const ReciprocityCalculatorPage = lazy(
  () =>
    import('../app/pages/reciprocity-calculator/reciprocity-calculator-page')
);

export const Route = createFileRoute('/reciprocity')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/reciprocity']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/reciprocity'] },
      { property: 'og:title', content: ROUTE_TITLES['/reciprocity'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/reciprocity'],
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <ReciprocityCalculatorPage />
    </Suspense>
  ),
});
