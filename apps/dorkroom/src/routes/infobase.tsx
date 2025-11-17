import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { PlaceholderPage } from '@dorkroom/ui';

export const Route = createFileRoute('/infobase')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <PlaceholderPage
        title="Infobase"
        summary="Reference tables, notes, and recipes."
      />
    </Suspense>
  ),
});
