import { useMemo, useState, useEffect } from 'react';
import type { AnyFormApi } from '@tanstack/react-form';
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
  form: AnyFormApi;
  isLandscape: boolean;
  isRatioFlipped: boolean;
}

export function PaperSizeSection({
  onClose,
  form,
  isLandscape,
  isRatioFlipped,
}: PaperSizeSectionProps) {
  const aspectRatio = form.getFieldValue('aspectRatio');
  const isEvenBordersSelected = aspectRatio === 'even-borders';
  const customAspectWidth = form.getFieldValue('customAspectWidth');
  const customAspectHeight = form.getFieldValue('customAspectHeight');
  const paperSize = form.getFieldValue('paperSize');
  const customPaperWidth = form.getFieldValue('customPaperWidth');
  const customPaperHeight = form.getFieldValue('customPaperHeight');
  const { unit } = useMeasurement();
  const { toInches, toDisplay } = useMeasurementConverter();

  // Local string state for custom paper dimensions (in display units)
  const [paperWidthInput, setPaperWidthInput] = useState(
    String(toDisplay(customPaperWidth))
  );
  const [paperHeightInput, setPaperHeightInput] = useState(
    String(toDisplay(customPaperHeight))
  );
  const [isEditingWidth, setIsEditingWidth] = useState(false);
  const [isEditingHeight, setIsEditingHeight] = useState(false);

  // Sync local state when parent state or unit changes (but not while editing)
  useEffect(() => {
    if (!isEditingWidth) {
      const displayValue = toDisplay(customPaperWidth);
      // Round to 3 decimals to avoid floating point artifacts
      setPaperWidthInput(String(Math.round(displayValue * 1000) / 1000));
    }
  }, [customPaperWidth, toDisplay, isEditingWidth]);

  useEffect(() => {
    if (!isEditingHeight) {
      const displayValue = toDisplay(customPaperHeight);
      // Round to 3 decimals to avoid floating point artifacts
      setPaperHeightInput(String(Math.round(displayValue * 1000) / 1000));
    }
  }, [customPaperHeight, toDisplay, isEditingHeight]);

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
    setIsEditingWidth(true);
    setPaperWidthInput(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      form.setFieldValue('customPaperWidth', inches);
      form.setFieldValue('lastValidCustomPaperWidth', inches);
    }
  };

  // Handle width blur - convert to inches when stable
  const handleWidthBlur = () => {
    setIsEditingWidth(false);
    const inches = validateAndConvert(paperWidthInput);
    if (inches !== null) {
      form.setFieldValue('customPaperWidth', inches);
      form.setFieldValue('lastValidCustomPaperWidth', inches);
      // Format the display value to avoid floating point precision artifacts
      const displayValue = toDisplay(inches);
      setPaperWidthInput(String(Math.round(displayValue * 1000) / 1000));
    } else if (paperWidthInput === '' || /^\s*$/.test(paperWidthInput)) {
      // Reset to current value if empty
      setPaperWidthInput(String(toDisplay(customPaperWidth)));
    } else {
      // Reset to current value if invalid
      setPaperWidthInput(String(toDisplay(customPaperWidth)));
    }
  };

  // Handle height input change
  const handleHeightChange = (value: string) => {
    setIsEditingHeight(true);
    setPaperHeightInput(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      form.setFieldValue('customPaperHeight', inches);
      form.setFieldValue('lastValidCustomPaperHeight', inches);
    }
  };

  // Handle height blur - convert to inches when stable
  const handleHeightBlur = () => {
    setIsEditingHeight(false);
    const inches = validateAndConvert(paperHeightInput);
    if (inches !== null) {
      form.setFieldValue('customPaperHeight', inches);
      form.setFieldValue('lastValidCustomPaperHeight', inches);
      // Format the display value to avoid floating point precision artifacts
      const displayValue = toDisplay(inches);
      setPaperHeightInput(String(Math.round(displayValue * 1000) / 1000));
    } else if (paperHeightInput === '' || /^\s*$/.test(paperHeightInput)) {
      // Reset to current value if empty
      setPaperHeightInput(String(toDisplay(customPaperHeight)));
    } else {
      // Reset to current value if invalid
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
          onValueChange={(value) => {
            form.setFieldValue('aspectRatio', value);
            form.setFieldValue(
              'lastValidCustomAspectWidth',
              form.getFieldValue('customAspectWidth')
            );
            form.setFieldValue(
              'lastValidCustomAspectHeight',
              form.getFieldValue('customAspectHeight')
            );
          }}
          items={ASPECT_RATIOS as SelectItem[]}
          placeholder="Select Aspect Ratio"
        />

        {aspectRatio === 'custom' && (
          <DimensionInputGroup
            widthValue={String(customAspectWidth)}
            onWidthChange={(value) => {
              const num = Number(value);
              if (!Number.isFinite(num) || num <= 0) {
                return;
              }
              form.setFieldValue('customAspectWidth', num);
              form.setFieldValue('lastValidCustomAspectWidth', num);
            }}
            heightValue={String(customAspectHeight)}
            onHeightChange={(value) => {
              const num = Number(value);
              if (!Number.isFinite(num) || num <= 0) {
                return;
              }
              form.setFieldValue('customAspectHeight', num);
              form.setFieldValue('lastValidCustomAspectHeight', num);
            }}
            widthLabel="Width:"
            heightLabel="Height:"
            widthPlaceholder="Width"
            heightPlaceholder="Height"
          />
        )}

        <Select
          label="Paper Size:"
          selectedValue={paperSize}
          onValueChange={(value) => form.setFieldValue('paperSize', value)}
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
            type="button"
            onClick={() => form.setFieldValue('isLandscape', !isLandscape)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <RotateCw className="h-4 w-4" />
            Flip Paper
          </button>
          <button
            type="button"
            onClick={() => {
              if (isEvenBordersSelected) return;
              form.setFieldValue('isRatioFlipped', !isRatioFlipped);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition ${
              isEvenBordersSelected
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-white/10'
            }`}
            disabled={isEvenBordersSelected}
            aria-disabled={isEvenBordersSelected}
            title={
              isEvenBordersSelected
                ? 'Even borders automatically match your paper orientation; flipping is disabled.'
                : undefined
            }
          >
            <Square className="h-4 w-4" />
            Flip Ratio
          </button>
        </div>
      </div>
    </div>
  );
}
