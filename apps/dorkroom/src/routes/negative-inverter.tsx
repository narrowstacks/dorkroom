import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const NegativeInverterPage = lazy(
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
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <NegativeInverterPage />
    </Suspense>
  ),
});
