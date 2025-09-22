import { X, RotateCw, Square } from 'lucide-react';
import { Select } from '../../ui/select';
import { DimensionInputGroup } from '../../ui/dimension-input-group';
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
          items={PAPER_SIZES as SelectItem[]}
          placeholder="Select Paper Size"
        />

        {paperSize === 'custom' && (
          <DimensionInputGroup
            widthValue={String(customPaperWidth)}
            onWidthChange={(value) => setCustomPaperWidth(Number(value) || 0)}
            heightValue={String(customPaperHeight)}
            onHeightChange={(value) => setCustomPaperHeight(Number(value) || 0)}
            widthLabel="Width (inches):"
            heightLabel="Height (inches):"
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
