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
export function shallowEqual<T extends object, U extends object>(
  obj1: T,
  obj2: U | null | undefined
): boolean {
  // Fast path: reference equality
  if (Object.is(obj1, obj2)) {
    return true;
  }

  if (obj2 === null || obj2 === undefined) {
    return false;
  }

  // Arrays compare by reference only
  if (Array.isArray(obj1) || Array.isArray(obj2)) {
    return false;
  }

  const entries1: readonly [string, unknown][] = Object.entries(obj1);
  const values2 = new Map<string, unknown>(Object.entries(obj2));

  // Different number of keys means objects are not equal
  if (entries1.length !== values2.size) {
    return false;
  }

  // Same key count, so matching every key in obj1 is enough. A key missing from
  // obj2 reads as undefined, matching only an undefined value in obj1.
  return entries1.every(([key, value]) => values2.get(key) === value);
}
