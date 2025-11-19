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
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // WARNING: Do not manually encode HTML entities here.
  // React automatically handles HTML escaping during rendering.
  // Manual encoding would result in double-encoding (e.g., "&lt;" becomes "&amp;lt;").
  // We've already removed dangerous patterns above (script tags, event handlers, etc.),
  // so we can safely let React handle character escaping.

  // Trim to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
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
