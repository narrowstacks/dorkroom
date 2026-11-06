/** Lowercased, with everything but letters and digits removed. */
const squash = (text: string): string =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Whether a picker option's label matches what was typed. A plain
 * case-insensitive substring still matches, and so does the same text with
 * punctuation and spaces ignored, so "tmax" finds "T-MAX/Ektapan". Typing
 * only punctuation (such as "+") matches plainly, never everything.
 */
export function labelMatches(label: string, query: string): boolean {
  if (label.toLowerCase().includes(query.toLowerCase())) return true;
  const squashed = squash(query);
  return squashed !== '' && squash(label).includes(squashed);
}
