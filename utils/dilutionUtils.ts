/**
 * Utility functions for handling dilution ratios in development recipes
 * Supports both colon (:) and plus (+) notation, preferring plus notation for display
 */

/**
 * Parses dilution string to extract ratio (e.g., "1:9" or "1+9" returns 0.1)
 * @param dilution - The dilution string to parse
 * @returns The dilution ratio as a decimal (developer parts / total parts)
 */
export function parseDilutionRatio(dilution: string): number {
  if (!dilution || dilution.toLowerCase() === 'stock') {
    return 1; // Stock solution = 100% developer
  }

  // Handle percentage format first (like "10%")
  const percentMatch = dilution.match(/(\d+)%/);
  if (percentMatch) {
    return parseInt(percentMatch[1]) / 100;
  }

  // Handle formats like "1:9", "1+9", "1 part to 9 parts water"
  const ratioMatch = dilution.match(/(\d+)[\s:+]*(\d+)/);
  if (ratioMatch) {
    const developerParts = parseInt(ratioMatch[1]);
    const waterParts = parseInt(ratioMatch[2]);
    return developerParts / (developerParts + waterParts);
  }

  // Default to stock if we can't parse
  return 1;
}

/**
 * Normalizes dilution string to plus notation format
 * Converts "1:9" to "1+9", leaves "Stock" and percentages unchanged
 * @param dilution - The dilution string to normalize
 * @returns The normalized dilution string in plus notation
 */
export function normalizeDilution(dilution: string): string {
  if (!dilution || !dilution.trim()) {
    return 'Stock';
  }

  const trimmed = dilution.trim();

  // Return as-is for stock and percentage formats
  if (trimmed.toLowerCase() === 'stock' || trimmed.includes('%')) {
    return trimmed;
  }

  // Convert colon notation to plus notation (only colon, not plus)
  const colonMatch = trimmed.match(/(\d+)[\s]*:[\s]*(\d+)/);
  if (colonMatch) {
    const developerParts = colonMatch[1];
    const waterParts = colonMatch[2];
    return `${developerParts}+${waterParts}`;
  }

  // If already in plus notation or unrecognized format, return as-is
  return trimmed;
}

/**
 * Formats dilution for display, ensuring consistent plus notation
 * @param dilution - The dilution string to format
 * @returns The formatted dilution string
 */
export function formatDilution(dilution: string): string {
  const normalized = normalizeDilution(dilution);

  // For display purposes, replace any remaining colons with pluses in ratio-like strings.
  // This handles more complex cases like "1:1:100" that normalizeDilution may not cover.
  if (normalized.includes(':') && /\d/.test(normalized)) {
    return normalized.replace(/:/g, '+');
  }

  return normalized;
}

/**
 * Check whether a dilution string matches a recognized format.
 *
 * @param dilution - The dilution string to validate
 * @returns `true` if the string is "Stock", a ratio like `1:9` or `1+9`, or a percentage like `10%`, `false` otherwise
 */
export function isValidDilution(dilution: string): boolean {
  if (!dilution) {
    return false;
  }

  const trimmed = dilution.trim();

  // Valid formats: "Stock", "1:9", "1+9", "10%"
  return (
    trimmed.toLowerCase() === 'stock' ||
    /^\d+[\s:+]\d+$/.test(trimmed) ||
    /^\d+%$/.test(trimmed)
  );
}

/**
 * Parse a dilution string into numeric developer and water parts.
 *
 * Accepts formats with two integers separated by `:`, `+`, or whitespace (e.g., "1:9", "1+9", "1 9").
 * Treats falsy values or "stock" (any case) as `{ developerParts: 1, waterParts: 0 }`.
 *
 * @param dilution - The dilution string to parse
 * @returns An object with `developerParts` and `waterParts` when a two-part ratio is parsed; `null` for percentage formats or unrecognized input
 */
export function getDilutionParts(
  dilution: string
): { developerParts: number; waterParts: number } | null {
  if (!dilution || dilution.toLowerCase() === 'stock') {
    return { developerParts: 1, waterParts: 0 };
  }

  // Don't handle percentage format here - return null for those
  if (dilution.includes('%')) {
    return null;
  }

  const ratioMatch = dilution.match(/(\d+)[\s:+]*(\d+)/);
  if (ratioMatch) {
    return {
      developerParts: parseInt(ratioMatch[1]),
      waterParts: parseInt(ratioMatch[2]),
    };
  }

  return null;
}

/**
 * Creates a human-readable description of the dilution
 * @param dilution - The dilution string to describe
 * @returns A descriptive string explaining the dilution
 */
export function describeDilution(dilution: string): string {
  if (!dilution || dilution.toLowerCase() === 'stock') {
    return 'Stock solution (undiluted)';
  }

  // Handle percentage format first
  const percentMatch = dilution.match(/(\d+)%/);
  if (percentMatch) {
    return `${percentMatch[1]}% developer solution`;
  }

  const parts = getDilutionParts(dilution);
  if (parts) {
    const { developerParts, waterParts } = parts;
    if (waterParts === 0) {
      return 'Stock solution (undiluted)';
    }
    return `${developerParts} part${
      developerParts !== 1 ? 's' : ''
    } developer + ${waterParts} part${waterParts !== 1 ? 's' : ''} water`;
  }

  return dilution;
}
