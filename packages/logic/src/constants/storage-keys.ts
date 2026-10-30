/**
 * Local storage keys for application state persistence.
 *
 * This file is the single source of truth: declare every persisted key here
 * (or in the calculator's own constants file, re-exported from here) and never
 * as a string literal at the call site.
 *
 * Naming convention for NEW keys: `dorkroom_<feature>_<noun>` in snake_case,
 * with a trailing `_v<N>` only when the stored shape is versioned. Existing
 * keys keep their historical names, because renaming one orphans users' data.
 * When a key's version is bumped, list the old key in
 * `SUPERSEDED_STORAGE_KEYS` so it is purged once the new key holds data.
 */

export const BORDER_CALCULATOR_STORAGE_KEY = 'borderCalculatorState_v2';

export const CUSTOM_RECIPES_STORAGE_KEY = 'dorkroom_custom_recipes';

/**
 * Current key -> older keys it replaced. The cleanup in
 * `removeSupersededStorageKeys` only runs when the current key already holds
 * data, so an old key is never deleted while it may be the user's only copy.
 * No migration is attempted: the `_v1` border payload shape is not recorded in
 * this repo, so it cannot be translated safely.
 */
export const SUPERSEDED_STORAGE_KEYS = {
  [BORDER_CALCULATOR_STORAGE_KEY]: ['borderCalculatorState_v1'],
} as const satisfies Record<string, readonly string[]>;
