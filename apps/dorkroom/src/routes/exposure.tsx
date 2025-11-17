import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { PlaceholderPage } from '@dorkroom/ui';

export const Route = createFileRoute('/exposure')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <PlaceholderPage
        title="Exposure"
        summary="Balance aperture, shutter, and ISO on set."
      />
    </Suspense>
  ),
});
