import {
  formatFocalLength,
  SENSOR_FORMATS,
  useLensCalculator,
} from '@dorkroom/logic';
import {
  getRouteIcon,
  ResultRow,
  Select,
  SensorSizeVisualization,
} from '@dorkroom/ui';
import {
  CalculatorCard,
  CalculatorNumberField,
  CalculatorPageHeader,
  CalculatorStat,
} from '@dorkroom/ui/calculator';
import { ArrowRightLeft } from 'lucide-react';
import type { FC } from 'react';

const HOW_TO_USE = [
  'Select the source format — the sensor or film size you know the focal length for.',
  'Enter the focal length in millimeters for your lens.',
  'Select the target format you want to convert to.',
  'Read the equivalent focal length that gives the same field of view on the target format.',
];

const TIPS = [
  'Smaller sensors crop the image, making lenses appear "longer". The crop factor describes this multiplier relative to full frame.',
  'Equivalent focal lengths match the diagonal field of view, but depth of field and perspective compression still differ.',
  'Larger formats like 6×7 have crop factors less than 1 — a 50mm lens shows a wider field of view than on full frame.',
  'Use this when switching systems or shooting multiple formats to find lenses that give similar framing.',
];

const formatOptions = (() => {
  const items: { value: string; label: string }[] = [];
  let lastCategory = '';
  for (const format of SENSOR_FORMATS) {
    const category =
      format.category === 'digital'
        ? 'Common'
        : format.category === 'film-medium'
          ? 'Medium Format Film'
          : 'Large Format Film';
    if (category !== lastCategory) {
      items.push({
        value: `__divider_${category}__`,
        label: `── ${category} ──`,
      });
      lastCategory = category;
    }
    items.push({
      value: format.id,
      label: `${format.name} (${format.width}×${format.height}mm)`,
    });
  }
  return items;
})();

interface FocalLengthPresetButtonProps {
  value: number;
  label: string;
  onClick: (value: number) => void;
}

const FocalLengthPresetButton: FC<FocalLengthPresetButtonProps> = ({
  value,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={() => onClick(value)}
    className="rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors border min-w-[44px] themed-button"
  >
    {label}
  </button>
);

const FOCAL_LENGTH_PRESETS = [
  { value: 24, label: '24' },
  { value: 35, label: '35' },
  { value: 50, label: '50' },
  { value: 85, label: '85' },
  { value: 135, label: '135' },
];

// eslint-disable-next-line react-doctor/no-giant-component -- size is dominated by the inline How-it-works info section and the results card; a results-card extraction stays deferred to avoid regression risk on this flagship page
export default function LensCalculatorPage() {
  const {
    values,
    setFocalLength,
    setSourceFormat,
    setTargetFormat,
    swapFormats,
    calculation,
  } = useLensCalculator();

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="Format Comparison"
        icon={getRouteIcon('/lenses')}
        accentTone="emerald"
        title="Lens Equivalency Calculator"
        description="Calculate equivalent focal lengths between different sensor and film formats. Find out what lens gives you the same field of view when switching between cameras or formats."
      />

      {/* 2-column grid on desktop */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Column 1: Inputs */}
        <CalculatorCard title="Lens & Format">
          <div className="space-y-4">
            {/* Focal length input with presets */}
            <div>
              <CalculatorNumberField
                label="Focal length (mm)"
                value={String(values.focalLength)}
                onChange={(value: string) => {
                  const parsed = parseFloat(value);
                  setFocalLength(Number.isFinite(parsed) ? parsed : 0);
                }}
                placeholder="50"
                step={1}
              />
              <div className="flex gap-1.5 mt-2">
                {FOCAL_LENGTH_PRESETS.map((preset) => (
                  <FocalLengthPresetButton
                    key={preset.value}
                    value={preset.value}
                    label={preset.label}
                    onClick={setFocalLength}
                  />
                ))}
              </div>
            </div>

            {/* Format selection */}
            <Select
              label="Source format"
              selectedValue={values.sourceFormat}
              onValueChange={setSourceFormat}
              items={formatOptions}
              ariaLabel="Source format"
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapFormats}
                className="p-2 rounded-lg border transition-colors themed-button hover:bg-surface-elevated"
                aria-label="Swap source and target formats"
              >
                <ArrowRightLeft
                  className="size-4"
                  style={{
                    color: 'var(--color-text-primary)',
                    stroke: 'var(--color-text-primary)',
                  }}
                />
              </button>
            </div>

            <Select
              label="Target format"
              selectedValue={values.targetFormat}
              onValueChange={setTargetFormat}
              items={formatOptions}
              ariaLabel="Target format"
            />
          </div>
        </CalculatorCard>

        {/* Column 2: Visualization + Results in single card */}
        {calculation && (
          <CalculatorCard
            title="Equivalent Focal Length"
            accent="emerald"
            padding="compact"
          >
            {/* Visualization */}
            <div className="flex items-center justify-center pb-4 border-b border-secondary">
              <SensorSizeVisualization
                sourceFormat={calculation.sourceFormat}
                targetFormat={calculation.targetFormat}
              />
            </div>

            {/* Results */}
            <div className="grid gap-3 grid-cols-2 pt-4">
              <CalculatorStat
                label="Equivalent"
                value={formatFocalLength(calculation.equivalentFocalLength)}
                helperText={`On ${calculation.targetFormat.shortName}`}
                tone="default"
              />
              <CalculatorStat
                label="Field of view"
                value={`${calculation.fieldOfView.toFixed(1)}°`}
                helperText="Diagonal"
              />
            </div>

            <div
              className="rounded-xl p-3 font-mono text-sm border border-secondary bg-background/20 text-center"
              style={{ color: 'var(--color-on-accent)' }}
            >
              {formatFocalLength(calculation.focalLength)}
              <span style={{ color: 'var(--color-on-accent-muted)' }}>
                {' '}
                on{' '}
              </span>
              <span className="font-medium">
                {calculation.sourceFormat.shortName}
              </span>
              <span style={{ color: 'var(--color-on-accent-muted)' }}> = </span>
              <span className="font-semibold">
                {formatFocalLength(calculation.equivalentFocalLength)}
              </span>
              <span style={{ color: 'var(--color-on-accent-muted)' }}>
                {' '}
                on{' '}
              </span>
              <span className="font-medium">
                {calculation.targetFormat.shortName}
              </span>
            </div>

            <div className="space-y-1.5 text-sm">
              <ResultRow
                label="Source crop factor"
                value={`${calculation.sourceFormat.cropFactor.toFixed(2)}×`}
              />
              <ResultRow
                label="Target crop factor"
                value={`${calculation.targetFormat.cropFactor.toFixed(2)}×`}
              />
            </div>
          </CalculatorCard>
        )}
      </div>
      <div className="mt-8">
        <CalculatorCard
          title="How this calculator works"
          padding="normal"
          className="bg-surface-muted/80"
        >
          <div className="space-y-6">
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Different sensor and film sizes capture different fields of view
              with the same lens. This calculator converts focal lengths between
              formats so you can find lenses that give equivalent framing.
            </p>

            <div className="space-y-3">
              <h4
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                How to use
              </h4>
              <ol className="ml-5 space-y-2 list-decimal">
                {HOW_TO_USE.map((item) => (
                  <li
                    key={item}
                    className="pl-2 text-[15px] leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-3">
              <h4
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Tips
              </h4>
              <ul className="ml-5 space-y-2 list-disc">
                {TIPS.map((tip) => (
                  <li
                    key={tip}
                    className="pl-2 text-[15px] leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CalculatorCard>
      </div>
    </div>
  );
}
