/**
 * Sanitize user-provided text to prevent XSS attacks.
 * Removes HTML tags and potentially dangerous characters while preserving readability.
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

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters and sequences
  // Keep common punctuation and letters
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script>/gi, '');

  // Decode common HTML entities to prevent double encoding
  const entityMap: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };

  Object.keys(entityMap).forEach((entity) => {
    sanitized = sanitized.replace(new RegExp(entity, 'g'), entityMap[entity]);
  });

  // Re-escape for safe rendering (React does this automatically, but being explicit)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

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
