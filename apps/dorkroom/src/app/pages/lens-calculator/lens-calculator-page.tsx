import {
  formatFocalLength,
  LENS_STORAGE_KEY,
  type LensFormState,
  SENSOR_FORMAT_MAP,
  SENSOR_FORMATS,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import {
  CalculatorCard,
  CalculatorNumberField,
  CalculatorPageHeader,
  CalculatorStat,
  createZodFormValidator,
  lensCalculatorSchema,
  ResultRow,
  Select,
  SensorSizeVisualization,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { ArrowRightLeft } from 'lucide-react';
import type { FC } from 'react';

const validateLensForm = createZodFormValidator(lensCalculatorSchema);

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
      format.category === 'digital' ? 'Digital' : 'Medium Format Film';
    if (category !== lastCategory) {
      items.push({ value: '__divider__', label: `── ${category} ──` });
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

export default function LensCalculatorPage() {
  const form = useForm({
    defaultValues: {
      focalLength: 50,
      sourceFormat: 'full-frame',
      targetFormat: 'aps-c-nikon',
    },
    validators: {
      onChange: validateLensForm,
    },
  });

  // Subscribe to form values
  const formValues = useStore(
    form.store,
    (state) => state.values as LensFormState
  );

  // Persist and hydrate form state to/from localStorage
  useLocalStorageFormPersistence({
    storageKey: LENS_STORAGE_KEY,
    form,
    formValues,
    persistKeys: ['focalLength', 'sourceFormat', 'targetFormat'],
    validators: {
      focalLength: {
        validate: (v) =>
          typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 2000,
      },
      sourceFormat: {
        validate: (v) =>
          typeof v === 'string' && SENSOR_FORMAT_MAP[v] !== undefined,
      },
      targetFormat: {
        validate: (v) =>
          typeof v === 'string' && SENSOR_FORMAT_MAP[v] !== undefined,
      },
    },
  });

  const handlePresetClick = (value: number) => {
    form.setFieldValue('focalLength', value);
  };

  const handleSwapFormats = () => {
    const currentSource = form.getFieldValue('sourceFormat');
    const currentTarget = form.getFieldValue('targetFormat');
    form.setFieldValue('sourceFormat', currentTarget);
    form.setFieldValue('targetFormat', currentSource);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="Format Comparison"
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
              <form.Field name="focalLength">
                {(field) => (
                  <CalculatorNumberField
                    label="Focal length (mm)"
                    value={String(field.state.value)}
                    onChange={(value: string) => {
                      const parsed = parseFloat(value);
                      const finiteValue = Number.isFinite(parsed) ? parsed : 0;
                      field.handleChange(finiteValue);
                    }}
                    onBlur={field.handleBlur}
                    placeholder="50"
                    step={1}
                  />
                )}
              </form.Field>
              <div className="flex gap-1.5 mt-2">
                {FOCAL_LENGTH_PRESETS.map((preset) => (
                  <FocalLengthPresetButton
                    key={preset.value}
                    value={preset.value}
                    label={preset.label}
                    onClick={handlePresetClick}
                  />
                ))}
              </div>
            </div>

            {/* Format selection */}
            <form.Field name="sourceFormat">
              {(field) => (
                <Select
                  label="Source format"
                  selectedValue={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  items={formatOptions}
                  ariaLabel="Source format"
                />
              )}
            </form.Field>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSwapFormats}
                className="p-2 rounded-lg border transition-colors themed-button hover:bg-surface-elevated"
                aria-label="Swap source and target formats"
              >
                <ArrowRightLeft
                  className="w-4 h-4"
                  style={{
                    color: 'var(--color-text-primary)',
                    stroke: 'var(--color-text-primary)',
                  }}
                />
              </button>
            </div>

            <form.Field name="targetFormat">
              {(field) => (
                <Select
                  label="Target format"
                  selectedValue={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  items={formatOptions}
                  ariaLabel="Target format"
                />
              )}
            </form.Field>
          </div>
        </CalculatorCard>

        {/* Column 2: Visualization + Results in single card */}
        <form.Subscribe
          selector={(state) => {
            const focalLength = state.values.focalLength;
            const sourceFormat = SENSOR_FORMAT_MAP[state.values.sourceFormat];
            const targetFormat = SENSOR_FORMAT_MAP[state.values.targetFormat];

            if (!sourceFormat || !targetFormat || focalLength <= 0) {
              return null;
            }

            const cropFactorRatio =
              sourceFormat.cropFactor / targetFormat.cropFactor;
            const equivalentFocalLength = focalLength * cropFactorRatio;
            const fieldOfView =
              2 *
              Math.atan(sourceFormat.diagonal / (2 * focalLength)) *
              (180 / Math.PI);

            return {
              focalLength,
              equivalentFocalLength,
              sourceFormat,
              targetFormat,
              cropFactorRatio,
              fieldOfView,
            };
          }}
        >
          {(calculation) =>
            calculation && (
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

                <div className="rounded-xl p-3 font-mono text-sm border border-secondary bg-background/20 text-primary text-center">
                  {formatFocalLength(calculation.focalLength)}
                  <span className="text-tertiary"> on </span>
                  <span className="font-medium">
                    {calculation.sourceFormat.shortName}
                  </span>
                  <span className="text-tertiary"> = </span>
                  <span className="font-semibold">
                    {formatFocalLength(calculation.equivalentFocalLength)}
                  </span>
                  <span className="text-tertiary"> on </span>
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
            )
          }
        </form.Subscribe>
      </div>

      {/* Info section */}
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
