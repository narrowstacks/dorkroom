import type { AnyFormApi } from '@tanstack/react-form';
import { X } from 'lucide-react';
import { LabeledSliderInput } from '../../../components/labeled-slider-input';
import { WarningAlert } from '../../../components/warning-alert';
import {
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
} from '@dorkroom/logic';

interface BorderSizeSectionProps {
  onClose: () => void;
  form: AnyFormApi;
  minBorderWarning?: string;
  onRoundToQuarter?: () => void;
  roundToQuarterDisabled?: boolean;
}

export function BorderSizeSection({
  onClose,
  form,
  minBorderWarning,
  onRoundToQuarter,
  roundToQuarterDisabled,
}: BorderSizeSectionProps) {
  const minBorder = form.getFieldValue('minBorder');
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
          onChange={(value) => {
            form.setFieldValue('minBorder', value);
            form.setFieldValue('lastValidMinBorder', value);
          }}
          onSliderChange={(value) => form.setFieldValue('minBorder', value)}
          min={SLIDER_MIN_BORDER}
          max={SLIDER_MAX_BORDER}
          step={SLIDER_STEP_BORDER}
          labels={BORDER_SLIDER_LABELS}
          continuousUpdate={true}
        />

        {onRoundToQuarter && (
          <button
            type="button"
            onClick={onRoundToQuarter}
            disabled={roundToQuarterDisabled}
            className="w-full rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Round to 1/4"
          </button>
        )}

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
