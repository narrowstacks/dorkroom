/**
 * Efficiently compares two objects for shallow equality.
 * This is significantly faster than JSON.stringify for object comparison.
 *
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns True if objects have the same keys and values (shallow comparison)
 *
 * @example
 * ```typescript
 * const a = { x: 1, y: 2 };
 * const b = { x: 1, y: 2 };
 * const c = { x: 1, y: 3 };
 *
 * shallowEqual(a, b); // true
 * shallowEqual(a, c); // false
 * ```
 */
export function shallowEqual(obj1: unknown, obj2: unknown): boolean {
  // Fast path: reference equality
  if (obj1 === obj2) {
    return true;
  }

  // Type guard: both must be objects
  if (obj1 === null || typeof obj1 !== 'object') {
    return false;
  }
  if (obj2 === null || typeof obj2 !== 'object') {
    return false;
  }

  // Get keys from both objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Different number of keys means objects are not equal
  if (keys1.length !== keys2.length) {
    return false;
  }

  // Check if all values match
  // Since both objects have the same number of keys (verified above),
  // we only need to check that all values match for each key in obj1.
  for (const key of keys1) {
    if (
      (obj1 as Record<string, unknown>)[key] !==
      (obj2 as Record<string, unknown>)[key]
    ) {
      return false;
    }
  }

  return true;
}
