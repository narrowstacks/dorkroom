/** A development record's date in the user's locale ("Aug 1, 2026"), or
 * undefined when it does not parse. */
export function developedDate(iso: string): string | undefined {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return undefined;
  return new Date(time).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** The same, with a fallback for a date that does not parse. */
export function developedDateText(iso: string): string {
  return developedDate(iso) ?? 'an earlier date';
}
