import { useMemo, useState, useEffect } from 'react';
import { X, RotateCw, Square } from 'lucide-react';
import {
  Select,
  DimensionInputGroup,
  useMeasurement,
  formatDimensions,
  useMeasurementConverter,
} from '@dorkroom/ui';
import { ASPECT_RATIOS, PAPER_SIZES, type SelectItem } from '@dorkroom/logic';

interface PaperSizeSectionProps {
  onClose: () => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  customAspectWidth: number;
  setCustomAspectWidth: (value: number) => void;
  customAspectHeight: number;
  setCustomAspectHeight: (value: number) => void;
  paperSize: string;
  setPaperSize: (value: string) => void;
  customPaperWidth: number;
  setCustomPaperWidth: (value: number) => void;
  customPaperHeight: number;
  setCustomPaperHeight: (value: number) => void;
  isLandscape: boolean;
  setIsLandscape: (value: boolean) => void;
  isRatioFlipped: boolean;
  setIsRatioFlipped: (value: boolean) => void;
}

export function PaperSizeSection({
  onClose,
  aspectRatio,
  setAspectRatio,
  customAspectWidth,
  setCustomAspectWidth,
  customAspectHeight,
  setCustomAspectHeight,
  paperSize,
  setPaperSize,
  customPaperWidth,
  setCustomPaperWidth,
  customPaperHeight,
  setCustomPaperHeight,
  isLandscape,
  setIsLandscape,
  isRatioFlipped,
  setIsRatioFlipped,
}: PaperSizeSectionProps) {
  const { unit } = useMeasurement();
  const { toInches, toDisplay } = useMeasurementConverter();

  // Local string state for custom paper dimensions (in display units)
  const [paperWidthInput, setPaperWidthInput] = useState(
    String(toDisplay(customPaperWidth))
  );
  const [paperHeightInput, setPaperHeightInput] = useState(
    String(toDisplay(customPaperHeight))
  );

  // Sync local state when parent state or unit changes
  useEffect(() => {
    setPaperWidthInput(String(toDisplay(customPaperWidth)));
  }, [customPaperWidth, toDisplay]);

  useEffect(() => {
    setPaperHeightInput(String(toDisplay(customPaperHeight)));
  }, [customPaperHeight, toDisplay]);

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
  const handleWidthChange = (value: string) => {
    setPaperWidthInput(value);
  };

  // Handle width blur - convert to inches when stable
  const handleWidthBlur = () => {
    const inches = validateAndConvert(paperWidthInput);
    if (inches !== null) {
      setCustomPaperWidth(inches);
    } else if (paperWidthInput === '' || /^\s*$/.test(paperWidthInput)) {
      // Reset to current value if empty
      setPaperWidthInput(String(toDisplay(customPaperWidth)));
    }
  };

  // Handle height input change
  const handleHeightChange = (value: string) => {
    setPaperHeightInput(value);
  };

  // Handle height blur - convert to inches when stable
  const handleHeightBlur = () => {
    const inches = validateAndConvert(paperHeightInput);
    if (inches !== null) {
      setCustomPaperHeight(inches);
    } else if (paperHeightInput === '' || /^\s*$/.test(paperHeightInput)) {
      // Reset to current value if empty
      setPaperHeightInput(String(toDisplay(customPaperHeight)));
    }
  };

  // Transform paper sizes to show metric with imperial reference when in metric mode
  const displayPaperSizes = useMemo(() => {
    return PAPER_SIZES.map((size) => {
      if (size.value === 'custom') {
        return size; // Keep "Custom Paper Size" as is
      }

      if (unit === 'metric') {
        // Show metric dimensions with imperial reference
        // e.g., "20.3×25.4cm (8×10in)"
        const metricLabel = formatDimensions(size.width, size.height, unit);
        const imperialLabel = `${size.width}×${size.height}in`;
        return {
          ...size,
          label: `${metricLabel} (${imperialLabel})`,
        };
      }

      // In imperial mode, keep original labels
      return size;
    });
  }, [unit]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Paper & Image Size</h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <Select
          label="Aspect Ratio:"
          selectedValue={aspectRatio}
          onValueChange={setAspectRatio}
          items={ASPECT_RATIOS as SelectItem[]}
          placeholder="Select Aspect Ratio"
        />

        {aspectRatio === 'custom' && (
          <DimensionInputGroup
            widthValue={String(customAspectWidth)}
            onWidthChange={(value) => setCustomAspectWidth(Number(value) || 0)}
            heightValue={String(customAspectHeight)}
            onHeightChange={(value) =>
              setCustomAspectHeight(Number(value) || 0)
            }
            widthLabel="Width:"
            heightLabel="Height:"
            widthPlaceholder="Width"
            heightPlaceholder="Height"
          />
        )}

        <Select
          label="Paper Size:"
          selectedValue={paperSize}
          onValueChange={setPaperSize}
          items={displayPaperSizes as SelectItem[]}
          placeholder="Select Paper Size"
        />

        {paperSize === 'custom' && (
          <DimensionInputGroup
            widthValue={paperWidthInput}
            onWidthChange={handleWidthChange}
            onWidthBlur={handleWidthBlur}
            heightValue={paperHeightInput}
            onHeightChange={handleHeightChange}
            onHeightBlur={handleHeightBlur}
            widthLabel="Width"
            heightLabel="Height"
            widthPlaceholder="Width"
            heightPlaceholder="Height"
          />
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setIsLandscape(!isLandscape)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <RotateCw className="h-4 w-4" />
            Flip Paper
          </button>
          <button
            onClick={() => setIsRatioFlipped(!isRatioFlipped)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Square className="h-4 w-4" />
            Flip Ratio
          </button>
        </div>
      </div>
    </div>
  );
}
