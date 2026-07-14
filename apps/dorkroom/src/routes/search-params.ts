/**
 * Search params for this app are flat strings — `?iso=400`, `?favorites=true`,
 * `?film=rollei-retro-400s`. The route schemas type them as `z.string()`, and the
 * development page reads `window.location.search` directly through
 * `URLSearchParams`, which also yields strings.
 *
 * TanStack Router's default disagrees: it coerces each value, so `?iso=400`
 * arrived as the number `400` and `?favorites=true` as the boolean `true`. Both
 * then failed the `z.string()` schemas, and the schemas' trailing
 * `.catch(undefined)` swallowed the failure — so the params were dropped and
 * stripped straight back out of the URL. A shared link silently lost its ISO and
 * favourites filters.
 *
 * These replace the router's parse/stringify with plain `URLSearchParams`
 * semantics, so the router agrees with the rest of the app.
 *
 * Two things worth knowing before changing this:
 *
 * - The router's own `parseSearchWith` helper cannot fix it. Its internal decode
 *   coerces `"400"` to a number *before* the supplied parser runs, and the parser
 *   only sees values that are still strings.
 * - Coercing to a string inside the zod schema instead doesn't work either: the
 *   default serializer then re-encodes it as `?iso="400"` (quoted, to preserve
 *   string-ness), which breaks the raw `URLSearchParams` reader on the recipes
 *   page.
 *
 * This assumes no route stores nested or array data in its search params. If one
 * ever needs to, give that param its own encoding rather than reinstating the
 * default JSON behaviour.
 */

export const parseSearch = (searchStr: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(searchStr)) {
    result[key] = value;
  }
  return result;
};

export const stringifySearch = (search: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};
