import { lazyPage } from '../app/lib/lazy-page';

/**
 * The /development page, lazy. Its own module so both the route's loader
 * (which preloads the chunk) and `DevelopmentRoute` (which renders it) can
 * import it, while development-route.tsx keeps exporting components only.
 */
export const DevelopmentRecipesPage = lazyPage(
  () => import('../app/pages/development-recipes/development-recipes-page')
);
