import type { FilmImageLoader } from '@dorkroom/ui/films';

/**
 * Film photos live in the public `images` bucket on Supabase storage. Only
 * these are sent through Vercel Image Optimization; anything else (a handful
 * of films still point at retailer URLs) loads as is. Must stay in step with
 * `images.remotePatterns` in the root `vercel.json`, which a test checks.
 */
export const FILM_IMAGE_SOURCE_PREFIX =
  'https://ukpdbjhbudgsjqsxlays.supabase.co/storage/v1/object/public/images/films/';

/** The only quality requested. `vercel.json` `images.qualities` allows just this. */
export const FILM_IMAGE_QUALITY = 75;

/**
 * Resized film thumbnails through Vercel's `/_vercel/image` endpoint. The
 * width is always one of `FILM_IMAGE_WIDTHS`, which `images.sizes` allows.
 */
export const vercelFilmImageLoader: FilmImageLoader = (src, width) => {
  if (!src.startsWith(FILM_IMAGE_SOURCE_PREFIX)) return null;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(FILM_IMAGE_QUALITY),
  });
  return `/_vercel/image?${params.toString()}`;
};

/**
 * The loader for this build. `/_vercel/image` only exists on a Vercel
 * deployment, so the dev server loads originals. A production build served
 * elsewhere (`vite preview`, the Cloudflare static build) still tries the
 * optimizer, and `FilmImage` falls back to the original URL when that fails.
 */
export const filmImageLoader: FilmImageLoader | null =
  process.env.NODE_ENV === 'production' ? vercelFilmImageLoader : null;
