import type { InversionAdjustments, NegativeFilmType } from '@dorkroom/logic';
import { LabeledSliderInput } from '@dorkroom/ui';
import { CalculatorCard } from '@dorkroom/ui/calculator';
import { Pipette } from 'lucide-react';
import { ActionButton } from './controls';

interface AdjustmentsCardProps {
  enabled: boolean;
  filmType: NegativeFilmType;
  adjustments: InversionAdjustments;
  hasNeutral: boolean;
  pickingNeutral: boolean;
  onAdjust: (key: keyof InversionAdjustments, value: number) => void;
  onPickNeutral: () => void;
  onClearNeutral: () => void;
}

interface SliderSpec {
  key: keyof InversionAdjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  labels: string[];
}

const TONE_SLIDERS: SliderSpec[] = [
  {
    key: 'exposure',
    label: 'Exposure (stops)',
    min: -3,
    max: 3,
    step: 0.1,
    labels: ['Darker', 'Brighter'],
  },
  {
    key: 'contrast',
    label: 'Contrast',
    min: 0.5,
    max: 2,
    step: 0.05,
    labels: ['Softer', 'Harder'],
  },
];

const COLOUR_SLIDERS: SliderSpec[] = [
  {
    key: 'warmth',
    label: 'Warmth',
    min: -1,
    max: 1,
    step: 0.05,
    labels: ['Cooler', 'Warmer'],
  },
  {
    key: 'tint',
    label: 'Tint',
    min: -1,
    max: 1,
    step: 0.05,
    labels: ['Magenta', 'Green'],
  },
];

export function AdjustmentsCard({
  enabled,
  filmType,
  adjustments,
  hasNeutral,
  pickingNeutral,
  onAdjust,
  onPickNeutral,
  onClearNeutral,
}: AdjustmentsCardProps) {
  if (!enabled) {
    return (
      <CalculatorCard title="Adjustments">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Pick the film base first. Exposure, contrast and colour controls
          appear once there is a positive.
        </p>
      </CalculatorCard>
    );
  }

  const sliders =
    filmType === 'c41' ? [...TONE_SLIDERS, ...COLOUR_SLIDERS] : TONE_SLIDERS;

  return (
    <CalculatorCard
      title="Adjustments"
      description="Changes apply to the preview instantly and to the download."
    >
      {sliders.map((slider) => (
        <LabeledSliderInput
          key={slider.key}
          label={slider.label}
          value={adjustments[slider.key]}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          labels={slider.labels}
          onChange={(value) => onAdjust(slider.key, value)}
          onSliderChange={(value) => onAdjust(slider.key, value)}
        />
      ))}

      {filmType === 'c41' && (
        <div className="space-y-2">
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {hasNeutral
              ? 'Colour balanced on the grey you picked. Warmth and tint adjust from there.'
              : 'Tap something that should be neutral grey (a road, a grey card, a white wall in shade) to balance the colour.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={Pipette}
              onClick={onPickNeutral}
              disabled={pickingNeutral}
            >
              {pickingNeutral
                ? 'Tap the photo…'
                : hasNeutral
                  ? 'Pick again'
                  : 'Pick neutral grey'}
            </ActionButton>
            {hasNeutral && (
              <ActionButton onClick={onClearNeutral}>
                Clear neutral
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </CalculatorCard>
  );
}
