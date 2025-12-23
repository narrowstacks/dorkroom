import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';

const FilmsPage = lazy(() => import('../app/pages/films/films-page'));

// Define search param schema for type-safety and validation
// Invalid params are silently recovered to undefined for better UX
const filmsSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  color: z.enum(['bw', 'color', 'slide']).optional().catch(undefined),
  iso: z.string().optional().catch(undefined),
  brand: z.string().optional().catch(undefined),
  status: z.enum(['all', 'active', 'discontinued']).optional().catch(undefined),
  film: z.string().optional().catch(undefined), // direct link to expanded film
});

export type FilmsSearchParams = z.infer<typeof filmsSearchSchema>;

export const Route = createFileRoute('/films')({
  validateSearch: filmsSearchSchema,
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/films']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/films'] },
      { property: 'og:title', content: ROUTE_TITLES['/films'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/films'],
      },
    ],
  }),
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <FilmsPage />
    </Suspense>
  ),
});
