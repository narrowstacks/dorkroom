import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from '@dorkroom/ui';
import { createFileRoute } from '@tanstack/react-router';
import { DevelopmentRoute } from '../components/development-route';
import { developmentSearchSchema } from './search-schemas';

export const Route = createFileRoute('/development')({
  validateSearch: developmentSearchSchema,
  head: () => ({
    meta: [
      { title: `${ROUTE_TITLES['/development']} - Dorkroom` },
      { name: 'description', content: ROUTE_DESCRIPTIONS['/development'] },
      { property: 'og:title', content: ROUTE_TITLES['/development'] },
      {
        property: 'og:description',
        content: ROUTE_DESCRIPTIONS['/development'],
      },
    ],
  }),
  component: DevelopmentRoute,
});
