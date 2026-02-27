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
  color?: string;
  iso?: string;
  brand?: string;
  status?: string;
}

export const COLOR_LABELS: Record<string, string> = {
  bw: 'Black & White',
  color: 'Color Negative',
  slide: 'Slide',
};

export const STATUS_LABELS: Record<
  string,
  { title: string; subtitle: string; standalone: string }
> = {
  active: {
    title: 'In Production',
    subtitle: 'Currently in production',
    standalone: 'Film Stocks in Production',
  },
  discontinued: {
    title: 'Discontinued',
    subtitle: 'No longer manufactured',
    standalone: 'Discontinued Film Stocks',
  },
};

export interface FilmFilterParts {
  title: string;
  titleLines: string[];
  description: string;
  pills: string[];
  subtitle?: string;
}

/**
 * Build dynamic title/description/pills from film filter params.
 * Returns null if no meaningful filters are present (falls through to static card).
 */
export function buildFilmFilterParts(
  query: MetadataQuery
): FilmFilterParts | null {
  const { color, iso, brand, status } = query;
  const hasColor = color != null && color in COLOR_LABELS;
  const hasIso = iso != null && iso.length > 0;
  const hasBrand = brand != null && brand.length > 0;
  const hasStatus =
    status != null && status in STATUS_LABELS && status !== 'all';

  if (!hasColor && !hasIso && !hasBrand && !hasStatus) return null;

  const statusOnly = hasStatus && !hasColor && !hasIso && !hasBrand;

  // Status-only: use standalone title, no subtitle
  // Combined: [Color] [Brand] ISO [N] Films + status subtitle
  let title: string;
  let titleLines: string[];
  let subtitle: string | undefined;

  if (statusOnly) {
    title = STATUS_LABELS[status]!.standalone;
    titleLines = [title];
    subtitle = undefined;
  } else {
    const titleParts: string[] = [];
    if (hasColor) titleParts.push(COLOR_LABELS[color]!);
    if (hasBrand) titleParts.push(brand);
    if (hasIso) titleParts.push(`ISO ${iso}`);
    titleParts.push('Films');
    title = titleParts.join(' ');

    // Split color label onto its own line when brand/ISO follows
    if (hasColor && (hasBrand || hasIso)) {
      const rest = [
        ...(hasBrand ? [brand] : []),
        ...(hasIso ? [`ISO ${iso}`] : []),
        'Films',
      ];
      titleLines = [COLOR_LABELS[color]!, rest.join(' ')];
    } else {
      titleLines = [title];
    }

    subtitle = hasStatus ? STATUS_LABELS[status]!.subtitle : undefined;
  }

  // Pills
  const pills: string[] = [];
  if (hasColor) pills.push(COLOR_LABELS[color]!);
  if (hasBrand) pills.push(brand);
  if (hasIso) pills.push(`ISO ${iso}`);
  if (hasStatus) pills.push(STATUS_LABELS[status]!.title);

  // Description
  const descParts: string[] = ['Browse'];
  if (hasColor) descParts.push(COLOR_LABELS[color]!.toLowerCase());
  if (hasBrand) descParts.push(brand);
  if (hasIso) descParts.push(`ISO ${iso}`);
  descParts.push('film stocks');
  if (hasStatus)
    descParts.push(`— ${STATUS_LABELS[status]!.subtitle.toLowerCase()}`);
  descParts.push('in the Dorkroom film database.');
  const description = descParts.join(' ');

  return { title, titleLines, description, pills, subtitle };
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

function appendFilterParams(
  params: URLSearchParams,
  query: MetadataQuery
): void {
  if (query.film) params.set('film', query.film);
  if (query.developer) params.set('developer', query.developer);
  if (query.recipe) params.set('recipe', query.recipe);
  if (query.color) params.set('color', query.color);
  if (query.iso) params.set('iso', query.iso);
  if (query.brand) params.set('brand', query.brand);
  if (query.status) params.set('status', query.status);
}

function buildOgImageUrl(normalized: string, query?: MetadataQuery): string {
  const params = new URLSearchParams({ route: normalized });
  if (query) appendFilterParams(params, query);
  return `${BASE_URL}/api/og?${params.toString()}`;
}

function buildCanonicalUrl(normalized: string, query?: MetadataQuery): string {
  const base = `${BASE_URL}${normalized === '/' ? '' : normalized}`;
  if (!query) return base;
  const params = new URLSearchParams();
  appendFilterParams(params, query);
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

  const filmSlug = query?.film && query.film.length > 0 ? query.film : null;
  const devSlug =
    query?.developer && query.developer.length > 0 ? query.developer : null;

  // Film filter card (e.g. /films?color=bw&brand=Kodak)
  // Only when no specific film slug — individual film detail takes priority
  if (normalized === '/films' && !filmSlug) {
    const filterParts = buildFilmFilterParts(query ?? {});
    if (filterParts) {
      return {
        title: `${filterParts.title} | ${SITE_NAME}`,
        description: filterParts.description,
        url: buildCanonicalUrl(normalized, query),
        ogImageUrl: buildOgImageUrl(normalized, query),
      };
    }
  }

  // Dynamic titles for film/development pages with query params
  if (normalized === '/films' && filmSlug) {
    const filmName = prettifySlug(filmSlug);
    return {
      title: `${filmName} | ${SITE_NAME}`,
      description: `Details and specifications for ${filmName} film stock.`,
      url: buildCanonicalUrl(normalized, query),
      ogImageUrl: buildOgImageUrl(normalized, query),
    };
  }

  if (normalized === '/development' && filmSlug) {
    const filmName = prettifySlug(filmSlug);
    const devName = devSlug ? prettifySlug(devSlug) : null;
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

  if (normalized === '/development' && devSlug) {
    const devName = prettifySlug(devSlug);
    return {
      title: `${devName} Recipes | ${SITE_NAME}`,
      description: `Development recipes using ${devName}. Browse film pairings, times, and dilutions.`,
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
