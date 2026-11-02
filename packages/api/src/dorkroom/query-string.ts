/**
 * Build a `?key=value` query string from the allow-listed keys of `options`.
 * Only the listed keys are read, so a TanStack Query context (queryKey, meta,
 * ...) passed straight through as `queryFn` never leaks into the URL.
 * `undefined` and `null` values are omitted; values are URL-encoded.
 * Returns '' when nothing is set.
 */
export const buildQueryString = <K extends string>(
  options: Partial<Record<K, string | number | boolean | null>> | undefined,
  keys: readonly K[]
): string => {
  if (!options) return '';
  const search = new URLSearchParams();
  for (const key of keys) {
    const value = options[key];
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};
