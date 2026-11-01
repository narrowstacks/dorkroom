import { LENS_CALCULATOR_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { calculatorRoute } from '../components/calculator-route';

const LensCalculatorPage = lazy(
  () => import('../app/pages/lens-calculator/lens-calculator-page')
);

export const Route = createFileRoute('/lenses')({
  ...calculatorRoute(LENS_CALCULATOR_LINK_PARAMS, LensCalculatorPage),
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/lenses']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/lenses'] },
      { property: 'og:title', content: ROUTE_TITLES['/lenses'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/lenses'] },
    ],
  }),
});
