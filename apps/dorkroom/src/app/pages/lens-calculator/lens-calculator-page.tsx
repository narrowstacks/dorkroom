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
  CalculatorLayout,
  CalculatorNumberField,
  CalculatorStat,
  createZodFormValidator,
  InfoCardList,
  lensCalculatorSchema,
  ResultRow,
  Select,
  SensorSizeVisualization,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { ArrowLeftRight } from 'lucide-react';
import type { FC } from 'react';

const validateLensForm = createZodFormValidator(lensCalculatorSchema);

const HOW_TO_USE = [
  {
    title: 'Select your source format',
    description:
      'Choose the sensor or film format where you know the focal length (e.g., Full Frame 50mm lens).',
  },
  {
    title: 'Enter the focal length',
    description:
      'Type the focal length in millimeters for your lens on the source format.',
  },
  {
    title: 'Select your target format',
    description:
      'Choose the format you want to find the equivalent focal length for.',
  },
  {
    title: 'Read the equivalent',
    description:
      'The calculator shows what focal length on the target format gives the same field of view.',
  },
];

const LENS_INSIGHTS = [
  {
    title: 'Crop factor explained',
    description:
      'Smaller sensors capture a narrower field of view, making lenses appear "longer". The crop factor multiplies the apparent focal length.',
  },
  {
    title: 'Field of view matters',
    description:
      'Equivalent focal lengths give the same diagonal field of view, but depth of field and perspective compression differ based on actual focal length.',
  },
  {
    title: 'Medium format advantage',
    description:
      'Larger formats like 6×7 have crop factors less than 1, meaning a 50mm lens shows a wider view than on 35mm.',
  },
  {
    title: 'Planning lens purchases',
    description:
      'Use this calculator when switching systems or shooting multiple formats to know which lenses give similar results.',
  },
];

interface FormatOption {
  value: string;
  label: string;
  group?: string;
}

const formatOptions: FormatOption[] = SENSOR_FORMATS.map((format) => ({
  value: format.id,
  label: `${format.name} (${format.width}×${format.height}mm)`,
  group:
    format.category === 'digital'
      ? 'Digital'
      : format.category === 'film-35mm'
        ? '35mm Film'
        : 'Medium Format Film',
}));

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
    className="rounded-lg px-3 py-2 text-sm font-medium transition-colors border min-w-[50px] themed-button"
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
    <CalculatorLayout
      eyebrow="Format Comparison"
      title="Lens Equivalency Calculator"
      description="Calculate equivalent focal lengths between different sensor and film formats. Find out what lens gives you the same field of view when switching between cameras or formats."
      sidebar={
        <form.Subscribe
          selector={(state) => {
            const focalLength = state.values.focalLength;
            const sourceFormat = SENSOR_FORMAT_MAP[state.values.sourceFormat];
            const targetFormat = SENSOR_FORMAT_MAP[state.values.targetFormat];

            if (!sourceFormat || !targetFormat || focalLength <= 0) {
              return null;
            }

            const cropFactorRatio =
              targetFormat.cropFactor / sourceFormat.cropFactor;
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
              <>
                <CalculatorCard
                  title="Equivalent focal length"
                  description="The focal length on the target format that gives the same field of view."
                  accent="emerald"
                  padding="compact"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CalculatorStat
                      label="Equivalent focal length"
                      value={formatFocalLength(
                        calculation.equivalentFocalLength
                      )}
                      helperText={`On ${calculation.targetFormat.shortName}`}
                      tone="default"
                    />
                    <CalculatorStat
                      label="Field of view"
                      value={`${calculation.fieldOfView.toFixed(1)}°`}
                      helperText="Diagonal angle"
                    />
                  </div>

                  <div className="rounded-2xl p-4 font-mono text-sm border border-secondary bg-background/20 text-primary">
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

                  <div className="space-y-2">
                    <ResultRow
                      label="Source focal length"
                      value={formatFocalLength(calculation.focalLength)}
                    />
                    <ResultRow
                      label="Source crop factor"
                      value={`${calculation.sourceFormat.cropFactor.toFixed(2)}×`}
                    />
                    <ResultRow
                      label="Target crop factor"
                      value={`${calculation.targetFormat.cropFactor.toFixed(2)}×`}
                    />
                    <ResultRow
                      label="Conversion ratio"
                      value={`${calculation.cropFactorRatio.toFixed(3)}×`}
                    />
                  </div>
                </CalculatorCard>

                <CalculatorCard
                  title="Size comparison"
                  description="Visual comparison of the two sensor/film formats."
                >
                  <SensorSizeVisualization
                    sourceFormat={calculation.sourceFormat}
                    targetFormat={calculation.targetFormat}
                  />
                </CalculatorCard>
              </>
            )
          }
        </form.Subscribe>
      }
      footer={
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <CalculatorCard
            title="How to use this calculator"
            description="A quick guide to finding equivalent focal lengths across different sensor sizes."
          >
            <InfoCardList items={HOW_TO_USE} variant="default" />
          </CalculatorCard>

          <CalculatorCard
            title="Understanding lens equivalency"
            description="What crop factors mean and how they affect your photography."
          >
            <InfoCardList items={LENS_INSIGHTS} variant="insight" />
          </CalculatorCard>
        </div>
      }
    >
      <CalculatorCard
        title="Format selection"
        description="Choose your source and target sensor or film formats."
      >
        <div className="space-y-4">
          <form.Field name="sourceFormat">
            {(field) => (
              <Select
                label="Source format (your lens)"
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
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>

          <form.Field name="targetFormat">
            {(field) => (
              <Select
                label="Target format (equivalent on)"
                selectedValue={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
                items={formatOptions}
                ariaLabel="Target format"
              />
            )}
          </form.Field>
        </div>
      </CalculatorCard>

      <CalculatorCard
        title="Focal length"
        description="Enter the focal length of your lens on the source format."
      >
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
              helperText="Lens focal length in millimeters"
            />
          )}
        </form.Field>

        <fieldset className="space-y-3 border-0 p-0 m-0">
          <legend className="text-sm font-medium text-primary">
            Common focal lengths
          </legend>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {FOCAL_LENGTH_PRESETS.map((preset) => (
              <FocalLengthPresetButton
                key={preset.value}
                value={preset.value}
                label={preset.label}
                onClick={handlePresetClick}
              />
            ))}
          </div>
        </fieldset>
      </CalculatorCard>
    </CalculatorLayout>
  );
}
