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
export function shallowEqual(
  obj1: Record<string, any>,
  obj2: Record<string, any>
): boolean {
  // Fast path: reference equality
  if (obj1 === obj2) {
    return true;
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
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}
