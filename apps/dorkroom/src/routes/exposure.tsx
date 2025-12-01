import { PlaceholderPage } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

export const Route = createFileRoute('/exposure')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaceholderPage
        title="Exposure"
        summary="Balance aperture, shutter, and ISO on set."
      />
    </Suspense>
  ),
});
