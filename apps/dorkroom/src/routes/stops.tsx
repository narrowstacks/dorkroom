import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const ExposureCalculatorPage = lazy(
  () => import('../app/pages/exposure-calculator/exposure-calculator-page')
);

export const Route = createFileRoute('/stops')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <ExposureCalculatorPage />
    </Suspense>
  ),
});
