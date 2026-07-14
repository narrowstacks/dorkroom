import { useState } from 'react';
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
  // While the user is typing we hold their raw keystrokes as a "draft"; the rest
  // of the time the input is simply derived from the committed dimension. Keeping
  // the committed value derived (rather than mirrored into state by an effect)
  // means an external change — a preset, a unit switch — shows up on the next
  // render instead of costing a second one.
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  const paperWidthInput =
    widthDraft ?? formatForDisplay(toDisplay(initialWidth));
  const paperHeightInput =
    heightDraft ?? formatForDisplay(toDisplay(initialHeight));

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

  // Handle width input change
  const handlePaperWidthChange = (value: string) => {
    setWidthDraft(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      onWidthChange(inches);
    }
  };

  // Handle width blur - convert to inches when stable. Dropping the draft falls
  // back to the derived display value, which reformats away typing artifacts
  // ("9.5000" → "9.5") and reverts empty or invalid input to the last commit.
  const handlePaperWidthBlur = () => {
    const inches = validateAndConvert(paperWidthInput);
    if (inches !== null) {
      onWidthChange(inches);
    }
    setWidthDraft(null);
  };

  // Handle height input change
  const handlePaperHeightChange = (value: string) => {
    setHeightDraft(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      onHeightChange(inches);
    }
  };

  // Handle height blur - see handlePaperWidthBlur.
  const handlePaperHeightBlur = () => {
    const inches = validateAndConvert(paperHeightInput);
    if (inches !== null) {
      onHeightChange(inches);
    }
    setHeightDraft(null);
  };

  return {
    paperWidthInput,
    paperHeightInput,
    isEditingPaperWidth: widthDraft !== null,
    isEditingPaperHeight: heightDraft !== null,
    handlePaperWidthChange,
    handlePaperWidthBlur,
    handlePaperHeightChange,
    handlePaperHeightBlur,
  };
}
