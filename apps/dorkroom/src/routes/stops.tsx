import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const ExposureCalculatorPage = lazy(
  () => import('../app/pages/exposure-calculator/exposure-calculator-page')
);

export const Route = createFileRoute('/stops')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ExposureCalculatorPage />
    </Suspense>
  ),
});
