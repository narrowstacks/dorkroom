import { RESIZE_CALCULATOR_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { calculatorRoute } from '../components/calculator-route';

const ResizeCalculatorPage = lazy(
  () => import('../app/pages/resize-calculator/resize-calculator-page')
);

export const Route = createFileRoute('/resize')({
  ...calculatorRoute(
    'resize',
    RESIZE_CALCULATOR_LINK_PARAMS,
    ResizeCalculatorPage
  ),
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/resize']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/resize'] },
      { property: 'og:title', content: ROUTE_TITLES['/resize'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/resize'] },
    ],
  }),
});
