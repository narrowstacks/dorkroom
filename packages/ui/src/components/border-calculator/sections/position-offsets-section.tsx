import {
  OFFSET_SLIDER_LABELS,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
} from '@dorkroom/logic';
import type { AnyFormApi } from '@tanstack/react-form';
import { X } from 'lucide-react';
import { LabeledSliderInput } from '../../../components/labeled-slider-input';
import { ToggleSwitch } from '../../../components/toggle-switch';
import { WarningAlert } from '../../../components/warning-alert';

interface PositionOffsetsSectionProps {
  onClose: () => void;
  form: AnyFormApi;
  enableOffset: boolean;
  ignoreMinBorder: boolean;
  offsetWarning?: string;
}

export function PositionOffsetsSection({
  onClose,
  form,
  enableOffset,
  ignoreMinBorder,
  offsetWarning,
}: PositionOffsetsSectionProps) {
  const horizontalOffset = form.getFieldValue('horizontalOffset');
  const verticalOffset = form.getFieldValue('verticalOffset');
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Position & Offsets</h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/20 bg-white/5 p-2 text-white transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
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
              <p className="text-sm text-white/70">
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
              <WarningAlert message={offsetWarning} action="warning" />
            )}
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white mb-2">About Offsets</h4>
          <p className="text-xs text-white/70 leading-relaxed">
            Offsets allow you to position your image off-center on the paper.
            Negative values move left/up, positive values move right/down.
          </p>
        </div>
      </div>
    </div>
  );
}
