import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { MetadataQuery } from '../utils/routeMetadata';
import { getRouteMetadata } from '../utils/routeMetadata';

/** Slug pattern: lowercase alphanumeric + hyphens, 1-100 chars */
const SLUG_RE = /^[a-z0-9-]{1,100}$/;
/** UUID v4 pattern */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function extractMetadataQuery(
  params: URLSearchParams
): MetadataQuery | undefined {
  const film = params.get('film');
  const developer = params.get('developer');
  const recipe = params.get('recipe');

  if (!film && !developer && !recipe) return undefined;

  const query: MetadataQuery = {};
  if (film && SLUG_RE.test(film)) query.film = film;
  if (developer && SLUG_RE.test(developer)) query.developer = developer;
  if (recipe && UUID_RE.test(recipe)) query.recipe = recipe;

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

  // Replace existing OG tags
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${meta.title}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${meta.description}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${meta.url}" />`
  );

  // Inject additional meta tags before </head>
  const injectedTags = [
    `<meta property="og:image" content="${meta.ogImageUrl}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:site_name" content="Dorkroom" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${meta.title}" />`,
    `<meta name="twitter:description" content="${meta.description}" />`,
    `<meta name="twitter:image" content="${meta.ogImageUrl}" />`,
    `<link rel="canonical" href="${meta.url}" />`,
  ].join('\n    ');

  html = html.replace('</head>', `    ${injectedTags}\n  </head>`);

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader(
    'cache-control',
    'public, s-maxage=86400, stale-while-revalidate=3600'
  );
  res.status(200).send(html);
}
