import { PlaceholderPage } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

export const Route = createFileRoute('/infobase')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaceholderPage
        title="Infobase"
        summary="Reference tables, notes, and recipes."
      />
    </Suspense>
  ),
});
