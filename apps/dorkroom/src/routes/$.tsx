import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/loading-spinner';

const NotFoundPage = lazy(() => import('../app/pages/not-found-page'));

export const Route = createFileRoute('/$')({
  head: () => ({
    meta: [
      { title: 'Page Not Found - Dorkroom' },
      {
        name: 'description',
        content: 'The page you were looking for could not be found.',
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <NotFoundPage />
    </Suspense>
  ),
});
