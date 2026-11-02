import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { lazyPage } from '../app/lib/lazy-page';
import { LoadingSpinner } from '../components/loading-spinner';

const NotFoundPage = lazyPage(() => import('../app/pages/not-found-page'));

export const Route = createFileRoute('/$')({
  head: () => ({
    meta: [
      { title: 'Page Not Found - Dorkroom' },
      { name: 'robots', content: 'noindex' },
      {
        name: 'description',
        content: 'The page you were looking for could not be found.',
      },
    ],
  }),
  loader: ({ preload }) => NotFoundPage.preload(preload),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <NotFoundPage />
    </Suspense>
  ),
});
