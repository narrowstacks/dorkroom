/**
 * Throttle helper function with configurable leading/trailing execution
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } => {
  const { leading = true, trailing = true } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    const execute = () => {
      lastCallTime = now;
      func(...args);
    };

    if (leading && now - lastCallTime >= delay) {
      execute();
    } else if (trailing) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
          lastCallTime = Date.now();
        }
      }, delay - (now - lastCallTime));
    }
  };

  // Add cleanup function
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  return throttled as T & { cancel: () => void };
};

/**
 * Debounce helper function that delays execution until after delay milliseconds
 * have elapsed since the last time the function was invoked.
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { immediate?: boolean } = {}
): T & { cancel: () => void; flush: () => void } => {
  const { immediate = false } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let pendingResolvers: {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }[] = [];

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;

    return new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });

      const callNow = immediate && !timeoutId;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const executeFunction = async () => {
        if (lastArgs) {
          try {
            const result = await func(...lastArgs);
            pendingResolvers.forEach(({ resolve }) => resolve(result));
          } catch (error) {
            pendingResolvers.forEach(({ reject }) => reject(error));
          }
          pendingResolvers = [];
        }
      };

      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (!immediate) {
          executeFunction();
        }
      }, delay);

      if (callNow) {
        executeFunction();
      }
    });
  };

  // Add utility functions
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingResolvers.forEach(({ reject }) =>
      reject(new Error('Debounced function cancelled'))
    );
    pendingResolvers = [];
    lastArgs = null;
  };

  debounced.flush = async () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      const args = lastArgs;
      try {
        const result = await func(...args);
        pendingResolvers.forEach(({ resolve }) => resolve(result));
        pendingResolvers = [];
        return result;
      } catch (error) {
        pendingResolvers.forEach(({ reject }) => reject(error));
        pendingResolvers = [];
        throw error;
      }
    }
    return Promise.resolve();
  };

  return debounced as unknown as T & { cancel: () => void; flush: () => void };
};
