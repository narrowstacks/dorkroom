import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value, delaying updates until after the specified delay period.
 * Useful for preventing excessive API calls or expensive calculations during rapid input changes.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds before updating the debounced value
 * @returns The debounced value
 *
 * @example
 * ```typescript
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * // Only trigger search when user stops typing for 300ms
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     performSearch(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that debounces a callback function, delaying execution until after the specified delay period.
 * Useful for preventing excessive function calls during rapid user interactions.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds before executing the callback
 * @returns The debounced callback function
 *
 * @example
 * ```typescript
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   console.log('Searching for:', term);
 *   // Perform expensive search operation
 * }, 500);
 *
 * // Call handleSearch rapidly - only executes after 500ms of inactivity
 * handleSearch('query1');
 * handleSearch('query2');
 * handleSearch('query3'); // Only this final call will execute
 * ```
 */
export function useDebouncedCallback<A extends unknown[], R>(
  callback: (...args: A) => R,
  delay: number
): (...args: A) => R {
  const [debouncedCallback, setDebouncedCallback] = useState<
    (...args: A) => R
  >(() => callback);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallback(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay]);

  return debouncedCallback;
}
