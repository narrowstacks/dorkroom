/**
 * Control (Cc) and format (Cf) characters, plus lone surrogates, private use
 * and line/paragraph separators. Cf covers zero-width spaces, bidi overrides
 * and isolates (the "Trojan Source" family), BOM and Unicode tag characters.
 * ZWNJ (U+200C) and ZWJ (U+200D) are kept: they are required to spell emoji
 * sequences (family, flags with skin tones) and Persian/Indic scripts.
 * Tab, LF and CR are removed by the name sanitizer's whitespace collapse and
 * kept by `sanitizeText` (see TEXT_STRIP below).
 */
const INVISIBLE_UNSAFE = '\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Zl}\\p{Zp}';
const KEEP_JOINERS = '(?![\\u200C\\u200D])';
const NAME_STRIP = new RegExp(`${KEEP_JOINERS}[${INVISIBLE_UNSAFE}]`, 'gu');
// Prose keeps tab, line feed and carriage return (multi-line notes).
const TEXT_STRIP = new RegExp(
  `(?![\\t\\n\\r\\u200C\\u200D])[${INVISIBLE_UNSAFE}]`,
  'gu'
);

/**
 * Sanitize user-provided prose (notes, descriptions, schedules).
 *
 * THREAT MODEL: recipe text is only ever rendered as text, never as markup:
 * React text nodes and React Native `<Text>` escape it, and no recipe field
 * is used to build an `href`/`src`, `dangerouslySetInnerHTML`, markdown, or
 * server-rendered HTML. Custom recipes also never reach `api/meta.ts` or
 * `api/og.tsx` (those only render catalog data looked up by slug/UUID, and
 * `api/meta.ts` escapes at the sink with `escapeHtml`). So injection is
 * prevented by the render sinks, not by deleting words here. This function is
 * defense in depth that does only what is safe for ordinary language:
 *
 * - strips HTML-like tags (`<...>`), so pasted markup does not show up as noise
 * - strips control and invisible formatting characters (bidi overrides,
 *   zero-width spaces, NUL), keeping tab/newline and the ZWJ/ZWNJ joiners
 * - truncates to `maxLength`
 *
 * It deliberately does NOT delete bare words such as "script", "object",
 * "iframe" or "embed", or `on...=` sequences: those mangle legitimate prose
 * ("Objective: embedded subscription") and protect nothing once tags are gone.
 * A field that becomes a URL must validate its own scheme where it is built.
 *
 * @param text - User input text to sanitize
 * @param maxLength - Optional maximum length (default: 5000)
 * @returns Sanitized text
 */
export function sanitizeText(
  text: string | undefined | null,
  maxLength = 5000
): string {
  if (!text) {
    return '';
  }

  // Strip control/invisible characters first so they cannot be used to split a
  // tag and survive the pass below.
  let sanitized = text.replace(TEXT_STRIP, '');

  // Remove tags repeatedly until the string stops changing: a single pass is
  // bypassable because one removal can splice two fragments into a fresh tag
  // (e.g. `<scr<script>ipt>` -> `<script>`).
  // The `{0,2000}` bound (rather than `*`) keeps this linear: an unbounded
  // `[^>]*` next to a required `>` backtracks quadratically on input like
  // `<<<<...` (polynomial ReDoS); no real tag approaches 2000 chars.
  let previous: string;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]{0,2000}>/g, '');
  } while (sanitized !== previous);

  // Do not HTML-encode here: React escapes on render, and encoding would
  // double-encode ("&lt;" -> "&amp;lt;").

  if (sanitized.length > maxLength) {
    let cut = sanitized.substring(0, maxLength);
    // Do not leave half of a surrogate pair (emoji, rare CJK) at the cut.
    if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
    sanitized = `${cut}...`;
  }

  return sanitized.trim();
}

/**
 * Sanitize a recipe name.
 * Keeps letters, marks, numbers, punctuation, symbols and spaces from any
 * script (accents, CJK, emoji, curly quotes, degree signs). Strips control and
 * invisible formatting characters, and collapses every whitespace run
 * (including newlines) to a single space. Capped at 200 characters.
 *
 * @param name - Recipe name to sanitize
 * @returns Sanitized recipe name
 */
export function sanitizeRecipeName(name: string | undefined | null): string {
  return sanitizeText(name, 200)
    .replace(NAME_STRIP, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

// Import types for type-safe sanitization
import type {
  CustomDeveloperData,
  CustomFilmData,
} from '../types/custom-recipes';

/**
 * Sanitize custom film data to prevent XSS attacks.
 * Preserves all fields while sanitizing text values.
 *
 * @param film - Custom film data object to sanitize
 * @returns Sanitized film data, or undefined if input is falsy
 * @example
 * ```typescript
 * const film = { brand: '<script>evil</script>', name: 'Test Film', isoSpeed: 400, colorType: 'bw' };
 * const safe = sanitizeCustomFilm(film);
 * console.log(safe.brand); // 'evil' (script tag removed)
 * ```
 */
export function sanitizeCustomFilm(
  film: CustomFilmData | undefined | null
): CustomFilmData | undefined {
  if (!film) return undefined;

  return {
    ...film,
    brand: sanitizeText(film.brand, 100) || 'Unknown',
    name: sanitizeText(film.name, 100) || 'Unknown',
    grainStructure: sanitizeText(film.grainStructure, 100),
    description: sanitizeText(film.description, 500),
  };
}

/**
 * Sanitize custom developer data to prevent XSS attacks.
 * Preserves all fields while sanitizing text values, including dilution arrays.
 *
 * @param developer - Custom developer data object to sanitize
 * @returns Sanitized developer data, or undefined if input is falsy
 * @example
 * ```typescript
 * const dev = { manufacturer: '<script>evil</script>', name: 'HC-110', type: 'liquid', filmOrPaper: 'film', dilutions: [] };
 * const safe = sanitizeCustomDeveloper(dev);
 * console.log(safe.manufacturer); // 'evil' (script tag removed)
 * ```
 */
export function sanitizeCustomDeveloper(
  developer: CustomDeveloperData | undefined | null
): CustomDeveloperData | undefined {
  if (!developer) return undefined;

  return {
    ...developer,
    manufacturer: sanitizeText(developer.manufacturer, 100) || 'Unknown',
    name: sanitizeText(developer.name, 100) || 'Unknown',
    type: sanitizeText(developer.type, 100) || 'Unknown',
    notes: sanitizeText(developer.notes, 1000),
    mixingInstructions: sanitizeText(developer.mixingInstructions, 2000),
    safetyNotes: sanitizeText(developer.safetyNotes, 1000),
    dilutions: developer.dilutions.map((d) => ({
      name: sanitizeText(d.name, 50) || 'Unknown',
      dilution: sanitizeText(d.dilution, 50) || '1:1',
    })),
  };
}

/**
 * Sanitize an array of tags.
 * Removes empty values after sanitization.
 *
 * @param tags - Array of tag strings to sanitize
 * @returns Sanitized tags array, or undefined if input is falsy
 * @example
 * ```typescript
 * const tags = ['<b>bold</b>', 'normal', ''];
 * const safe = sanitizeTags(tags);
 * console.log(safe); // ['bold', 'normal']
 * ```
 */
export function sanitizeTags(
  tags: string[] | undefined | null
): string[] | undefined {
  if (!tags) return undefined;
  return tags.reduce<string[]>((acc, tag) => {
    const sanitized = sanitizeText(tag, 50);
    if (sanitized) acc.push(sanitized);
    return acc;
  }, []);
}
