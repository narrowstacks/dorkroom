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
  ResultRow,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import type { ChangeEvent, FC } from 'react';

const validateExposureForm = createZodFormValidator(exposureCalculatorSchema);

const HOW_TO_USE = [
  'Enter your base exposure time in seconds',
  'Use the preset buttons or type a custom stop value',
  'Apply the new exposure time when printing at a different aperture',
];

const TIPS = [
  'Each stop doubles or halves the light, matching standard aperture and shutter speed increments.',
  'Useful for f-stop printing: make test strips at one aperture, then compensate exposure when you switch to another.',
  'The math is logarithmic: new exposure = original × 2^stops. Fractional stops give you finer control.',
  'For consistent print density, recalculate exposure any time you change aperture between test strip and final print.',
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
      title="Exposure Stop Calculator"
      description={
        <>
          Adjust exposure times by stops for darkroom printing.
          <br />
          Recalculate your exposure when switching apertures between test strips
          and final prints.
        </>
      }
      sidebar={
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
              Each stop doubles or halves the amount of light hitting your
              paper. When you change aperture between a test strip and your
              final print, use this to figure out the new exposure time.
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
      }
      results={
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
              description={`Adjusted exposure time for ${calculation.stopsValue >= 0 ? 'increased' : 'decreased'} amount of stops`}
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
                  tone="emerald"
                />
                <CalculatorStat
                  label={`${
                    calculation.addedTime >= 0 ? 'Add' : 'Remove'
                  } exposure`}
                  value={formatExposureTime(Math.abs(calculation.addedTime))}
                  helperText={`${Math.abs(
                    calculation.percentageIncrease
                  ).toFixed(1)}% change`}
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
      }
    >
      <CalculatorCard
        title="Exposure inputs"
        description="Set your base time and dial in the stop adjustment."
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
    </CalculatorLayout>
  );
}
