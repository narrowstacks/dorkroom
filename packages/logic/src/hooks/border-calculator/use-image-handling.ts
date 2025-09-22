/* ------------------------------------------------------------------ *
   use-image-handling.ts
   -------------------------------------------------------------
   Image state helpers adapted from the original implementation
\* ------------------------------------------------------------------ */

import { useRef, useCallback } from 'react';
import type {
  BorderCalculatorState,
  BorderCalculatorAction,
} from '../../types/border-calculator';

export const useImageHandling = (
  state: BorderCalculatorState,
  dispatch: (action: BorderCalculatorAction) => void,
) => {
  const imageLayoutRef = useRef({ width: 0, height: 0 });

  const setImageLayout = useCallback((layout: { width: number; height: number }) => {
    imageLayoutRef.current = layout;
  }, []);

  const setSelectedImageUri = useCallback(
    (uri: string | null) => {
      dispatch({
        type: 'SET_IMAGE_FIELD',
        key: 'selectedImageUri',
        value: uri,
      });
    },
    [dispatch],
  );

  const setImageDimensions = useCallback(
    (dimensions: { width: number; height: number }) => {
      dispatch({ type: 'SET_IMAGE_DIMENSIONS', value: dimensions });
    },
    [dispatch],
  );

  const setIsCropping = useCallback(
    (isCropping: boolean) => {
      dispatch({
        type: 'SET_IMAGE_FIELD',
        key: 'isCropping',
        value: isCropping,
      });
    },
    [dispatch],
  );

  const setCropOffset = useCallback(
    (offset: { x: number; y: number }) => {
      dispatch({ type: 'SET_CROP_OFFSET', value: offset });
    },
    [dispatch],
  );

  const setCropScale = useCallback(
    (scale: number) => {
      dispatch({ type: 'SET_IMAGE_FIELD', key: 'cropScale', value: scale });
    },
    [dispatch],
  );

  return {
    selectedImageUri: state.selectedImageUri,
    imageDimensions: state.imageDimensions,
    isCropping: state.isCropping,
    cropOffset: state.cropOffset,
    cropScale: state.cropScale,
    imageLayout: imageLayoutRef.current,
    setSelectedImageUri,
    setImageDimensions,
    setIsCropping,
    setCropOffset,
    setCropScale,
    setImageLayout,
  };
};

export default useImageHandling;
