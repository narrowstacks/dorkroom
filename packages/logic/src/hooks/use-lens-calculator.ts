import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_FOCAL_LENGTH,
  DEFAULT_SOURCE_FORMAT,
  DEFAULT_TARGET_FORMAT,
  FOCAL_LENGTH_PRESETS,
  SENSOR_FORMAT_MAP,
  SENSOR_FORMATS,
} from '../constants/lens-calculator-defaults';
import type {
  LensCalculation,
  LensCalculatorState,
  SensorFormat,
} from '../types/lens-calculator';
import { roundToStandardPrecision } from '../utils/precision';

/**
 * Calculates the equivalent focal length when converting between formats
 * Formula: equivalent = focalLength * (targetCropFactor / sourceCropFactor)
 */
export const calculateEquivalentFocalLength = (
  focalLength: number,
  sourceFormat: SensorFormat,
  targetFormat: SensorFormat
): number => {
  const cropFactorRatio = targetFormat.cropFactor / sourceFormat.cropFactor;
  return focalLength * cropFactorRatio;
};

/**
 * Calculates the diagonal field of view for a given focal length and format
 * Formula: 2 * atan(diagonal / (2 * focalLength)) * (180 / PI)
 */
export const calculateFieldOfView = (
  focalLength: number,
  format: SensorFormat
): number => {
  return 2 * Math.atan(format.diagonal / (2 * focalLength)) * (180 / Math.PI);
};

/**
 * Formats a focal length value for display
 */
export const formatFocalLength = (focalLength: number): string => {
  const rounded = roundToStandardPrecision(focalLength);
  // Show integer if close to a whole number
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return `${Math.round(rounded)}mm`;
  }
  return `${rounded.toFixed(1)}mm`;
};

/**
 * Lens equivalency calculator hook for comparing focal lengths across sensor formats.
 * Calculates equivalent focal lengths when switching between different sensor sizes.
 *
 * @returns Object containing calculator state, calculation results, and control functions
 * @example
 * ```typescript
 * const {
 *   focalLength,
 *   setFocalLength,
 *   sourceFormat,
 *   setSourceFormat,
 *   targetFormat,
 *   setTargetFormat,
 *   calculation,
 *   swapFormats,
 * } = useLensCalculator();
 *
 * setFocalLength('50');
 * setSourceFormat('full-frame');
 * setTargetFormat('aps-c-nikon');
 *
 * // calculation.equivalentFocalLength will be ~75mm
 * ```
 */
export const useLensCalculator = () => {
  const [state, setState] = useState<LensCalculatorState>({
    focalLength: DEFAULT_FOCAL_LENGTH,
    sourceFormat: DEFAULT_SOURCE_FORMAT,
    targetFormat: DEFAULT_TARGET_FORMAT,
  });

  // Set focal length
  const setFocalLength = useCallback((focalLength: string) => {
    // Allow typing incomplete numbers
    if (focalLength === '' || focalLength.endsWith('.')) {
      setState((prev) => ({
        ...prev,
        focalLength,
      }));
      return;
    }

    const numericValue = parseFloat(focalLength);
    if (!Number.isNaN(numericValue) && numericValue > 0) {
      const truncated = roundToStandardPrecision(numericValue).toString();
      setState((prev) => ({
        ...prev,
        focalLength: truncated,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        focalLength,
      }));
    }
  }, []);

  // Set source format
  const setSourceFormat = useCallback((formatId: string) => {
    if (SENSOR_FORMAT_MAP[formatId]) {
      setState((prev) => ({
        ...prev,
        sourceFormat: formatId,
      }));
    }
  }, []);

  // Set target format
  const setTargetFormat = useCallback((formatId: string) => {
    if (SENSOR_FORMAT_MAP[formatId]) {
      setState((prev) => ({
        ...prev,
        targetFormat: formatId,
      }));
    }
  }, []);

  // Swap source and target formats
  const swapFormats = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sourceFormat: prev.targetFormat,
      targetFormat: prev.sourceFormat,
    }));
  }, []);

  // Calculate derived values
  const calculation = useMemo((): LensCalculation | null => {
    const focalLengthValue = parseFloat(state.focalLength);
    const sourceFormat = SENSOR_FORMAT_MAP[state.sourceFormat];
    const targetFormat = SENSOR_FORMAT_MAP[state.targetFormat];

    if (
      Number.isNaN(focalLengthValue) ||
      focalLengthValue <= 0 ||
      !sourceFormat ||
      !targetFormat
    ) {
      return null;
    }

    const equivalentFocalLength = calculateEquivalentFocalLength(
      focalLengthValue,
      sourceFormat,
      targetFormat
    );

    const cropFactorRatio = targetFormat.cropFactor / sourceFormat.cropFactor;
    const fieldOfView = calculateFieldOfView(focalLengthValue, sourceFormat);

    return {
      sourceFocalLength: focalLengthValue,
      equivalentFocalLength: roundToStandardPrecision(equivalentFocalLength),
      sourceFormat,
      targetFormat,
      cropFactorRatio: roundToStandardPrecision(cropFactorRatio),
      fieldOfView: roundToStandardPrecision(fieldOfView),
      isValid: true,
    };
  }, [state.focalLength, state.sourceFormat, state.targetFormat]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState({
      focalLength: DEFAULT_FOCAL_LENGTH,
      sourceFormat: DEFAULT_SOURCE_FORMAT,
      targetFormat: DEFAULT_TARGET_FORMAT,
    });
  }, []);

  return {
    // State
    focalLength: state.focalLength,
    sourceFormat: state.sourceFormat,
    targetFormat: state.targetFormat,

    // Actions
    setFocalLength,
    setSourceFormat,
    setTargetFormat,
    swapFormats,
    resetToDefaults,

    // Calculated values
    calculation,

    // Utilities
    formatFocalLength,
    presets: FOCAL_LENGTH_PRESETS,
    formats: SENSOR_FORMATS,
    formatMap: SENSOR_FORMAT_MAP,
  };
};

export type UseLensCalculatorReturn = ReturnType<typeof useLensCalculator>;
