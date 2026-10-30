/**
 * Local storage keys for application state persistence.
 *
 * This file is the single source of truth for @dorkroom/logic: declare every
 * persisted key here and never as a string literal at the call site. Per-
 * calculator keys that live next to their defaults are re-exported below.
 * Keys in @dorkroom/ui theme-provider live there.
 *
 * Naming convention for NEW keys: `dorkroom_<feature>_<noun>` in snake_case,
 * with a trailing `_v<N>` only when the stored shape is versioned. Existing
 * keys keep their historical names (values must stay byte-identical), because
 * renaming one orphans users' data.
 *
 * Bumping a key's version: first add a migration that reads the old key,
 * translates it, and writes the new key. Only then list the old key in
 * `SUPERSEDED_STORAGE_KEYS` so it is purged.
 */

export { CAMERA_EXPOSURE_STORAGE_KEY } from '../types/camera-exposure-calculator';
export { EXPOSURE_STORAGE_KEY } from '../types/exposure-calculator';
export { LENS_STORAGE_KEY } from '../types/lens-calculator';
export { RECIPROCITY_STORAGE_KEY } from '../types/reciprocity';
export { MAT_CALCULATOR_STORAGE_KEY } from './mat-calculator';
export { RESIZE_STORAGE_KEY } from './resize-calculator';

export const BORDER_CALCULATOR_STORAGE_KEY = 'borderCalculatorState_v2';

export const BORDER_PRESETS_STORAGE_KEY = 'borderPresets';

export const CUSTOM_RECIPES_STORAGE_KEY = 'dorkroom_custom_recipes';

export const FAVORITE_RECIPES_STORAGE_KEY = 'dorkroom_favorite_recipes';

export const RECIPES_VIEW_MODE_STORAGE_KEY =
  'dorkroom-development-recipes-view-mode';

/**
 * Current key -> older keys it replaced; consumed by
 * `removeSupersededStorageKeys`. An entry here means the old key is deleted,
 * so add one only after a migration has copied its data forward. The purge
 * guard (current key must already exist) only stops a purge before the new
 * key has been written; it does not protect unmigrated data, since the hooks
 * write the current key with defaults when hydration finds nothing.
 * `borderCalculatorState_v1` is listed only because no code can read it.
 */
export const SUPERSEDED_STORAGE_KEYS = {
  [BORDER_CALCULATOR_STORAGE_KEY]: ['borderCalculatorState_v1'],
} as const satisfies Record<string, readonly string[]>;
