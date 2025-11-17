import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useMemo, type ChangeEvent } from 'react';
import {
  CalculatorCard,
  CalculatorPageHeader,
  CalculatorStat,
  CalculatorNumberField,
  ResultRow,
} from '@dorkroom/ui';
import {
  EXPOSURE_PRESETS,
  EXPOSURE_STORAGE_KEY,
  type ExposurePreset,
  type ExposureFormState,
  roundStopsToThirds,
  roundToStandardPrecision,
  calculateNewExposureTime,
  formatExposureTime,
  calculatePercentageIncrease,
} from '@dorkroom/logic';
import {
  exposureCalculatorSchema,
  createZodFormValidator,
} from '@dorkroom/ui/forms';
import { useTheme } from '../../contexts/theme-context';
import { themes } from '../../lib/themes';

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
  theme: ReturnType<typeof useTheme>;
}

function StopButton({ preset, onPress, theme }: StopButtonProps) {
  const currentTheme = themes[theme.resolvedTheme];

  return (
    <button
      type="button"
      onClick={() => onPress(preset.stops)}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors border min-w-[50px]"
      style={{
        backgroundColor: currentTheme.surface,
        borderColor: currentTheme.border.primary,
        color: currentTheme.text.primary,
      }}
    >
      {preset.label}
    </button>
  );
}

export default function ExposureCalculatorPage() {
  const theme = useTheme();
  const currentTheme = themes[theme.resolvedTheme];
  const hydrationRef = useRef(false);

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

  // Create a memoized snapshot of persistable state
  const persistableSnapshot = useMemo(
    () => ({
      originalTime: formValues.originalTime,
      stops: formValues.stops,
    }),
    [formValues.originalTime, formValues.stops]
  );

  // Hydrate from persisted state on mount (runs exactly once)
  useEffect(() => {
    if (hydrationRef.current || typeof window === 'undefined') return;
    hydrationRef.current = true;

    try {
      const raw = window.localStorage.getItem(EXPOSURE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<ExposureFormState>;
      Object.entries(parsed).forEach(([key, value]: [string, unknown]) => {
        if (value === undefined) return;
        form.setFieldValue(
          key as keyof ExposureFormState,
          value as ExposureFormState[keyof ExposureFormState]
        );
      });
    } catch (error) {
      console.warn('Failed to load calculator state', error);
    }
  }, [form]);

  // Persist form state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        EXPOSURE_STORAGE_KEY,
        JSON.stringify(persistableSnapshot)
      );
    } catch (error) {
      console.warn('Failed to save calculator state', error);
    }
  }, [persistableSnapshot]);

  const handleAdjustStops = (increment: number) => {
    const currentStops = form.getFieldValue('stops');
    const newStopsValue = roundStopsToThirds(currentStops + increment);
    const truncatedStops = roundToStandardPrecision(newStopsValue);
    form.setFieldValue('stops', truncatedStops);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="F-Stop Mathematics"
        title="Exposure Stop Calculator"
        description="Calculate exposure adjustments by stops for darkroom printing and photography. Perfect for f-stop printing where you need to compensate exposure when changing apertures."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <CalculatorCard
            title="Exposure inputs"
            description="Enter your base exposure time and adjust by stops using the controls below."
          >
            <form.Field name="originalTime">
              {(field) => (
                <CalculatorNumberField
                  label="Original exposure time (seconds)"
                  value={String(field.state.value)}
                  onChange={(value: string) =>
                    field.handleChange(parseFloat(value))
                  }
                  placeholder="10"
                  step={0.1}
                  helperText="Base exposure time you want to adjust"
                />
              )}
            </form.Field>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                Stop adjustment
              </label>

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
                        theme={theme}
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            field.handleChange(parseFloat(e.target.value))
                          }
                          placeholder="1"
                          step={0.1}
                          className="w-20 rounded-lg border px-3 py-2 text-center text-sm"
                          style={{
                            backgroundColor: currentTheme.surface,
                            borderColor: currentTheme.border.primary,
                            color: currentTheme.text.primary,
                          }}
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
                        theme={theme}
                      />
                    )
                  )}
                </div>

                <p className="text-xs text-center text-[color:var(--color-text-tertiary)]">
                  Positive values increase exposure, negative decrease
                </p>
              </div>
            </div>
          </CalculatorCard>

          <form.Subscribe
            selector={(state) => {
              const originalTime = state.values.originalTime;
              const stops = state.values.stops;
              const newTimeValue = calculateNewExposureTime(
                originalTime,
                stops
              );
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
                    helperText={`${Math.abs(
                      calculation.percentageIncrease
                    ).toFixed(1)}% change`}
                  />
                </div>

                <div
                  className="rounded-2xl p-4 font-mono text-sm"
                  style={{
                    borderWidth: 1,
                    borderColor: currentTheme.border.secondary,
                    backgroundColor: `${currentTheme.background}20`,
                    color: currentTheme.text.primary,
                  }}
                >
                  {`${formatExposureTime(calculation.originalTimeValue)} `}
                  <span
                    className="align-super text-xs font-semibold"
                    style={{
                      color: currentTheme.primary,
                    }}
                  >
                    ×2^{calculation.stopsValue}
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
                    value={`×${Math.pow(2, calculation.stopsValue).toFixed(3)}`}
                  />
                </div>
              </CalculatorCard>
            )}
          </form.Subscribe>
        </div>

        <div className="space-y-6">
          <CalculatorCard
            title="How to use this calculator"
            description="A quick guide to adjusting exposures by stops for consistent darkroom printing results."
          >
            <ul className="space-y-3">
              {HOW_TO_USE.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl p-4 border"
                  style={{
                    borderColor: currentTheme.border.secondary,
                    backgroundColor: `${currentTheme.background}08`,
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: currentTheme.text.primary }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </CalculatorCard>

          <CalculatorCard
            title="Understanding exposure stops"
            description="The mathematical relationship between stops and exposure times, and how to apply it in the darkroom."
          >
            <ul className="space-y-3">
              {EXPOSURE_INSIGHTS.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl p-4 border"
                  style={{
                    borderColor: currentTheme.border.secondary,
                    backgroundColor: `${currentTheme.background}15`,
                  }}
                >
                  <p
                    className="text-sm font-semibold uppercase tracking-[0.25em]"
                    style={{ color: currentTheme.text.tertiary }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: currentTheme.text.primary }}
                  >
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </CalculatorCard>
        </div>
      </div>
    </div>
  );
}
