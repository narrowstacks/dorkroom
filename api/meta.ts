import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { MetadataQuery } from '../utils/routeMetadata';
import { getRouteMetadata } from '../utils/routeMetadata';

/** Slug pattern: lowercase alphanumeric + hyphens, 1-100 chars */
const SLUG_RE = /^[a-z0-9-]{1,100}$/;
/** UUID v4 pattern */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Valid color filter values */
const COLOR_VALUES = new Set(['bw', 'color', 'slide']);
/** Valid status filter values */
const STATUS_VALUES = new Set(['active', 'discontinued', 'all']);
/** ISO must be a positive integer up to 5 digits */
const ISO_RE = /^[1-9]\d{0,4}$/;
/** Brand: alphanumeric with spaces/hyphens/dots, 1-50 chars */
const BRAND_RE = /^[\w\s.'-]{1,50}$/;

function extractMetadataQuery(
  params: URLSearchParams
): MetadataQuery | undefined {
  const film = params.get('film');
  const developer = params.get('developer');
  const recipe = params.get('recipe');
  const color = params.get('color');
  const iso = params.get('iso');
  const brand = params.get('brand');
  const status = params.get('status');

  if (!film && !developer && !recipe && !color && !iso && !brand && !status)
    return undefined;

  const query: MetadataQuery = {};
  if (film && SLUG_RE.test(film)) query.film = film;
  if (developer && SLUG_RE.test(developer)) query.developer = developer;
  if (recipe && UUID_RE.test(recipe)) query.recipe = recipe;
  if (color && COLOR_VALUES.has(color)) query.color = color;
  if (iso && ISO_RE.test(iso)) query.iso = iso;
  if (brand && BRAND_RE.test(brand)) query.brand = brand;
  if (status && STATUS_VALUES.has(status)) query.status = status;

  return Object.keys(query).length > 0 ? query : undefined;
}

/**
 * Bot meta tag endpoint.
 *
 * Called via Vercel routing when a bot UA is detected.
 * Fetches the static index.html, rewrites meta tags for the requested path,
 * and returns the modified HTML.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const path = (req.query.path as string) ?? '/';
  const url = new URL(path, 'https://dorkroom.art');

  // Merge any query params from the original URL
  if (typeof req.query.film === 'string')
    url.searchParams.set('film', req.query.film);
  if (typeof req.query.developer === 'string')
    url.searchParams.set('developer', req.query.developer);
  if (typeof req.query.recipe === 'string')
    url.searchParams.set('recipe', req.query.recipe);
  if (typeof req.query.color === 'string')
    url.searchParams.set('color', req.query.color);
  if (typeof req.query.iso === 'string')
    url.searchParams.set('iso', req.query.iso);
  if (typeof req.query.brand === 'string')
    url.searchParams.set('brand', req.query.brand);
  if (typeof req.query.status === 'string')
    url.searchParams.set('status', req.query.status);

  const query = extractMetadataQuery(url.searchParams);
  const meta = getRouteMetadata(url.pathname, query);

  // Fetch the static index.html from origin
  const originResponse = await fetch('https://dorkroom.art/', {
    headers: { 'x-bypass-meta': '1' },
  });
  let html = await originResponse.text();

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${meta.description}" />`
  );

  // Replace existing OG and Twitter tags
  const replacements: [RegExp, string][] = [
    [
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${meta.title}" />`,
    ],
    [
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${meta.description}" />`,
    ],
    [
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${meta.url}" />`,
    ],
    [
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${meta.ogImageUrl}" />`,
    ],
    [
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${meta.title}" />`,
    ],
    [
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${meta.description}" />`,
    ],
    [
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${meta.ogImageUrl}" />`,
    ],
  ];

  for (const [pattern, replacement] of replacements) {
    html = html.replace(pattern, replacement);
  }

  // Inject canonical URL before </head>
  html = html.replace(
    '</head>',
    `    <link rel="canonical" href="${meta.url}" />\n  </head>`
  );

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader(
    'cache-control',
    'public, s-maxage=86400, stale-while-revalidate=3600'
  );
  res.status(200).send(html);
}
