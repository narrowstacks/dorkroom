/**
 * Dilution parsing and volume calculation utilities for development chemistry.
 *
 * Supports common dilution formats:
 *
 * Plus Notation (A+B) and Colon Notation (A:B) are read identically: A parts
 * concentrate + B parts water, total A+B parts. This matches how
 * manufacturers and the community actually write these ratios — Ilford's
 * Ilfotec HC "Dilution B" is documented as 1+31 and stored in our data as
 * "1:31"; both mean the same 1-part-in-32-total mix. There is no special
 * case: "A:B" is not "A parts in B total".
 * - "1+31" = "1:31" = 1 part concentrate + 31 parts water = 32 total parts
 * - "1+4" = "1:4" = 1 part concentrate + 4 parts water = 5 total parts
 *
 * Stock: No dilution needed (use developer undiluted)
 * - "Stock", "1+0", or "A:0"
 */

/**
 * Parsed dilution representation.
 */
export interface DilutionParsed {
  /** Whether this is stock (no mixing) or a ratio requiring mixing */
  type: 'stock' | 'ratio';
  /** Parts of developer concentrate */
  concentrateParts: number;
  /** Parts of water */
  waterParts: number;
  /** Total parts (concentrate + water) */
  totalParts: number;
}

/**
 * Volume calculation result in milliliters.
 */
export interface VolumeResult {
  /** Amount of developer concentrate in ml */
  concentrate: number;
  /** Amount of water in ml */
  water: number;
  /** Total volume in ml */
  total: number;
}

/**
 * Check if a dilution string represents stock (undiluted) developer.
 */
export function isStockDilution(dilution: string): boolean {
  const normalized = dilution.trim().toLowerCase();
  return normalized === 'stock' || normalized === '1+0';
}

/**
 * Parse a dilution string into its component parts.
 *
 * Supported formats:
 * - Plus notation "1+4": 1 part concentrate + 4 parts water = 5 total parts
 * - Colon notation "1:31": read identically to plus notation — 1 part
 *   concentrate + 31 parts water = 32 total parts, matching manufacturer
 *   notation (Ilford 1+31 ≡ 1:31)
 * - "Stock", "1+0": no dilution needed
 *
 * @param dilution - The dilution string from the API
 * @returns Parsed dilution object, or null if unparseable
 */
export function parseDilution(dilution: string): DilutionParsed | null {
  const normalized = dilution.trim().toLowerCase();

  // Stock or 1+0 means no mixing needed
  if (normalized === 'stock' || normalized === '1+0') {
    return {
      type: 'stock',
      concentrateParts: 1,
      waterParts: 0,
      totalParts: 1,
    };
  }

  // Plus format: "1+1", "1+3", "1+31"
  // Interpretation: A parts concentrate + B parts water (total = A + B)
  const plusMatch = normalized.match(/^(\d+)\+(\d+)$/);
  if (plusMatch) {
    const concentrateParts = parseInt(plusMatch[1], 10);
    const waterParts = parseInt(plusMatch[2], 10);
    return {
      type: 'ratio',
      concentrateParts,
      waterParts,
      totalParts: concentrateParts + waterParts,
    };
  }

  // Colon format: "1:31", "1:50"
  // Interpretation: same as plus notation - A parts concentrate + B parts
  // water (total = A + B). Matches manufacturer usage (Ilford 1+31 ≡ 1:31).
  const colonMatch = normalized.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    const concentrateParts = parseInt(colonMatch[1], 10);
    const waterParts = parseInt(colonMatch[2], 10);

    // If water is 0, it's stock
    if (waterParts === 0) {
      return {
        type: 'stock',
        concentrateParts: 1,
        waterParts: 0,
        totalParts: 1,
      };
    }

    return {
      type: 'ratio',
      concentrateParts,
      waterParts,
      totalParts: concentrateParts + waterParts,
    };
  }

  // Unparseable format
  return null;
}

/**
 * Calculate the volumes of concentrate and water needed for a given total volume.
 *
 * @param totalMl - Desired total volume in milliliters
 * @param dilution - Parsed dilution object
 * @returns Volume breakdown in milliliters
 */
export function calculateVolumes(
  totalMl: number,
  dilution: DilutionParsed
): VolumeResult {
  if (dilution.type === 'stock') {
    return {
      concentrate: totalMl,
      water: 0,
      total: totalMl,
    };
  }

  const concentrateMl =
    (totalMl * dilution.concentrateParts) / dilution.totalParts;
  const waterMl = totalMl - concentrateMl;

  return {
    concentrate: concentrateMl,
    water: waterMl,
    total: totalMl,
  };
}

/**
 * Format a parsed dilution as a human-readable description.
 *
 * @param parsed - Parsed dilution object
 * @returns Description string like "1 part concentrate + 3 parts water"
 */
export function formatDilutionDescription(parsed: DilutionParsed): string {
  if (parsed.type === 'stock') {
    return 'Use developer stock (undiluted)';
  }

  const concentrateLabel =
    parsed.concentrateParts === 1
      ? '1 part concentrate'
      : `${parsed.concentrateParts} parts concentrate`;

  const waterLabel =
    parsed.waterParts === 1
      ? '1 part water'
      : `${parsed.waterParts} parts water`;

  return `${concentrateLabel} + ${waterLabel}`;
}
