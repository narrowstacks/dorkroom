import {
  formatReciprocityTime,
  parseReciprocityTime,
  RECIPROCITY_EXPOSURE_PRESETS,
  RECIPROCITY_FILM_TYPES,
  RECIPROCITY_STORAGE_KEY,
  type ReciprocityFormState,
  type SelectItem,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import {
  CalculatorCard,
  CalculatorLayout,
  CalculatorNumberField,
  CalculatorStat,
  createZodFormValidator,
  InfoCardList,
  ReciprocityChart,
  ResultRow,
  reciprocityCalculatorSchema,
  Select,
  TextInput,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { ChartLine, Maximize2, Minimize2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const validateReciprocityForm = createZodFormValidator(
  reciprocityCalculatorSchema
);

const HOW_TO_USE = [
  {
    title: 'Select your film type',
    description:
      'Pick from the built-in reciprocity profiles or switch to Custom to enter your own factor.',
  },
  {
    title: 'Enter the metered exposure',
    description:
      'Type the reading from your light meter. We accept times like 30s, 1m30s, or 2h.',
  },
  {
    title: 'Dial in the adjusted time',
    description:
      'Use the corrected exposure in the field. Larger increases mean you need more light during long exposures.',
  },
];

const RECIPROCITY_INSIGHTS = [
  {
    title: 'The reciprocity law',
    description:
      'Doubling the exposure time while halving the light should yield the same exposure — until extremely long or short exposures break the rule.',
  },
  {
    title: 'Why it fails',
    description:
      'Silver halide crystals respond less efficiently when photons arrive slowly. Long exposures need a boost to compensate for this drop-off.',
  },
  {
    title: 'Film specific behaviour',
    description:
      'Each emulsion curves differently. Slow films like Pan F stay linear longer, while high-speed stocks such as Delta 3200 drift sooner.',
  },
  {
    title: 'When it matters',
    description:
      'Night landscapes, astro work, interiors, and any exposure stretching past a second should consider reciprocity compensation.',
  },
];

// Helper function to select and calculate reciprocity results
function selectReciprocityCalculation(
  values: ReciprocityFormState,
  filmTypes: typeof RECIPROCITY_FILM_TYPES
): {
  originalTime: number;
  adjustedTime: number;
  factor: number;
  percentageIncrease: number;
  filmName: string;
} | null {
  const filmType = values.filmType;
  const meteredTime = values.meteredTime;
  const customFactor = values.customFactor;

  const parsedSeconds = parseReciprocityTime(meteredTime);
  if (parsedSeconds === null || parsedSeconds <= 0) return null;

  const selectedFilm = filmTypes.find((f: SelectItem) => f.value === filmType);
  const factor =
    filmType === 'custom'
      ? Number.isFinite(customFactor)
        ? customFactor
        : 1.3
      : (selectedFilm?.factor ?? 1.3);

  const adjustedTime = parsedSeconds ** factor;
  const percentageIncrease =
    ((adjustedTime - parsedSeconds) / parsedSeconds) * 100;

  return {
    originalTime: parsedSeconds,
    adjustedTime,
    factor,
    percentageIncrease,
    filmName:
      filmType === 'custom'
        ? 'Custom profile'
        : (selectedFilm?.label ?? 'Unknown'),
  };
}

/**
 * Render the Reciprocity Failure Calculator page with inputs, results, and an interactive reciprocity curve.
 *
 * The component provides controls to select or define a film profile, enter a metered exposure time (including presets),
 * and view calculated adjusted exposure and added exposure. It also includes controls to show an inline reciprocity curve
 * and expand it to a full-width view.
 *
 * @returns The JSX element representing the reciprocity calculator UI.
 */
export default function ReciprocityCalculatorPage() {
  // Use formatReciprocityTime directly for formatting calculations
  const formatTime = formatReciprocityTime;
  const filmTypes = RECIPROCITY_FILM_TYPES;

  const [showChart, setShowChart] = useState(false);
  const [isWideChart, setIsWideChart] = useState(false);

  // TanStack Form for input state
  const form = useForm({
    defaultValues: {
      filmType: 'tri-x',
      meteredTime: '30s',
      customFactor: 1.3,
    } as ReciprocityFormState,
    validators: {
      onChange: validateReciprocityForm,
    },
  });

  // Subscribe to form values
  const formValues = useStore(
    form.store,
    (state) => state.values as ReciprocityFormState
  );

  // Persist and hydrate form state to/from localStorage
  useLocalStorageFormPersistence({
    storageKey: RECIPROCITY_STORAGE_KEY,
    form,
    formValues,
    persistKeys: ['filmType', 'meteredTime', 'customFactor'],
  });

  // Calculate derived values from form state
  const { parsedDisplay } = (() => {
    const meteredTime = form.getFieldValue('meteredTime');
    const parsedSeconds = parseReciprocityTime(meteredTime);
    const formattedTime =
      parsedSeconds !== null ? formatReciprocityTime(parsedSeconds) : null;
    const parsedDisplay =
      formattedTime && formattedTime !== meteredTime
        ? `Parsed as: ${formattedTime}`
        : null;

    return {
      parsedDisplay,
    };
  })();

  const filmOptions = useMemo<SelectItem[]>(
    () => filmTypes.map(({ label, value }: SelectItem) => ({ label, value })),
    [filmTypes]
  );

  const exposurePresets = RECIPROCITY_EXPOSURE_PRESETS;

  // Build the wide chart footer section
  const wideChartFooter = showChart && isWideChart && (
    <form.Subscribe
      selector={(state) =>
        selectReciprocityCalculation(state.values, filmTypes)
      }
    >
      {(calculation) =>
        calculation ? (
          <div className="mt-8">
            <CalculatorCard
              title={`Reciprocity curve for ${calculation.filmName}`}
              description="Hover over the curve to explore reciprocity calculations for different exposure times."
              accent="emerald"
              padding="normal"
              actions={
                <button
                  type="button"
                  onClick={() => setIsWideChart(false)}
                  className="rounded-full p-2 transition-colors hover:bg-white/10"
                  aria-label="Collapse chart"
                  title="Collapse chart to inline view"
                >
                  <Minimize2
                    className="h-5 w-5"
                    style={{
                      color: 'var(--color-primary)',
                    }}
                  />
                </button>
              }
            >
              <ReciprocityChart
                originalTime={calculation.originalTime}
                adjustedTime={calculation.adjustedTime}
                factor={calculation.factor}
                filmName={calculation.filmName}
              />
            </CalculatorCard>
          </div>
        ) : null
      }
    </form.Subscribe>
  );

  return (
    <CalculatorLayout
      eyebrow="Long Exposure Math"
      title="Reciprocity Failure Calculator"
      description="Compensate for long exposure reciprocity the moment your meter starts to drift. Choose a film stock, enter the metered time, and the calculator does the rest."
      sidebar={
        <>
          <CalculatorCard
            title="How to use this calculator"
            description="A quick tour of the steps so you can confirm you are feeding the right inputs before heading into the dark."
          >
            <InfoCardList items={HOW_TO_USE} variant="default" />
          </CalculatorCard>

          <CalculatorCard
            title="Understanding reciprocity failure"
            description="Why your long exposure needs extra light and how the film responds once the reciprocity law breaks down."
          >
            <InfoCardList items={RECIPROCITY_INSIGHTS} variant="insight" />
          </CalculatorCard>
        </>
      }
      footer={wideChartFooter || undefined}
    >
      <CalculatorCard
        title="Reciprocity inputs"
        description="Select an emulsion, confirm or tweak its reciprocity factor, and log the reading from your meter."
      >
        <form.Field name="filmType">
          {(field) => (
            <Select
              label="Film stock"
              selectedValue={field.state.value}
              onValueChange={(value: string) => field.handleChange(value)}
              items={filmOptions}
            />
          )}
        </form.Field>

        {form.getFieldValue('filmType') === 'custom' && (
          <form.Field name="customFactor">
            {(field) => (
              <CalculatorNumberField
                label="Reciprocity factor"
                value={String(field.state.value)}
                onChange={(value: string) => {
                  const next = Number.parseFloat(value);
                  if (Number.isNaN(next)) return;
                  field.handleChange(next);
                }}
                placeholder="1.3"
                step={0.1}
                helperText="Higher factors demand more compensation at longer exposures."
              />
            )}
          </form.Field>
        )}

        <form.Field name="meteredTime">
          {(field) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[color:var(--color-text-primary)]">
                <span className="font-medium">Metered exposure time</span>
              </div>
              <TextInput
                value={field.state.value}
                onValueChange={(value: string) => field.handleChange(value)}
                placeholder="Try 30s, 1m30s, or 2h"
              />
              <div className="flex flex-wrap gap-2">
                {exposurePresets.map((seconds: number) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => field.handleChange(`${seconds}s`)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition"
                    style={{
                      color: 'var(--color-text-secondary)',
                      borderColor: 'var(--color-border-secondary)',
                      borderWidth: 1,
                    }}
                  >
                    {formatReciprocityTime(seconds)}
                  </button>
                ))}
              </div>
              {field.state.meta.errors.length > 0 && (
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
              {field.state.meta.errors.length === 0 && parsedDisplay && (
                <p className="text-xs italic text-[color:var(--color-text-tertiary)]">
                  {parsedDisplay}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </CalculatorCard>

      <form.Subscribe
        selector={(state) =>
          selectReciprocityCalculation(state.values, filmTypes)
        }
      >
        {(calculation) =>
          calculation ? (
            <CalculatorCard
              title="Reciprocity results"
              description="Apply this corrected exposure to balance reciprocity failure on your next frame."
              accent="emerald"
              padding="compact"
              actions={
                <button
                  type="button"
                  onClick={() => setShowChart((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-white/10"
                  aria-label={showChart ? 'Hide chart' : 'Show chart'}
                  title={showChart ? 'Hide chart' : 'Show chart'}
                >
                  <ChartLine
                    className="h-5 w-5"
                    style={{
                      color: showChart
                        ? 'var(--color-primary)'
                        : 'var(--color-text-secondary)',
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: showChart
                        ? 'var(--color-primary)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    {showChart ? 'Hide chart' : 'View chart'}
                  </span>
                </button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <CalculatorStat
                  label="Adjusted exposure"
                  value={formatTime(calculation.adjustedTime)}
                  helperText={`Recommended for ${calculation.filmName}`}
                  tone="emerald"
                />
                <CalculatorStat
                  label="Added exposure"
                  value={formatTime(
                    Math.max(
                      calculation.adjustedTime - calculation.originalTime,
                      0
                    )
                  )}
                  helperText={`${Math.round(
                    calculation.percentageIncrease
                  )}% more time needed`}
                />
              </div>

              <div
                className="rounded-2xl p-4 font-mono text-sm"
                style={{
                  borderWidth: 1,
                  borderColor: 'var(--color-border-secondary)',
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.18)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {`${formatReciprocityTime(calculation.originalTime)} `}
                <span
                  className="align-super text-xs font-semibold"
                  style={{
                    color: 'var(--color-primary)',
                  }}
                >
                  {calculation.factor.toFixed(2)}
                </span>
                <span>{' = '}</span>
                <span className="font-semibold text-[color:var(--color-text-primary)]">
                  {formatTime(calculation.adjustedTime)}
                </span>
              </div>

              <div className="space-y-2">
                <ResultRow
                  label="Film selection"
                  value={calculation.filmName || 'Custom profile'}
                />
                <ResultRow
                  label="Original time"
                  value={formatReciprocityTime(calculation.originalTime)}
                />
                <ResultRow
                  label="Adjustment factor"
                  value={calculation.factor.toFixed(2)}
                />
              </div>

              {showChart && !isWideChart && (
                <div className="mt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[color:var(--color-text-primary)]">
                      {`Reciprocity curve for ${calculation.filmName}`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsWideChart(true)}
                      className="rounded-full p-2 transition-colors hover:bg-white/10"
                      aria-label="Expand chart"
                      title="Expand chart to full width"
                    >
                      <Maximize2
                        className="h-4 w-4"
                        style={{
                          color: 'var(--color-text-secondary)',
                        }}
                      />
                    </button>
                  </div>
                  <ReciprocityChart
                    originalTime={calculation.originalTime}
                    adjustedTime={calculation.adjustedTime}
                    factor={calculation.factor}
                    filmName={calculation.filmName}
                  />
                </div>
              )}
            </CalculatorCard>
          ) : null
        }
      </form.Subscribe>
    </CalculatorLayout>
  );
}
