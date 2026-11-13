// `dorkroom://search?q=...` opens Home with the search box filled in (an App
// Intent or Spotlight's "search in app" sends it). Native tabs keep Home
// mounted, so a new link arrives as new params on a screen that already
// exists: the screen applies a link when its identity changes, not on every
// render, so it never fights what the user types afterwards. This is the pure
// half, the way `link-prefill.ts` is for the calculators.
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';

type ParamValue = string | string[] | undefined;

/** The longest query a link may put in the box. */
export const MAX_LINK_QUERY_LENGTH = 200;

/** What a link asks Home to do: the box text, and the identity of the link. */
export interface QueryLink {
  query: string;
  key: string;
}

const first = (value: ParamValue): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** A raw `q` as the text to put in the box: first value, trimmed, capped. `''` when nothing is left. */
export function normalizeLinkQuery(raw: ParamValue): string {
  return first(raw).trim().slice(0, MAX_LINK_QUERY_LENGTH).trim();
}

/**
 * The query to put in the search box for these route params, or `null` to
 * leave the box alone. `q` is the first value of a repeated key, trimmed and
 * capped; a link without a usable `q` changes nothing. A link applies once per
 * identity: the same query again is ignored, unless it carries a different
 * `at` marker (`LINK_OPENED_PARAM`), which a caller adds to re-apply it.
 * `lastKey` is the `key` of the link applied last, or `null` for none.
 */
export function nextQueryLink(
  params: { q?: ParamValue; [LINK_OPENED_PARAM]?: ParamValue },
  lastKey: string | null
): QueryLink | null {
  const query = normalizeLinkQuery(params.q);
  if (query === '') return null;
  const key = JSON.stringify([first(params[LINK_OPENED_PARAM]), query]);
  return key === lastKey ? null : { query, key };
}
