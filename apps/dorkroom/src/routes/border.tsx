import { BORDER_CALCULATOR_LINK_PARAMS } from '@dorkroom/logic';
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazyPage } from '../app/lib/lazy-page';
import { calculatorRoute } from '../components/calculator-route';

const BorderCalculatorPage = lazyPage(
  () => import('../app/pages/border-calculator/border-calculator-page')
);

export const Route = createFileRoute('/border')({
  ...calculatorRoute(
    'border',
    BORDER_CALCULATOR_LINK_PARAMS,
    BorderCalculatorPage
  ),
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/border']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/border'] },
      { property: 'og:title', content: ROUTE_TITLES['/border'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/border'] },
    ],
  }),
});
