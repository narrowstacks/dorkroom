/**
 * A custom film has no catalogue page, so it gets no link. Its slug is
 * `custom_film_*` (or `custom-film` for a shared one), which `/films` cannot resolve.
 */
export const filmDatabaseUrlFor = (
  film: { slug?: string | null } | null | undefined
): string | null =>
  film?.slug &&
  !film.slug.startsWith('custom_film_') &&
  film.slug !== 'custom-film'
    ? `/films?film=${film.slug}`
    : null;
