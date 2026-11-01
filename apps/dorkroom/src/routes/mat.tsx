import { MAT_CALCULATOR_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { calculatorRoute } from '../components/calculator-route';

const MatCalculatorPage = lazy(
  () => import('../app/pages/mat-calculator/mat-calculator-page')
);

export const Route = createFileRoute('/mat')({
  ...calculatorRoute('mat', MAT_CALCULATOR_LINK_PARAMS, MatCalculatorPage),
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/mat']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/mat'] },
      { property: 'og:title', content: ROUTE_TITLES['/mat'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/mat'] },
    ],
  }),
});
