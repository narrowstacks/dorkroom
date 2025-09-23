import { useState, useEffect, useCallback, useMemo } from 'react';

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

export const useResizeCalculator = (): UseResizeCalculatorReturn => {
  const [isEnlargerHeightMode, setIsEnlargerHeightMode] = useState(false);
  const [originalWidth, setOriginalWidth] = useState('4');
  const [originalLength, setOriginalLength] = useState('6');
  const [newWidth, setNewWidth] = useState('6');
  const [newLength, setNewLength] = useState('9');
  const [originalTime, setOriginalTime] = useState('10');
  const [isAspectRatioMatched, setIsAspectRatioMatched] = useState(true);
  const [originalHeight, setOriginalHeight] = useState('500');
  const [newHeight, setNewHeight] = useState('1000');

  const checkAspectRatio = useCallback(() => {
    // Skip aspect ratio check if in enlarger height mode
    if (isEnlargerHeightMode) {
      setIsAspectRatioMatched(true);
      return;
    }

    const origWidth = parseFloat(originalWidth);
    const origLength = parseFloat(originalLength);
    const newW = parseFloat(newWidth);
    const newL = parseFloat(newLength);

    if (
      isNaN(origWidth) ||
      isNaN(origLength) ||
      isNaN(newW) ||
      isNaN(newL) ||
      origWidth <= 0 ||
      origLength <= 0 ||
      newW <= 0 ||
      newL <= 0
    ) {
      setIsAspectRatioMatched(true);
      return;
    }

    const originalRatio = (origWidth / origLength).toFixed(3);
    const newRatio = (newW / newL).toFixed(3);

    setIsAspectRatioMatched(originalRatio === newRatio);
  }, [
    originalWidth,
    originalLength,
    newWidth,
    newLength,
    isEnlargerHeightMode,
  ]);

  // Calculate exposure directly using useMemo
  const { newTime, stopsDifference } = useMemo(() => {
    const origTime = parseFloat(originalTime);
    let calculatedNewTime = '';
    let calculatedStopsDifference = '';

    if (isEnlargerHeightMode) {
      const origHeight = parseFloat(originalHeight);
      const newH = parseFloat(newHeight);

      if (
        !isNaN(origHeight) &&
        !isNaN(newH) &&
        !isNaN(origTime) &&
        origHeight > 0 &&
        newH > 0 &&
        origTime > 0
      ) {
        const oldMagnification = origHeight;
        const newMagnification = newH;

        const numerator = Math.pow(newMagnification, 2);
        const denominator = Math.pow(oldMagnification, 2);
        const ratio = numerator / denominator;

        const newTimeValue = origTime * ratio;
        const stops = Math.log2(ratio);

        calculatedNewTime = newTimeValue.toFixed(1);
        calculatedStopsDifference = stops.toFixed(2);
      }
    } else {
      const origWidth = parseFloat(originalWidth);
      const origLength = parseFloat(originalLength);
      const newW = parseFloat(newWidth);
      const newL = parseFloat(newLength);

      if (
        !isNaN(origWidth) &&
        !isNaN(origLength) &&
        !isNaN(newW) &&
        !isNaN(newL) &&
        !isNaN(origTime) &&
        origWidth > 0 &&
        origLength > 0 &&
        newW > 0 &&
        newL > 0 &&
        origTime > 0
      ) {
        const originalArea = origWidth * origLength;
        const newArea = newW * newL;

        if (originalArea > 0) {
          const ratio = newArea / originalArea;
          const newTimeValue = origTime * ratio;
          const stops = Math.log2(ratio);

          calculatedNewTime = newTimeValue.toFixed(1);
          calculatedStopsDifference = stops.toFixed(2);
        }
      }
    }
    return {
      newTime: calculatedNewTime,
      stopsDifference: calculatedStopsDifference,
    };
  }, [
    isEnlargerHeightMode,
    originalWidth,
    originalLength,
    newWidth,
    newLength,
    originalTime,
    originalHeight,
    newHeight,
  ]);

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
