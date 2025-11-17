import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const BorderCalculatorPage = lazy(
  () => import('../app/pages/border-calculator/border-calculator-page')
);

export const Route = createFileRoute('/border')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <BorderCalculatorPage />
    </Suspense>
  ),
});
