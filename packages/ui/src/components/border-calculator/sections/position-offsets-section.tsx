import {
  OFFSET_SLIDER_LABELS,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
} from '@dorkroom/logic';
import { X } from 'lucide-react';
import { LabeledSliderInput } from '../../../components/labeled-slider-input';
import { StatusAlert } from '../../../components/status-alert';
import { ToggleSwitch } from '../../../components/toggle-switch';
import { useBorderCalculator } from '../border-calculator-context';

interface PositionOffsetsSectionProps {
  onClose: () => void;
}

export function PositionOffsetsSection({
  onClose,
}: PositionOffsetsSectionProps) {
  const { form, formValues, offsetWarning } = useBorderCalculator();
  const { enableOffset, ignoreMinBorder } = formValues;

  const horizontalOffset = form.getFieldValue('horizontalOffset');
  const verticalOffset = form.getFieldValue('verticalOffset');
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">
          Position & Offsets
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-primary bg-border-muted p-2 text-primary transition hoverable-action-btn"
          aria-label="Close position & offsets"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-4">
        <ToggleSwitch
          label="Enable Offsets"
          value={enableOffset}
          onValueChange={(value) => form.setFieldValue('enableOffset', value)}
        />

        {enableOffset && (
          <div className="space-y-4">
            <ToggleSwitch
              label="Ignore Min Border"
              value={ignoreMinBorder}
              onValueChange={(value) =>
                form.setFieldValue('ignoreMinBorder', value)
              }
            />

            {ignoreMinBorder && (
              <p className="text-sm text-secondary">
                Print can be positioned freely but will stay within paper edges
              </p>
            )}

            <div className="space-y-4">
              <LabeledSliderInput
                label="Horizontal Offset:"
                value={horizontalOffset}
                onChange={(value) =>
                  form.setFieldValue('horizontalOffset', value)
                }
                onSliderChange={(value) =>
                  form.setFieldValue('horizontalOffset', value)
                }
                min={OFFSET_SLIDER_MIN}
                max={OFFSET_SLIDER_MAX}
                step={OFFSET_SLIDER_STEP}
                labels={OFFSET_SLIDER_LABELS}
                warning={!!offsetWarning}
                continuousUpdate={true}
              />

              <LabeledSliderInput
                label="Vertical Offset:"
                value={verticalOffset}
                onChange={(value) =>
                  form.setFieldValue('verticalOffset', value)
                }
                onSliderChange={(value) =>
                  form.setFieldValue('verticalOffset', value)
                }
                min={OFFSET_SLIDER_MIN}
                max={OFFSET_SLIDER_MAX}
                step={OFFSET_SLIDER_STEP}
                labels={OFFSET_SLIDER_LABELS}
                warning={!!offsetWarning}
                continuousUpdate={true}
              />
            </div>

            {offsetWarning && (
              <StatusAlert message={offsetWarning} action="warning" />
            )}
          </div>
        )}

        <div className="rounded-lg border border-secondary bg-border-muted p-4">
          <h4 className="text-sm font-medium text-primary mb-2">
            About Offsets
          </h4>
          <p className="text-xs text-secondary leading-relaxed">
            Shift the image away from center. Negative values go left/up,
            positive go right/down.
          </p>
        </div>
      </div>
    </div>
  );
}
