import { useState, useEffect } from 'react';
import { formatForDisplay } from '../../utils/precision';

/**
 * NOTE ON ARCHITECTURE: This hook lives in the logic package despite using React hooks
 * because it encapsulates specialized dimension input handling logic specific to the
 * border calculator. While ideally business logic should be framework-agnostic, this
 * hook tightly couples input state management (onChange, onBlur events) with unit
 * conversion logic, making it more practical to keep together here than split across
 * packages. The conversion functions (toDisplay, toInches) are pure and framework-free.
 */

interface UsePaperDimensionInputProps {
  initialWidth: number;
  initialHeight: number;
  toDisplay: (value: number) => number;
  toInches: (value: number) => number;
  onWidthChange: (inches: number) => void;
  onHeightChange: (inches: number) => void;
}

interface UsePaperDimensionInputReturn {
  paperWidthInput: string;
  paperHeightInput: string;
  isEditingPaperWidth: boolean;
  isEditingPaperHeight: boolean;
  handlePaperWidthChange: (value: string) => void;
  handlePaperWidthBlur: () => void;
  handlePaperHeightChange: (value: string) => void;
  handlePaperHeightBlur: () => void;
}

/**
 * Hook to manage paper dimension input with validation and unit conversion
 * Handles the dual state of display units vs. internal inches representation
 */
export function usePaperDimensionInput({
  initialWidth,
  initialHeight,
  toDisplay,
  toInches,
  onWidthChange,
  onHeightChange,
}: UsePaperDimensionInputProps): UsePaperDimensionInputReturn {
  // Local string state for custom paper dimensions (in display units)
  const [paperWidthInput, setPaperWidthInput] = useState(() =>
    formatForDisplay(toDisplay(initialWidth))
  );
  const [paperHeightInput, setPaperHeightInput] = useState(() =>
    formatForDisplay(toDisplay(initialHeight))
  );
  const [isEditingPaperWidth, setIsEditingPaperWidth] = useState(false);
  const [isEditingPaperHeight, setIsEditingPaperHeight] = useState(false);

  // Helper to validate and convert input to inches
  const validateAndConvert = (value: string): number | null => {
    // Allow empty, whitespace, or trailing decimal point
    if (value === '' || /^\s*$/.test(value) || /^\d*\.$/.test(value)) {
      return null;
    }

    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return toInches(parsed);
    }

    return null;
  };

  // Sync local state when parent state or unit changes (but not while editing)
  useEffect(() => {
    if (!isEditingPaperWidth) {
      const displayValue = toDisplay(initialWidth);
      // Round to 3 decimals to avoid floating point artifacts
      setPaperWidthInput(formatForDisplay(displayValue));
    }
  }, [initialWidth, toDisplay, isEditingPaperWidth]);

  useEffect(() => {
    if (!isEditingPaperHeight) {
      const displayValue = toDisplay(initialHeight);
      // Round to 3 decimals to avoid floating point artifacts
      setPaperHeightInput(formatForDisplay(displayValue));
    }
  }, [initialHeight, toDisplay, isEditingPaperHeight]);

  // Handle width input change
  const handlePaperWidthChange = (value: string) => {
    setIsEditingPaperWidth(true);
    setPaperWidthInput(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      onWidthChange(inches);
    }
  };

  // Handle width blur - convert to inches when stable
  const handlePaperWidthBlur = () => {
    setIsEditingPaperWidth(false);
    const inches = validateAndConvert(paperWidthInput);
    if (inches !== null) {
      onWidthChange(inches);
      // Format the display value to avoid floating point precision artifacts
      const displayValue = toDisplay(inches);
      setPaperWidthInput(formatForDisplay(displayValue));
    } else if (paperWidthInput === '' || /^\s*$/.test(paperWidthInput)) {
      // Reset to current value if empty
      setPaperWidthInput(formatForDisplay(toDisplay(initialWidth)));
    } else {
      // Reset to current value if invalid
      setPaperWidthInput(formatForDisplay(toDisplay(initialWidth)));
    }
  };

  // Handle height input change
  const handlePaperHeightChange = (value: string) => {
    setIsEditingPaperHeight(true);
    setPaperHeightInput(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      onHeightChange(inches);
    }
  };

  // Handle height blur - convert to inches when stable
  const handlePaperHeightBlur = () => {
    setIsEditingPaperHeight(false);
    const inches = validateAndConvert(paperHeightInput);
    if (inches !== null) {
      onHeightChange(inches);
      // Format the display value to avoid floating point precision artifacts
      const displayValue = toDisplay(inches);
      setPaperHeightInput(formatForDisplay(displayValue));
    } else if (paperHeightInput === '' || /^\s*$/.test(paperHeightInput)) {
      // Reset to current value if empty
      setPaperHeightInput(formatForDisplay(toDisplay(initialHeight)));
    } else {
      // Reset to current value if invalid
      setPaperHeightInput(formatForDisplay(toDisplay(initialHeight)));
    }
  };

  return {
    paperWidthInput,
    paperHeightInput,
    isEditingPaperWidth,
    isEditingPaperHeight,
    handlePaperWidthChange,
    handlePaperWidthBlur,
    handlePaperHeightChange,
    handlePaperHeightBlur,
  };
}
