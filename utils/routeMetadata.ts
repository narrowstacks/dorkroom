export const SITE_NAME = 'Dorkroom';
export const BASE_URL = 'https://dorkroom.art';

export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/border': 'Border Calculator',
  '/resize': 'Print Resize Calculator',
  '/reciprocity': 'Reciprocity Failure Calculator',
  '/stops': 'Stops Calculator',
  '/exposure': 'Exposure Calculator',
  '/lenses': 'Lens Equivalency Calculator',
  '/development': 'Development Recipes',
  '/films': 'Film Database',
  '/docs': 'Documentation',
  '/settings': 'Settings',
};

export const ROUTE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Film photography calculators and resources for analog photographers. Development recipes, printing calculators, and exposure tools.',
  '/border':
    'Figure out where to set your easel blades for even borders. Punch in paper size and negative format, get blade positions.',
  '/resize':
    'Scale darkroom prints to new sizes. Calculate exposure adjustments when enlarging or reducing print dimensions.',
  '/reciprocity':
    'Compensate for reciprocity failure in long exposures. Get corrected exposure times for film stocks like Ilford HP5, Kodak Tri-X, and more.',
  '/stops':
    'Convert between exposure stops and seconds. Translate f-stop or time adjustments into exposure values.',
  '/exposure':
    'Balance aperture, shutter speed, and ISO for correct exposure. Calculate equivalent exposures across different settings.',
  '/lenses':
    'Calculate equivalent focal lengths between sensor and film formats. Compare APS-C, Full Frame, and Medium Format field of view.',
  '/development':
    'Browse film and developer combinations with development times. Find recipes for popular film stocks and chemistry.',
  '/films':
    'Browse and search the film stock database. Filter by brand, ISO, and color type.',
  '/docs': 'How-to guides and reference material for analog photography.',
  '/settings': 'Set your preferred units, defaults, and display options.',
};

const DEFAULT_TITLE = 'Dorkroom';
const DEFAULT_DESCRIPTION =
  'Film photography calculators and resources for analog photographers.';

export interface RouteMetadata {
  title: string;
  description: string;
  url: string;
  ogImageUrl: string;
}

/** Query params relevant to dynamic metadata */
export interface MetadataQuery {
  film?: string;
  developer?: string;
  recipe?: string;
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  return trimmed;
}

/**
 * Best-effort slug to human-readable name.
 * e.g. "cinestill-bwxx-double-x" → "Cinestill Bwxx Double X"
 *      "ilford-hp5-plus" → "Ilford Hp5 Plus"
 */
export function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildOgImageUrl(normalized: string, query?: MetadataQuery): string {
  const params = new URLSearchParams({ route: normalized });
  if (query?.film) params.set('film', query.film);
  if (query?.developer) params.set('developer', query.developer);
  if (query?.recipe) params.set('recipe', query.recipe);
  return `${BASE_URL}/api/og?${params.toString()}`;
}

function buildCanonicalUrl(normalized: string, query?: MetadataQuery): string {
  const base = `${BASE_URL}${normalized === '/' ? '' : normalized}`;
  if (!query) return base;
  const params = new URLSearchParams();
  if (query.film) params.set('film', query.film);
  if (query.developer) params.set('developer', query.developer);
  if (query.recipe) params.set('recipe', query.recipe);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Build metadata for a route. When query params are provided,
 * generates dynamic titles/descriptions using prettified slugs as fallbacks.
 * The OG image endpoint does the real API lookups.
 */
export function getRouteMetadata(
  pathname: string,
  query?: MetadataQuery
): RouteMetadata {
  const normalized = normalizePath(pathname);
  const isHome = normalized === '/';
  const isKnownRoute = normalized in ROUTE_TITLES;

  const hasFilm = query?.film && query.film.length > 0;
  const hasDeveloper = query?.developer && query.developer.length > 0;

  // Dynamic titles for film/development pages with query params
  if (normalized === '/films' && hasFilm) {
    const filmName = prettifySlug(query.film);
    return {
      title: `${filmName} | ${SITE_NAME}`,
      description: `Details and specifications for ${filmName} film stock.`,
      url: buildCanonicalUrl(normalized, query),
      ogImageUrl: buildOgImageUrl(normalized, query),
    };
  }

  if (normalized === '/development' && hasFilm) {
    const filmName = prettifySlug(query.film);
    const devName = hasDeveloper ? prettifySlug(query.developer) : null;
    const title = devName ? `${filmName} in ${devName}` : `${filmName} Recipes`;
    const description = devName
      ? `Development recipe for ${filmName} in ${devName}. Times, temperatures, and dilutions.`
      : `Development recipes for ${filmName}. Browse developer pairings and times.`;
    return {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: buildCanonicalUrl(normalized, query),
      ogImageUrl: buildOgImageUrl(normalized, query),
    };
  }

  // Static route metadata
  const baseTitle = ROUTE_TITLES[normalized] ?? DEFAULT_TITLE;
  const description = ROUTE_DESCRIPTIONS[normalized] ?? DEFAULT_DESCRIPTION;
  const fullTitle = isHome
    ? `${SITE_NAME} - Photography Calculators and Resources`
    : isKnownRoute
      ? `${baseTitle} | ${SITE_NAME}`
      : DEFAULT_TITLE;

  return {
    title: fullTitle,
    description,
    url: buildCanonicalUrl(normalized),
    ogImageUrl: buildOgImageUrl(normalized),
  };
}
