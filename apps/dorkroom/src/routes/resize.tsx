import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const ResizeCalculatorPage = lazy(
  () => import('../app/pages/resize-calculator/resize-calculator-page')
);

export const Route = createFileRoute('/resize')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <ResizeCalculatorPage />
    </Suspense>
  ),
});
