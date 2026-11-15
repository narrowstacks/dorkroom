import { getTool } from '@/lib/tools';

export type TabBarMinimizeBehavior = 'onScrollDown' | 'never';

const RECIPES_ROUTE = getTool('recipes')?.route;
const FILM_LOG_ROUTE = getTool('film-log')?.route;

/** The path alone: no query, no hash, no trailing slash. */
function normalize(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/)[0];
  const trimmed = pathOnly.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * Whether the tab bar shrinks while its screen scrolls. Only the long lists
 * earn it: the recipe browser, the film log list and a roll's shot list. Every
 * other screen (hubs, calculators, the Meter, forms, Home, Settings) keeps a
 * full bar, since a minimized bar over a form or a camera is just in the way.
 * The recipe detail and the timer sit under the recipes route but are not lists.
 */
export function tabBarMinimizeBehavior(
  pathname: string
): TabBarMinimizeBehavior {
  const path = normalize(pathname);
  if (path === RECIPES_ROUTE || path === FILM_LOG_ROUTE) return 'onScrollDown';
  if (FILM_LOG_ROUTE !== undefined) {
    const prefix = `${FILM_LOG_ROUTE}/roll/`;
    if (path.startsWith(prefix) && path.length > prefix.length) {
      return path.slice(prefix.length).includes('/') ? 'never' : 'onScrollDown';
    }
  }
  return 'never';
}
