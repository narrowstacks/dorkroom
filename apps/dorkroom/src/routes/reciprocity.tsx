import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ReciprocityCalculatorPage />
    </Suspense>
  ),
});
