/**
 * Search-term helpers for PostgREST `.or()` filter strings.
 *
 * `.or('name.ilike.%a,b%')` is parsed by PostgREST: an unquoted comma or
 * parenthesis ends or nests a condition. A value wrapped in double quotes may
 * contain them (PostgREST docs, "Reserved characters": quote the value, and
 * escape `"` and `\` inside it with a backslash). Quoting keeps real names
 * such as `Photographers' Formulary`, `Spürsinn`, `ADX A+B` and
 * `Rodinal/Adonal` matching themselves, which stripping characters did not.
 */

/** Wrap a value for use in an `.or()` condition, escaping `\` and `"`. */
export const quoteFilterValue = (v: string) =>
  `"${v.replace(/[\\"]/g, '\\$&')}"`;

/**
 * Trim a search term. Returns null when it holds no letter or digit (`,`,
 * `()`): such a term is rejected with a 400 rather than matching everything.
 */
export function cleanSearchTerm(raw: string): string | null {
  const term = raw.trim();
  return /[\p{L}\p{N}]/u.test(term) ? term : null;
}

/** An `ilike` condition for `.or()` matching `column` against `%term%`. */
export const ilikeCondition = (column: string, term: string) =>
  `${column}.ilike.${quoteFilterValue(`%${term}%`)}`;
