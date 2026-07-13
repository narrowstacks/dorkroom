import {
  formatForDisplay,
  generateBorderSliderLabels,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { LabeledSliderInput } from '../../../components/labeled-slider-input';
import { StatusAlert } from '../../../components/status-alert';
import { useBorderCalculator } from '../border-calculator-context';

interface BorderSizeSectionProps {
  onClose: () => void;
}

export function BorderSizeSection({ onClose }: BorderSizeSectionProps) {
  const {
    form,
    maxAllowedMinBorder,
    quarterRoundedMinBorder,
    minBorderWarning,
    handleRoundMinBorderToQuarter,
  } = useBorderCalculator();

  const minBorder = form.getFieldValue('minBorder');

  const borderSliderLabels = useMemo(
    () => generateBorderSliderLabels(maxAllowedMinBorder),
    [maxAllowedMinBorder]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Border Size</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10"
          aria-label="Close border size"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-4">
        <LabeledSliderInput
          label="Minimum Border (inches):"
          value={minBorder}
          onChange={(value) => {
            form.setFieldValue('minBorder', value);
            form.setFieldValue('lastValidMinBorder', value);
          }}
          onSliderChange={(value) => form.setFieldValue('minBorder', value)}
          min={SLIDER_MIN_BORDER}
          max={maxAllowedMinBorder}
          step={SLIDER_STEP_BORDER}
          labels={borderSliderLabels}
          continuousUpdate={true}
        />

        <div className="space-y-1">
          <button
            type="button"
            onClick={handleRoundMinBorderToQuarter}
            disabled={quarterRoundedMinBorder === null}
            className="w-full rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            title="Adjust minimum border so the print size lands on ¼-inch increments"
          >
            Round to 1/4"
          </button>
          {/* min-h reserves the caption's line so the controls below don't
              jump while the slider crosses aligned/non-aligned values */}
          <p
            className="min-h-4 text-xs text-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {quarterRoundedMinBorder !== null && (
              <>
                Sets min border to {formatForDisplay(quarterRoundedMinBorder)}
                {'″'}
              </>
            )}
          </p>
        </div>

        {minBorderWarning && (
          <StatusAlert message={minBorderWarning} action="error" />
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white mb-2">
            About Border Size
          </h4>
          <p className="text-xs text-white/70 leading-relaxed">
            How much white space around the image. Bigger borders mean a smaller
            print, but they give you room if the easel is slightly off.
          </p>
        </div>
      </div>
    </div>
  );
}
