import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const SettingsPage = lazy(() => import('../app/pages/settings-page'));

export const Route = createFileRoute('/settings')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/settings']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/settings'] },
      { property: 'og:title', content: ROUTE_TITLES['/settings'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/settings'] },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <SettingsPage />
    </Suspense>
  ),
});
