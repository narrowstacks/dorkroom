// The one search behind the film log's Brand and Mount pickers (#733). Pure.
//
// Case and diacritic insensitive ("voigtlander" finds Voigtländer), and
// punctuation is a word break on both sides ("c/y" finds "C/Y", "l39" finds
// "L39"). It matches an item's name and its aliases. Results are ranked: an
// exact name or alias first, then one that starts with the query, then one
// with a word that starts with it, then any other substring; ties keep the
// input order.

/** Text folded for comparison: no diacritics, lower case, punctuation and
 * runs of space collapsed to one space. */
export function foldForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** How well one folded term matches a folded query: lower is better, null is
 * no match. */
function termRank(term: string, query: string): number | null {
  if (term === query) return 0;
  if (term.startsWith(query)) return 1;
  if (term.includes(` ${query}`)) return 2;
  if (term.includes(query)) return 3;
  return null;
}

/**
 * The items that match `query`, best first. `terms` gives an item's name and
 * aliases. An empty query returns every item in its order.
 */
export function searchByTerms<T>(
  items: readonly T[],
  query: string,
  terms: (item: T) => readonly string[]
): T[] {
  const folded = foldForSearch(query);
  if (folded === '') return [...items];
  const ranked: { item: T; rank: number; index: number }[] = [];
  items.forEach((item, index) => {
    let best: number | null = null;
    for (const term of terms(item)) {
      const rank = termRank(foldForSearch(term), folded);
      if (rank !== null && (best === null || rank < best)) best = rank;
    }
    if (best !== null) ranked.push({ item, rank: best, index });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map((entry) => entry.item);
}

/** True when two names are the same once folded ("Voigtlander" and
 * "Voigtländer"). */
export function sameName(a: string, b: string): boolean {
  return foldForSearch(a) === foldForSearch(b);
}
