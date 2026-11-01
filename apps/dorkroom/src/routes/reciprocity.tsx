import { RECIPROCITY_CALCULATOR_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { calculatorRoute } from '../components/calculator-route';

const ReciprocityCalculatorPage = lazy(
  () =>
    import('../app/pages/reciprocity-calculator/reciprocity-calculator-page')
);

export const Route = createFileRoute('/reciprocity')({
  ...calculatorRoute(
    'reciprocity',
    RECIPROCITY_CALCULATOR_LINK_PARAMS,
    ReciprocityCalculatorPage
  ),
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
});
