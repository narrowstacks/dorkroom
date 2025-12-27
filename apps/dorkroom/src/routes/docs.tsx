import {
  PlaceholderPage,
  ROUTE_DESCRIPTIONS,
  ROUTE_TITLES,
} from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

export const Route = createFileRoute('/docs')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/docs']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/docs'] },
      { property: 'og:title', content: ROUTE_TITLES['/docs'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/docs'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaceholderPage
        title="Documentation"
        summary="Guides and documentation for analog photography."
      />
    </Suspense>
  ),
});
