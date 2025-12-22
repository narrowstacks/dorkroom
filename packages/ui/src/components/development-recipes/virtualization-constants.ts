/**
 * Virtualization layout constants for development recipe components.
 * These values are calibrated for the development recipes UI layout.
 */

/**
 * Estimated height for each table row in pixels.
 * Accounts for:
 * - Film info line (16px) + push/pull status (12px) + optional tags (24px)
 * - Developer info with optional custom badge
 * - Padding (16px top + 16px bottom)
 * Total: ~80px for typical row, may vary with tags
 */
export const TABLE_ROW_ESTIMATED_HEIGHT = 80;

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

/**
 * Default container height for virtualized lists.
 * Calculated as: 100dvh - header (64px) - filters (120px) - pagination (96px)
 */
export const DEFAULT_CONTAINER_HEIGHT = 'calc(100dvh - 280px)';

/**
 * Minimum container height to prevent layout collapse on small screens.
 */
export const MIN_CONTAINER_HEIGHT = '400px';

/**
 * Maximum container height to prevent over-expansion.
 * Calculated as: 100dvh - minimal header/footer (120px)
 */
export const MAX_CONTAINER_HEIGHT = 'calc(100dvh - 120px)';
