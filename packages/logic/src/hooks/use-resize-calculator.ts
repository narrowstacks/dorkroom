import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_NEW_HEIGHT,
  DEFAULT_NEW_LENGTH,
  DEFAULT_NEW_WIDTH,
  DEFAULT_ORIGINAL_HEIGHT,
  DEFAULT_ORIGINAL_LENGTH,
  DEFAULT_ORIGINAL_TIME,
  DEFAULT_ORIGINAL_WIDTH,
} from '../constants/resize-calculator';
import type { resizeCalculatorLink } from '../schemas/resize-calculator.schema';
import { parseDecimalInput } from '../utils/input-validation';
import {
  calculateResizeExposure,
  matchesAspectRatio,
} from '../utils/resize-calculations';

export interface UseResizeCalculatorReturn {
  isEnlargerHeightMode: boolean;
  setIsEnlargerHeightMode: (value: boolean) => void;
  originalWidth: string;
  setOriginalWidth: (value: string) => void;
  originalLength: string;
  setOriginalLength: (value: string) => void;
  newWidth: string;
  setNewWidth: (value: string) => void;
  newLength: string;
  setNewLength: (value: string) => void;
  originalTime: string;
  setOriginalTime: (value: string) => void;
  newTime: string;
  stopsDifference: string;
  isAspectRatioMatched: boolean;
  originalHeight: string;
  setOriginalHeight: (value: string) => void;
  newHeight: string;
  setNewHeight: (value: string) => void;
}

/**
 * Hook that calculates darkroom exposure adjustments when resizing prints.
 * Tracks dimension inputs, supports enlarger height mode, and returns derived times.
 *
 * @param options - `overrides`: values the calculator starts with instead of
 *   its defaults, such as a link's (`resizeCalculatorLink.read`). Read on
 *   mount only. This hook does not persist, so they are not stored.
 * @returns State values, setters, and derived exposure information for resizing
 */
export const useResizeCalculator = (options?: {
  overrides?: ReturnType<typeof resizeCalculatorLink.read>;
}): UseResizeCalculatorReturn => {
  const overrides = options?.overrides;
  const [isEnlargerHeightMode, setIsEnlargerHeightMode] = useState(
    () => overrides?.isEnlargerHeightMode ?? false
  );
  const [originalWidth, setOriginalWidth] = useState(() =>
    String(overrides?.originalWidth ?? DEFAULT_ORIGINAL_WIDTH)
  );
  const [originalLength, setOriginalLength] = useState(() =>
    String(overrides?.originalLength ?? DEFAULT_ORIGINAL_LENGTH)
  );
  const [newWidth, setNewWidth] = useState(() =>
    String(overrides?.newWidth ?? DEFAULT_NEW_WIDTH)
  );
  const [newLength, setNewLength] = useState(() =>
    String(overrides?.newLength ?? DEFAULT_NEW_LENGTH)
  );
  const [originalTime, setOriginalTime] = useState(() =>
    String(overrides?.originalTime ?? DEFAULT_ORIGINAL_TIME)
  );
  const [isAspectRatioMatched, setIsAspectRatioMatched] = useState(true);
  const [originalHeight, setOriginalHeight] = useState(() =>
    String(overrides?.originalHeight ?? DEFAULT_ORIGINAL_HEIGHT)
  );
  const [newHeight, setNewHeight] = useState(() =>
    String(overrides?.newHeight ?? DEFAULT_NEW_HEIGHT)
  );

  const checkAspectRatio = useCallback(() => {
    setIsAspectRatioMatched(
      matchesAspectRatio({
        isEnlargerHeightMode,
        originalWidth: parseDecimalInput(originalWidth),
        originalLength: parseDecimalInput(originalLength),
        newWidth: parseDecimalInput(newWidth),
        newLength: parseDecimalInput(newLength),
      })
    );
  }, [
    originalWidth,
    originalLength,
    newWidth,
    newLength,
    isEnlargerHeightMode,
  ]);

  // Calculate exposure directly using useMemo
  const { newTime, stopsDifference } = useMemo(
    () =>
      calculateResizeExposure({
        isEnlargerHeightMode,
        originalTime: parseDecimalInput(originalTime),
        originalWidth: parseDecimalInput(originalWidth),
        originalLength: parseDecimalInput(originalLength),
        newWidth: parseDecimalInput(newWidth),
        newLength: parseDecimalInput(newLength),
        originalHeight: parseDecimalInput(originalHeight),
        newHeight: parseDecimalInput(newHeight),
      }),
    [
      isEnlargerHeightMode,
      originalWidth,
      originalLength,
      newWidth,
      newLength,
      originalTime,
      originalHeight,
      newHeight,
    ]
  );

  // Check aspect ratio when dimensions or mode change
  useEffect(() => {
    checkAspectRatio();
  }, [checkAspectRatio]);

  return {
    isEnlargerHeightMode,
    setIsEnlargerHeightMode,
    originalWidth,
    setOriginalWidth,
    originalLength,
    setOriginalLength,
    newWidth,
    setNewWidth,
    newLength,
    setNewLength,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
    originalHeight,
    setOriginalHeight,
    newHeight,
    setNewHeight,
  };
};
