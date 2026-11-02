import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { lazyPage } from '../app/lib/lazy-page';
import { LoadingSpinner } from '../components/loading-spinner';

const NegativeInverterPage = lazyPage(
  () => import('../app/pages/negative-inverter/negative-inverter-page')
);

export const Route = createFileRoute('/negative-inverter')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/negative-inverter']} - Dorkroom` },
      {
        name: 'description',
        content: ROUTE_DESCRIPTIONS['/negative-inverter'],
      },
      { property: 'og:title', content: ROUTE_TITLES['/negative-inverter'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/negative-inverter'],
      },
    ],
  }),
  loader: ({ preload }) => NegativeInverterPage.preload(preload),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <NegativeInverterPage />
    </Suspense>
  ),
});
