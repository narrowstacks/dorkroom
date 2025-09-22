import { X } from 'lucide-react';
import { LabeledSliderInput } from '../../ui/labeled-slider-input';
import { ToggleSwitch } from '../../ui/toggle-switch';
import { WarningAlert } from '../../ui/warning-alert';
import {
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
} from '../../../constants/border-calculator';

interface PositionOffsetsSectionProps {
  onClose: () => void;
  enableOffset: boolean;
  setEnableOffset: (value: boolean) => void;
  ignoreMinBorder: boolean;
  setIgnoreMinBorder: (value: boolean) => void;
  horizontalOffset: number;
  setHorizontalOffset: (value: number) => void;
  setHorizontalOffsetSlider: (value: number) => void;
  verticalOffset: number;
  setVerticalOffset: (value: number) => void;
  setVerticalOffsetSlider: (value: number) => void;
  offsetWarning?: string;
}

export function PositionOffsetsSection({
  onClose,
  enableOffset,
  setEnableOffset,
  ignoreMinBorder,
  setIgnoreMinBorder,
  horizontalOffset,
  setHorizontalOffset,
  setHorizontalOffsetSlider,
  verticalOffset,
  setVerticalOffset,
  setVerticalOffsetSlider,
  offsetWarning,
}: PositionOffsetsSectionProps) {
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
          onValueChange={setEnableOffset}
        />

        {enableOffset && (
          <div className="space-y-4">
            <ToggleSwitch
              label="Ignore Min Border"
              value={ignoreMinBorder}
              onValueChange={setIgnoreMinBorder}
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
                onChange={setHorizontalOffset}
                onSliderChange={setHorizontalOffsetSlider}
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
                onChange={setVerticalOffset}
                onSliderChange={setVerticalOffsetSlider}
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