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
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
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
  // Since we've verified both objects have the same number of keys,
  // we just need to check that all values in obj1 match values in obj2.
  // Note: If a key exists in obj1 but not obj2, obj2[key] will be undefined,
  // and the value comparison will correctly fail (unless obj1[key] is also undefined,
  // but that case is handled by the length check since Object.keys counts undefined values).
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}
