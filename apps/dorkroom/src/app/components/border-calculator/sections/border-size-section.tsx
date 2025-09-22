import { X } from 'lucide-react';
import { LabeledSliderInput, WarningAlert } from '@dorkroom/ui';
import {
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
} from '@dorkroom/logic';

interface BorderSizeSectionProps {
  onClose: () => void;
  minBorder: number;
  setMinBorder: (value: number) => void;
  setMinBorderSlider: (value: number) => void;
  minBorderWarning?: string;
}

export function BorderSizeSection({
  onClose,
  minBorder,
  setMinBorder,
  setMinBorderSlider,
  minBorderWarning,
}: BorderSizeSectionProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Border Size</h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <LabeledSliderInput
          label="Minimum Border (inches):"
          value={minBorder}
          onChange={setMinBorder}
          onSliderChange={setMinBorderSlider}
          min={SLIDER_MIN_BORDER}
          max={SLIDER_MAX_BORDER}
          step={SLIDER_STEP_BORDER}
          labels={BORDER_SLIDER_LABELS}
          continuousUpdate={true}
        />

        {minBorderWarning && (
          <WarningAlert message={minBorderWarning} action="error" />
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white mb-2">
            About Border Size
          </h4>
          <p className="text-xs text-white/70 leading-relaxed">
            The minimum border determines how much white space surrounds your
            image. Larger borders provide more safety margin but reduce the
            effective image size.
          </p>
        </div>
      </div>
    </div>
  );
}
