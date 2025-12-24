/**
 * Dilution parsing and volume calculation utilities for development chemistry.
 *
 * Supports common dilution formats:
 *
 * Plus Notation (A+B): A parts concentrate + B parts diluent
 * - "1+1" = 1 part concentrate + 1 part water = 2 total parts (50% concentrate)
 * - "1+4" = 1 part concentrate + 4 parts water = 5 total parts (20% concentrate)
 *
 * Colon Notation (A:B): Dilution factor - A parts concentrate in B total parts
 * - "1:4" = 1 part concentrate in 4 total = 1 part concentrate + 3 parts water (25% concentrate)
 * - "1:50" = 1 part concentrate in 50 total = 1 part concentrate + 49 parts water (2% concentrate)
 * - Exception: "1:1" is treated as "1+1" (historical convention meaning equal parts)
 *
 * Stock: No dilution needed (use developer undiluted)
 * - "Stock" or "1+0"
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
 * - Colon notation "1:50": 1 part concentrate in 50 total parts = 1 + 49 water
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

  // Colon format: "1:50", "1:100"
  // Interpretation: Dilution factor - A parts concentrate in B total parts
  // So water = B - A
  // Exception: "1:1" is treated as equivalent to "1+1" (historical convention)
  const colonMatch = normalized.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    const firstNum = parseInt(colonMatch[1], 10);
    const secondNum = parseInt(colonMatch[2], 10);

    // Special case: 1:1 is treated like 1+1 (1 part concentrate + 1 part water)
    // This is a historical convention where 1:1 means equal parts, not "1 in 1"
    if (firstNum === 1 && secondNum === 1) {
      return {
        type: 'ratio',
        concentrateParts: 1,
        waterParts: 1,
        totalParts: 2,
      };
    }

    // Standard dilution factor: A parts in B total
    const concentrateParts = firstNum;
    const totalParts = secondNum;
    const waterParts = totalParts - concentrateParts;

    // Handle edge case where total is less than concentrate
    if (waterParts < 0) {
      return null;
    }

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
      totalParts,
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
