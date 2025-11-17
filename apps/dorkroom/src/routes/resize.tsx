import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const ResizeCalculatorPage = lazy(
  () => import('../app/pages/resize-calculator/resize-calculator-page')
);

export const Route = createFileRoute('/resize')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ResizeCalculatorPage />
    </Suspense>
  ),
});
