/**
 * Sanitize user-provided text to prevent XSS attacks.
 * Removes HTML tags and potentially dangerous sequences while preserving readability.
 *
 * SECURITY NOTE: This function provides defense-in-depth sanitization for React applications.
 * React already escapes HTML entities when rendering text, but this function adds an extra
 * layer of protection by removing dangerous patterns before they reach the DOM.
 *
 * Why not DOMPurify?
 * - React's built-in escaping is the primary XSS defense
 * - This app only renders text content (no dangerouslySetInnerHTML)
 * - Adding DOMPurify would increase bundle size for minimal security benefit
 * - Defense-in-depth pattern removal is sufficient for our use case
 *
 * @param text - User input text to sanitize
 * @param maxLength - Optional maximum length (default: 5000)
 * @returns Sanitized text safe for rendering
 */
export function sanitizeText(
  text: string | undefined | null,
  maxLength = 5000
): string {
  if (!text) {
    return '';
  }

  let sanitized = text;

  // Remove all HTML tags (including self-closing and malformed tags)
  // This regex handles: <tag>, </tag>, <tag/>, <tag attr="value">
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove dangerous protocol handlers and event attributes
  // Handle variations: javascript:, JAVASCRIPT:, java\x00script:, etc.
  sanitized = sanitized
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '') // onclick=, onerror=, etc.
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/data\s*:\s*application/gi, '');

  // Remove any remaining script-related content
  // This catches cases where tags were URL-encoded or obfuscated
  sanitized = sanitized
    .replace(/script/gi, '')
    .replace(/iframe/gi, '')
    .replace(/object/gi, '')
    .replace(/embed/gi, '');

  // Remove null bytes and other control characters (except \n, \r, \t)
  // Using RegExp constructor to avoid biome lint warning about control characters
  // This matches: \x00-\x08 (NUL to BS), \x0B (VT), \x0C (FF), \x0E-\x1F (SO to US), \x7F (DEL)
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally matching control characters for sanitization
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // WARNING: Do not manually encode HTML entities here.
  // React automatically handles HTML escaping during rendering.
  // Manual encoding would result in double-encoding (e.g., "&lt;" becomes "&amp;lt;").
  // We've already removed dangerous patterns above (script tags, event handlers, etc.),
  // so we can safely let React handle character escaping.

  // Trim to max length
  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.substring(0, maxLength)}...`;
  }

  // Trim whitespace
  return sanitized.trim();
}

/**
 * Sanitize recipe name specifically.
 * More restrictive than general text sanitization.
 *
 * @param name - Recipe name to sanitize
 * @returns Sanitized recipe name
 */
export function sanitizeRecipeName(name: string | undefined | null): string {
  const sanitized = sanitizeText(name, 200);

  // Recipe names should be even more restrictive
  // Allow only alphanumeric, spaces, hyphens, and common punctuation
  return sanitized.replace(/[^a-zA-Z0-9\s\-_.()&,]/g, '');
}

/**
 * Sanitize recipe notes/description field.
 * Allows more flexibility than recipe names but still safe.
 *
 * @param notes - Recipe notes to sanitize
 * @returns Sanitized notes
 */
export function sanitizeRecipeNotes(notes: string | undefined | null): string {
  return sanitizeText(notes, 2000);
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
  return tags
    .map((tag) => sanitizeText(tag, 50))
    .filter((tag): tag is string => Boolean(tag));
}
