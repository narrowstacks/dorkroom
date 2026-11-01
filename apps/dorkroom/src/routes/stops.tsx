import { EXPOSURE_CALCULATOR_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { calculatorRoute } from '../components/calculator-route';

const ExposureCalculatorPage = lazy(
  () => import('../app/pages/exposure-calculator/exposure-calculator-page')
);

export const Route = createFileRoute('/stops')({
  ...calculatorRoute(
    'stops',
    EXPOSURE_CALCULATOR_LINK_PARAMS,
    ExposureCalculatorPage
  ),
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/stops']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/stops'] },
      { property: 'og:title', content: ROUTE_TITLES['/stops'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/stops'] },
    ],
  }),
});
