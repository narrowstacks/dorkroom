/**
 * Shape checks for the share-link params that `meta.ts` writes into an
 * `og:image` URL and `og.tsx` reads back. One definition, so the image
 * endpoint can never accept something the meta endpoint would have dropped.
 *
 * Edge-safe: imported by `api/og.tsx`.
 */

/** Slug pattern: lowercase alphanumeric + hyphens, 1-100 chars */
export const SLUG_RE = /^[a-z0-9-]{1,100}$/;
/** UUID v4 pattern */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** ISO must be a positive integer up to 5 digits */
export const ISO_RE = /^[1-9]\d{0,4}$/;
/** Brand: alphanumeric with spaces/hyphens/dots, 1-50 chars */
export const BRAND_RE = /^[\w\s.'-]{1,50}$/;
/** Preset: base64-safe chars (alphanumeric, -, _), 1-500 chars */
export const PRESET_RE = /^[A-Za-z0-9_-]{1,500}$/;
