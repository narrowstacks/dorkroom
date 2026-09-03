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
 * @returns State values, setters, and derived exposure information for resizing
 */
export const useResizeCalculator = (): UseResizeCalculatorReturn => {
  const [isEnlargerHeightMode, setIsEnlargerHeightMode] = useState(false);
  const [originalWidth, setOriginalWidth] = useState(DEFAULT_ORIGINAL_WIDTH);
  const [originalLength, setOriginalLength] = useState(DEFAULT_ORIGINAL_LENGTH);
  const [newWidth, setNewWidth] = useState(DEFAULT_NEW_WIDTH);
  const [newLength, setNewLength] = useState(DEFAULT_NEW_LENGTH);
  const [originalTime, setOriginalTime] = useState(DEFAULT_ORIGINAL_TIME);
  const [isAspectRatioMatched, setIsAspectRatioMatched] = useState(true);
  const [originalHeight, setOriginalHeight] = useState(DEFAULT_ORIGINAL_HEIGHT);
  const [newHeight, setNewHeight] = useState(DEFAULT_NEW_HEIGHT);

  const checkAspectRatio = useCallback(() => {
    setIsAspectRatioMatched(
      matchesAspectRatio({
        isEnlargerHeightMode,
        originalWidth: parseFloat(originalWidth),
        originalLength: parseFloat(originalLength),
        newWidth: parseFloat(newWidth),
        newLength: parseFloat(newLength),
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
        originalTime: parseFloat(originalTime),
        originalWidth: parseFloat(originalWidth),
        originalLength: parseFloat(originalLength),
        newWidth: parseFloat(newWidth),
        newLength: parseFloat(newLength),
        originalHeight: parseFloat(originalHeight),
        newHeight: parseFloat(newHeight),
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
