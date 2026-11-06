/**
 * Virtualization layout constants for development recipe components.
 * These values are calibrated for the development recipes UI layout.
 */

/**
 * Estimated height for each table row in pixels.
 * Accounts for:
 * - Film info line with inline tags (~24px)
 * - Developer info (~24px)
 * - Padding (8px top + 8px bottom)
 * Total: ~48px for typical row
 */
export const TABLE_ROW_ESTIMATED_HEIGHT = 48;

/**
 * Number of rows to render above/below the visible viewport.
 * Higher values reduce scroll flicker but increase DOM size.
 */
export const TABLE_OVERSCAN = 5;

/**
 * Estimated height for each card row in pixels.
 * Accounts for:
 * - Header section with film/developer names (~48px)
 * - Tags/badges row (~24px)
 * - 2x2 stats grid (ISO, Time, Temp, Dilution) (~96px)
 * - Source link and action buttons (~36px)
 * - Padding (~36px)
 * - Row gap to match horizontal gap-4 (~16px)
 * Total: ~256px for typical card row
 */
export const CARD_ROW_ESTIMATED_HEIGHT = 240;

/**
 * Number of card rows to render above/below the visible viewport.
 * Cards are larger than table rows, so less overscan is needed.
 */
export const CARD_OVERSCAN = 2;
