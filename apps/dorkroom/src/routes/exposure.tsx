import {
  PlaceholderPage,
  ROUTE_DESCRIPTIONS,
  ROUTE_TITLES,
} from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

export const Route = createFileRoute('/exposure')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/exposure']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/exposure'] },
      { property: 'og:title', content: ROUTE_TITLES['/exposure'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/exposure'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaceholderPage
        title="Exposure"
        summary="Balance aperture, shutter, and ISO on set."
      />
    </Suspense>
  ),
});
