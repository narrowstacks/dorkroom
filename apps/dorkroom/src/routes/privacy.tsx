import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { lazyPage } from '../app/lib/lazy-page';
import { LoadingSpinner } from '../components/loading-spinner';

const PrivacyPage = lazyPage(() => import('../app/pages/privacy-page'));

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/privacy']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/privacy'] },
      { property: 'og:title', content: ROUTE_TITLES['/privacy'] },
      { property: 'og:description', content: ROUTE_DESCRIPTIONS['/privacy'] },
    ],
  }),
  loader: () => PrivacyPage.preload(),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <PrivacyPage />
    </Suspense>
  ),
});
