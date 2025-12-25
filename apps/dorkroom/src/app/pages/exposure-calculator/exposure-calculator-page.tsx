import {
  calculateNewExposureTime,
  calculatePercentageIncrease,
  EXPOSURE_PRESETS,
  EXPOSURE_STORAGE_KEY,
  type ExposureFormState,
  type ExposurePreset,
  formatExposureTime,
  roundStopsToThirds,
  roundToStandardPrecision,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import {
  CalculatorCard,
  CalculatorLayout,
  CalculatorNumberField,
  CalculatorStat,
  createZodFormValidator,
  exposureCalculatorSchema,
  InfoCardList,
  ResultRow,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import type { ChangeEvent, FC } from 'react';

const validateExposureForm = createZodFormValidator(exposureCalculatorSchema);

const HOW_TO_USE = [
  {
    title: 'Enter your original exposure time',
    description:
      'Start by entering the base exposure time in seconds that you want to adjust.',
  },
  {
    title: 'Adjust by stops',
    description:
      'Use the preset buttons or enter a custom stop value. Each stop doubles or halves the exposure time.',
  },
  {
    title: 'Apply the new exposure',
    description:
      'Use the calculated exposure time for your adjusted aperture or f-stop printing needs.',
  },
];

const EXPOSURE_INSIGHTS = [
  {
    title: 'Stop system basics',
    description:
      'Each stop represents a doubling or halving of light. This corresponds to common aperture and shutter speed increments.',
  },
  {
    title: 'Darkroom applications',
    description:
      'Essential for f-stop printing where you change aperture between test strips and final prints, requiring exposure compensation.',
  },
  {
    title: 'Mathematical precision',
    description:
      'The relationship is logarithmic: new exposure = original × 2^stops. Fractional stops provide fine control.',
  },
  {
    title: 'Practical workflow',
    description:
      'Make test strips at one aperture, then use this calculator when printing at a different aperture for consistent density.',
  },
];

interface StopButtonProps {
  preset: ExposurePreset;
  onPress: (increment: number) => void;
}

const StopButton: FC<StopButtonProps> = ({ preset, onPress }) => (
  <button
    type="button"
    onClick={() => onPress(preset.stops)}
    className="rounded-lg px-3 py-2 text-sm font-medium transition-colors border min-w-[50px] themed-button"
  >
    {preset.label}
  </button>
);

export default function ExposureCalculatorPage() {
  const form = useForm({
    defaultValues: {
      originalTime: 10,
      stops: 1,
    },
    validators: {
      onChange: validateExposureForm,
    },
  });

  // Subscribe to form values
  const formValues = useStore(
    form.store,
    (state) => state.values as ExposureFormState
  );

  // Persist and hydrate form state to/from localStorage
  useLocalStorageFormPersistence({
    storageKey: EXPOSURE_STORAGE_KEY,
    form,
    formValues,
    persistKeys: ['originalTime', 'stops'],
    validators: {
      originalTime: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v),
      },
      stops: {
        validate: (v) => typeof v === 'number' && Number.isFinite(v),
      },
    },
  });

  const handleAdjustStops = (increment: number) => {
    const currentStops = form.getFieldValue('stops');
    const newStopsValue = roundStopsToThirds(currentStops + increment);
    const truncatedStops = roundToStandardPrecision(newStopsValue);
    form.setFieldValue('stops', truncatedStops);
  };

  return (
    <CalculatorLayout
      eyebrow="F-Stop Mathematics"
      title="Exposure Stop Calculator"
      description="Calculate exposure adjustments by stops for darkroom printing and photography. Perfect for f-stop printing where you need to compensate exposure when changing apertures."
      sidebar={
        <>
          <CalculatorCard
            title="How to use this calculator"
            description="A quick guide to adjusting exposures by stops for consistent darkroom printing results."
          >
            <InfoCardList items={HOW_TO_USE} variant="default" />
          </CalculatorCard>

          <CalculatorCard
            title="Understanding exposure stops"
            description="The mathematical relationship between stops and exposure times, and how to apply it in the darkroom."
          >
            <InfoCardList items={EXPOSURE_INSIGHTS} variant="insight" />
          </CalculatorCard>
        </>
      }
    >
      <CalculatorCard
        title="Exposure inputs"
        description="Enter your base exposure time and adjust by stops using the controls below."
      >
        <form.Field name="originalTime">
          {(field) => (
            <CalculatorNumberField
              label="Original exposure time (seconds)"
              value={String(field.state.value)}
              onChange={(value: string) => {
                const parsed = parseFloat(value);
                const finiteValue = Number.isFinite(parsed) ? parsed : 0;
                field.handleChange(finiteValue);
              }}
              onBlur={field.handleBlur}
              placeholder="10"
              step={0.1}
              helperText="Base exposure time you want to adjust"
            />
          )}
        </form.Field>

        <fieldset className="space-y-3 border-0 p-0 m-0">
          <legend className="text-sm font-medium text-primary">
            Stop adjustment
          </legend>

          <div className="space-y-4">
            {/* All adjustment buttons and input on same line */}
            <div className="flex flex-wrap items-center gap-3 justify-center">
              {/* Negative adjustment buttons */}
              {EXPOSURE_PRESETS.filter((preset) => preset.stops < 0).map(
                (preset) => (
                  <StopButton
                    key={preset.label}
                    preset={preset}
                    onPress={handleAdjustStops}
                  />
                )
              )}

              {/* Custom stop value input */}
              <form.Field name="stops">
                {(field) => (
                  <div className="mx-2">
                    <input
                      type="number"
                      value={field.state.value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const parsed = parseFloat(e.target.value);
                        const finiteValue = Number.isFinite(parsed)
                          ? parsed
                          : 0;
                        field.handleChange(finiteValue);
                      }}
                      onBlur={field.handleBlur}
                      placeholder="1"
                      step={0.1}
                      aria-label="Stops adjustment"
                      className="w-20 rounded-lg border px-3 py-2 text-center text-sm themed-input"
                    />
                  </div>
                )}
              </form.Field>

              {/* Positive adjustment buttons */}
              {EXPOSURE_PRESETS.filter((preset) => preset.stops > 0).map(
                (preset) => (
                  <StopButton
                    key={preset.label}
                    preset={preset}
                    onPress={handleAdjustStops}
                  />
                )
              )}
            </div>

            <p className="text-xs text-center text-tertiary">
              Positive values increase exposure, negative decrease
            </p>
          </div>
        </fieldset>
      </CalculatorCard>

      <form.Subscribe
        selector={(state) => {
          const originalTime = state.values.originalTime;
          const stops = state.values.stops;
          const newTimeValue = calculateNewExposureTime(originalTime, stops);
          const addedTime = newTimeValue - originalTime;
          const percentageIncrease = calculatePercentageIncrease(
            originalTime,
            newTimeValue
          );
          return {
            originalTimeValue: originalTime,
            stopsValue: stops,
            newTimeValue,
            addedTime,
            percentageIncrease,
          };
        }}
      >
        {(calculation) => (
          <CalculatorCard
            title="Exposure results"
            description="Apply this adjusted exposure time to maintain consistent density at your new settings."
            accent="emerald"
            padding="compact"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CalculatorStat
                label="New exposure time"
                value={formatExposureTime(calculation.newTimeValue)}
                helperText={`${calculation.stopsValue > 0 ? '+' : ''}${
                  calculation.stopsValue
                } stops`}
                tone="default"
              />
              <CalculatorStat
                label={`${
                  calculation.addedTime >= 0 ? 'Add' : 'Remove'
                } exposure`}
                value={formatExposureTime(Math.abs(calculation.addedTime))}
                helperText={`${Math.abs(calculation.percentageIncrease).toFixed(
                  1
                )}% change`}
              />
            </div>

            <div className="rounded-2xl p-4 font-mono text-sm border border-secondary bg-background/20 text-primary">
              {`${formatExposureTime(calculation.originalTimeValue)} `}
              <span className="align-super text-xs font-semibold text-[color:var(--color-primary)]">
                ×2^
                {calculation.stopsValue}
              </span>
              <span>{' = '}</span>
              <span className="font-semibold">
                {formatExposureTime(calculation.newTimeValue)}
              </span>
            </div>

            <div className="space-y-2">
              <ResultRow
                label="Original time"
                value={formatExposureTime(calculation.originalTimeValue)}
              />
              <ResultRow
                label="Stop adjustment"
                value={`${calculation.stopsValue > 0 ? '+' : ''}${
                  calculation.stopsValue
                } stops`}
              />
              <ResultRow
                label="Multiplier"
                value={`×${(2 ** calculation.stopsValue).toFixed(3)}`}
              />
            </div>
          </CalculatorCard>
        )}
      </form.Subscribe>
    </CalculatorLayout>
  );
}
