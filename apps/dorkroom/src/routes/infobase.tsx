import {
  PlaceholderPage,
  ROUTE_DESCRIPTIONS,
  ROUTE_TITLES,
} from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

export const Route = createFileRoute('/infobase')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/infobase']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/infobase'] },
      { property: 'og:title', content: ROUTE_TITLES['/infobase'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/infobase'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaceholderPage
        title="Infobase"
        summary="Reference tables, notes, and recipes."
      />
    </Suspense>
  ),
});
