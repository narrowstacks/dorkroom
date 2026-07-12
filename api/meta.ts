import type { VercelRequest, VercelResponse } from '@vercel/node';
import { escapeHtml } from '../utils/htmlEscape';
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
/** Preset: base64-safe chars (alphanumeric, -, _), 1-500 chars */
const PRESET_RE = /^[A-Za-z0-9_-]{1,500}$/;

/**
 * Every query param this endpoint reads (the ones individually copied below,
 * plus `path`). Anything else is rejected before the origin `fetch` — see the
 * guard at the top of `handler`. Keep this in sync when adding a new param.
 */
const ALLOWED_PARAMS = new Set([
  'path',
  'film',
  'developer',
  'recipe',
  'color',
  'iso',
  'brand',
  'status',
  'preset',
]);

/**
 * True when `query` carries a key outside the allowlist, or an allowed key
 * repeated (Vercel collapses `?film=a&film=b` into an array-valued
 * `query.film`, which is how a duplicate shows up here).
 */
function hasQueryIssue(query: VercelRequest['query']): boolean {
  const keys = Object.keys(query);
  if (keys.length > ALLOWED_PARAMS.size) return true;
  return keys.some(
    (key) => !ALLOWED_PARAMS.has(key) || Array.isArray(query[key])
  );
}

/**
 * Build the canonical public URL for a request, keeping only the requested
 * path and the allowlisted params present as a single string value. Used to
 * redirect requests carrying unknown or duplicated params to a clean,
 * cacheable target rather than 400ing them (crawlers/link-preview bots often
 * arrive with tracking params like `utm_source` tacked on).
 */
function buildCanonicalUrl(query: VercelRequest['query']): string {
  const path = typeof query.path === 'string' ? query.path : '/';
  const url = new URL(path, 'https://dorkroom.art');

  const search = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    if (key === 'path') continue;
    const value = query[key];
    if (typeof value === 'string') {
      search.set(key, value);
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      // Duplicated allowed param — keep the first value.
      search.set(key, value[0]);
    }
  }
  url.search = search.toString();

  return url.toString();
}

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
  const preset = params.get('preset');

  if (
    !film &&
    !developer &&
    !recipe &&
    !color &&
    !iso &&
    !brand &&
    !status &&
    !preset
  )
    return undefined;

  const query: MetadataQuery = {};
  if (film && SLUG_RE.test(film)) query.film = film;
  if (developer && SLUG_RE.test(developer)) query.developer = developer;
  if (recipe && UUID_RE.test(recipe)) query.recipe = recipe;
  if (color && COLOR_VALUES.has(color)) query.color = color;
  if (iso && ISO_RE.test(iso)) query.iso = iso;
  if (brand && BRAND_RE.test(brand)) query.brand = brand;
  if (status && STATUS_VALUES.has(status)) query.status = status;
  if (preset && PRESET_RE.test(preset)) query.preset = preset;

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
  if (hasQueryIssue(req.query)) {
    // Unknown/duplicated params never change the rendered card, so redirect
    // crawlers to the canonical URL (dropping the junk) instead of 400ing —
    // shared links routinely carry tracking params like utm_source, and a
    // hard failure would break their previews. The redirect itself is
    // cheaply cached; the crawler re-requests the clean URL and gets a 200.
    const canonicalUrl = buildCanonicalUrl(req.query);
    res.setHeader('cache-control', 'public, s-maxage=86400');
    res.redirect(308, canonicalUrl);
    return;
  }

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
  if (typeof req.query.preset === 'string')
    url.searchParams.set('preset', req.query.preset);

  const query = extractMetadataQuery(url.searchParams);
  const meta = getRouteMetadata(url.pathname, query);
  const safeTitle = escapeHtml(meta.title);
  const safeDescription = escapeHtml(meta.description);
  const safeUrl = escapeHtml(meta.url);
  const safeOgImageUrl = escapeHtml(meta.ogImageUrl);

  // Fetch the static index.html from origin
  const originResponse = await fetch('https://dorkroom.art/', {
    headers: { 'x-bypass-meta': '1' },
  });
  let html = await originResponse.text();

  // Replace <title>. A function replacer is used for every substitution
  // below — a string replacer interprets `$&`, `$``, `$'`, `$$`, `$n` in the
  // *replacement*, and a decoded/escaped value can legitimately contain
  // those two-character sequences (e.g. a border preset name with a `$` next
  // to a backtick), which would splice arbitrary surrounding document text
  // into the output. A function replacer treats its return value as a
  // literal string, so no such interpolation happens.
  html = html.replace(
    /<title>[^<]*<\/title>/,
    () => `<title>${safeTitle}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    () => `<meta name="description" content="${safeDescription}" />`
  );

  // Replace existing OG and Twitter tags
  const replacements: [RegExp, () => string][] = [
    [
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:title" content="${safeTitle}" />`,
    ],
    [
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:description" content="${safeDescription}" />`,
    ],
    [
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:url" content="${safeUrl}" />`,
    ],
    [
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
      () => `<meta property="og:image" content="${safeOgImageUrl}" />`,
    ],
    [
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:title" content="${safeTitle}" />`,
    ],
    [
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:description" content="${safeDescription}" />`,
    ],
    [
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
      () => `<meta name="twitter:image" content="${safeOgImageUrl}" />`,
    ],
  ];

  for (const [pattern, replacement] of replacements) {
    html = html.replace(pattern, replacement);
  }

  // Inject canonical URL before </head>
  html = html.replace(
    '</head>',
    () => `    <link rel="canonical" href="${safeUrl}" />\n  </head>`
  );

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader(
    'cache-control',
    'public, s-maxage=86400, stale-while-revalidate=3600'
  );
  res.status(200).send(html);
}
