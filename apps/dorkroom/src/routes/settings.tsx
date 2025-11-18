import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const SettingsPage = lazy(() => import('../app/pages/settings-page'));

export const Route = createFileRoute('/settings')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <SettingsPage />
    </Suspense>
  ),
});
