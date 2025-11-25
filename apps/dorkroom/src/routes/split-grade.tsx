import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const SplitGradeCalculatorPage = lazy(
  () =>
    import('../app/pages/split-grade-calculator/split-grade-calculator-page')
);

export const Route = createFileRoute('/split-grade')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <SplitGradeCalculatorPage />
    </Suspense>
  ),
});
