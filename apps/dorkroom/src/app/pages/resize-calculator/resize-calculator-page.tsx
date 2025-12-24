import {
  DEFAULT_NEW_HEIGHT,
  DEFAULT_NEW_LENGTH,
  DEFAULT_NEW_WIDTH,
  DEFAULT_ORIGINAL_HEIGHT,
  DEFAULT_ORIGINAL_LENGTH,
  DEFAULT_ORIGINAL_TIME,
  DEFAULT_ORIGINAL_WIDTH,
  RESIZE_STORAGE_KEY,
  type ResizeCalculatorState,
  useLocalStorageFormPersistence,
} from '@dorkroom/logic';
import {
  CalculatorCard,
  CalculatorNumberField,
  CalculatorPageHeader,
  CalculatorStat,
  colorMixOr,
  createZodFormValidator,
  resizeCalculatorSchema,
  ToggleSwitch,
  useMeasurement,
  useMeasurementConverter,
  StatusAlert,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';

const validateResizeForm = createZodFormValidator(resizeCalculatorSchema);

interface ModeToggleProps {
  isEnlargerHeightMode: boolean;
  onModeChange: (value: boolean) => void;
}

function ModeToggle({ isEnlargerHeightMode, onModeChange }: ModeToggleProps) {
  return (
    <div
      className="rounded-2xl border p-5 shadow-subtle backdrop-blur"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: colorMixOr(
          'var(--color-surface)',
          80,
          'transparent',
          'var(--color-border-muted)'
        ),
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p
            className="text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Calculation Method
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Switch between sizing by print dimensions or by enlarger height.
          </p>
        </div>
        <div
          className="flex items-center gap-3 rounded-full px-4 py-2"
          style={{
            borderColor: 'var(--color-border-muted)',
            backgroundColor: colorMixOr(
              'var(--color-surface)',
              20,
              'transparent',
              'var(--color-surface)'
            ),
            border: '1px solid',
          }}
        >
          <span
            className="text-xs font-medium uppercase tracking-[0.3em]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Print Size
          </span>
          <ToggleSwitch
            label=""
            value={isEnlargerHeightMode}
            onValueChange={onModeChange}
          />
          <span
            className="text-xs font-medium uppercase tracking-[0.3em]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Enlarger Height
          </span>
        </div>
      </div>
    </div>
  );
}

const HOW_TO_USE_PRINT = [
  'Choose your calculation method: Print Size or Enlarger Height.',
  'Print size is faster but less precise than measuring heights.',
  'Enter the width and height of your original print.',
  'Enter the width and height of your desired new print size.',
  'Enter the original exposure time in seconds.',
  'The new exposure time appears instantly as you type.',
];

const HOW_TO_USE_ENLARGER = [
  'Choose your calculation method: Print Size or Enlarger Height.',
  'Print size is faster but enlarger height mode is the most accurate.',
  'Measure the original and new enlarger heights (lens to paper).',
  'Enter the original exposure time in seconds.',
  'The new exposure time appears instantly as you type.',
];

const TIPS = [
  'Treat results as a best-guess starting point and always confirm in the darkroom.',
  'Positive stops mean more exposure is needed (larger print).',
  'Negative stops mean less exposure is needed (smaller print).',
  'Always run a quick test strip when changing print sizes.',
  'Enlarger height mode is the most accurate when your column is calibrated.',
];

interface InfoSectionProps {
  isEnlargerHeightMode: boolean;
}

function InfoSection({ isEnlargerHeightMode }: InfoSectionProps) {
  return (
    <CalculatorCard
      title="How this calculator works"
      description="Get a quick refresher on what the inputs mean and how the math comes together."
      padding="normal"
      className="bg-surface-muted/80"
    >
      <div
        className="space-y-5 text-sm"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <p>
          The resize calculator helps you predict new exposure times when you
          scale an existing darkroom print. It relies on the inverse-square law
          to figure out how light spreads across the paper at different sizes.
        </p>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold uppercase tracking-[0.25em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            How to use
          </h4>
          <ul className="space-y-2">
            {(isEnlargerHeightMode
              ? HOW_TO_USE_ENLARGER
              : HOW_TO_USE_PRINT
            ).map((item, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: Static content array, order never changes
                key={index}
                className="rounded-2xl border px-4 py-2"
                style={{
                  borderColor: 'var(--color-border-muted)',
                  backgroundColor: colorMixOr(
                    'var(--color-surface)',
                    20,
                    'transparent',
                    'var(--color-surface)'
                  ),
                  color: 'var(--color-text-secondary)',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold uppercase tracking-[0.25em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Formula
          </h4>
          <div
            className="rounded-2xl border p-4 font-mono text-xs"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: colorMixOr(
                'var(--color-surface)',
                80,
                'transparent',
                'var(--color-border-muted)'
              ),
              color: 'var(--color-text-primary)',
            }}
          >
            {isEnlargerHeightMode
              ? 'New Time = Original Time × (New Height)² ÷ (Original Height)²'
              : 'New Time = Original Time × (New Area ÷ Original Area)'}
          </div>
        </div>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold uppercase tracking-[0.25em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Tips
          </h4>
          <ul className="space-y-2">
            {TIPS.map((tip, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: Static content array, order never changes
                key={index}
                className="rounded-2xl border px-4 py-2"
                style={{
                  borderColor: 'var(--color-border-muted)',
                  backgroundColor: colorMixOr(
                    'var(--color-surface)',
                    20,
                    'transparent',
                    'var(--color-surface)'
                  ),
                  color: 'var(--color-text-secondary)',
                }}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CalculatorCard>
  );
}

// Helper function to calculate aspect ratio match
function calculateAspectRatioMatch(
  isEnlargerMode: boolean,
  origWidth: number,
  origLength: number,
  newW: number,
  newL: number
): boolean {
  if (isEnlargerMode) return true;
  if (origWidth <= 0 || origLength <= 0 || newW <= 0 || newL <= 0) return true;
  const originalRatio = (origWidth / origLength).toFixed(3);
  const newRatio = (newW / newL).toFixed(3);
  return originalRatio === newRatio;
}

// Helper function to calculate exposure changes
function calculateExposureChanges(
  isEnlargerMode: boolean,
  origTime: number,
  origWidth: number,
  origLength: number,
  newW: number,
  newL: number,
  origHeight: number,
  newH: number
): { newTime: string; stopsDifference: string } {
  let calculatedNewTime = '';
  let calculatedStopsDifference = '';

  if (isEnlargerMode) {
    if (origHeight > 0 && newH > 0 && origTime > 0) {
      const ratio = newH ** 2 / origHeight ** 2;
      const newTimeValue = origTime * ratio;
      const stops = Math.log2(ratio);

      calculatedNewTime = newTimeValue.toFixed(1);
      calculatedStopsDifference = stops.toFixed(2);
    }
  } else {
    if (
      origWidth > 0 &&
      origLength > 0 &&
      newW > 0 &&
      newL > 0 &&
      origTime > 0
    ) {
      const originalArea = origWidth * origLength;
      const newArea = newW * newL;

      if (originalArea > 0) {
        const ratio = newArea / originalArea;
        const newTimeValue = origTime * ratio;
        const stops = Math.log2(ratio);

        calculatedNewTime = newTimeValue.toFixed(1);
        calculatedStopsDifference = stops.toFixed(2);
      }
    }
  }

  return {
    newTime: calculatedNewTime,
    stopsDifference: calculatedStopsDifference,
  };
}

export default function ResizeCalculatorPage() {
  const { unit } = useMeasurement();
  const unitLabel = unit === 'imperial' ? 'in' : 'cm';
  const { toInches, toDisplay } = useMeasurementConverter();

  const form = useForm({
    defaultValues: {
      isEnlargerHeightMode: false,
      originalWidth: Number(DEFAULT_ORIGINAL_WIDTH),
      originalLength: Number(DEFAULT_ORIGINAL_LENGTH),
      newWidth: Number(DEFAULT_NEW_WIDTH),
      newLength: Number(DEFAULT_NEW_LENGTH),
      originalTime: Number(DEFAULT_ORIGINAL_TIME),
      originalHeight: Number(DEFAULT_ORIGINAL_HEIGHT),
      newHeight: Number(DEFAULT_NEW_HEIGHT),
    },
    validators: {
      onChange: validateResizeForm,
    },
  });

  // Subscribe to form values
  const formValues = useStore(
    form.store,
    (state) => state.values as ResizeCalculatorState
  );

  // Persist and hydrate form state to/from localStorage
  useLocalStorageFormPersistence({
    storageKey: RESIZE_STORAGE_KEY,
    form,
    formValues,
    persistKeys: [
      'isEnlargerHeightMode',
      'originalWidth',
      'originalLength',
      'newWidth',
      'newLength',
      'originalTime',
      'originalHeight',
      'newHeight',
    ],
  });

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="Exposure Math"
        title="Print Resize Calculator"
        description="Scale a print up or down and get a solid starting exposure without burning through paper."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <CalculatorCard
            title="Resize inputs"
            description="Provide either print dimensions or enlarger heights so we can work out the exposure change."
          >
            <form.Field name="isEnlargerHeightMode">
              {(field) => (
                <ModeToggle
                  isEnlargerHeightMode={field.state.value}
                  onModeChange={(value: boolean) => field.handleChange(value)}
                />
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => state.values.isEnlargerHeightMode as boolean}
            >
              {(isEnlargerHeightMode) =>
                !isEnlargerHeightMode ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3
                        className="text-sm font-semibold uppercase tracking-[0.25em]"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        Original print
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <form.Field name="originalWidth">
                          {(field) => (
                            <CalculatorNumberField
                              label="Width"
                              value={String(toDisplay(field.state.value))}
                              onChange={(value: string) => {
                                const parsed = parseFloat(value);
                                if (Number.isFinite(parsed) && parsed >= 0) {
                                  field.handleChange(
                                    parseFloat(toInches(parsed).toFixed(3))
                                  );
                                }
                              }}
                              onBlur={field.handleBlur}
                              placeholder={String(
                                toDisplay(Number(DEFAULT_ORIGINAL_WIDTH))
                              )}
                              step={0.1}
                              unit={unitLabel}
                            />
                          )}
                        </form.Field>
                        <form.Field name="originalLength">
                          {(field) => (
                            <CalculatorNumberField
                              label="Height"
                              value={String(toDisplay(field.state.value))}
                              onChange={(value) => {
                                const parsed = parseFloat(value);
                                if (Number.isFinite(parsed) && parsed >= 0) {
                                  field.handleChange(
                                    parseFloat(toInches(parsed).toFixed(3))
                                  );
                                }
                              }}
                              onBlur={field.handleBlur}
                              placeholder={String(
                                toDisplay(Number(DEFAULT_ORIGINAL_LENGTH))
                              )}
                              step={0.1}
                              unit={unitLabel}
                            />
                          )}
                        </form.Field>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3
                        className="text-sm font-semibold uppercase tracking-[0.25em]"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        Target print
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <form.Field name="newWidth">
                          {(field) => (
                            <CalculatorNumberField
                              label="Width"
                              value={String(toDisplay(field.state.value))}
                              onChange={(value) => {
                                const parsed = parseFloat(value);
                                if (Number.isFinite(parsed) && parsed >= 0) {
                                  field.handleChange(
                                    parseFloat(toInches(parsed).toFixed(3))
                                  );
                                }
                              }}
                              onBlur={field.handleBlur}
                              placeholder={String(
                                toDisplay(Number(DEFAULT_NEW_WIDTH))
                              )}
                              step={0.1}
                              unit={unitLabel}
                            />
                          )}
                        </form.Field>
                        <form.Field name="newLength">
                          {(field) => (
                            <CalculatorNumberField
                              label="Height"
                              value={String(toDisplay(field.state.value))}
                              onChange={(value) => {
                                const parsed = parseFloat(value);
                                if (Number.isFinite(parsed) && parsed >= 0) {
                                  field.handleChange(
                                    parseFloat(toInches(parsed).toFixed(3))
                                  );
                                }
                              }}
                              onBlur={field.handleBlur}
                              placeholder={String(
                                toDisplay(Number(DEFAULT_NEW_LENGTH))
                              )}
                              step={0.1}
                              unit={unitLabel}
                            />
                          )}
                        </form.Field>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3
                      className="text-sm font-semibold uppercase tracking-[0.25em]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Enlarger heights
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field name="originalHeight">
                        {(field) => (
                          <CalculatorNumberField
                            label="Original height"
                            value={String(toDisplay(field.state.value))}
                            onChange={(value) => {
                              const parsed = parseFloat(value);
                              if (Number.isFinite(parsed) && parsed >= 0) {
                                field.handleChange(
                                  parseFloat(toInches(parsed).toFixed(3))
                                );
                              }
                            }}
                            onBlur={field.handleBlur}
                            placeholder={String(
                              toDisplay(Number(DEFAULT_ORIGINAL_HEIGHT))
                            )}
                            step={1}
                            unit={unitLabel}
                          />
                        )}
                      </form.Field>
                      <form.Field name="newHeight">
                        {(field) => (
                          <CalculatorNumberField
                            label="New height"
                            value={String(toDisplay(field.state.value))}
                            onChange={(value) => {
                              const parsed = parseFloat(value);
                              if (Number.isFinite(parsed) && parsed >= 0) {
                                field.handleChange(
                                  parseFloat(toInches(parsed).toFixed(3))
                                );
                              }
                            }}
                            onBlur={field.handleBlur}
                            placeholder={String(
                              toDisplay(Number(DEFAULT_NEW_HEIGHT))
                            )}
                            step={1}
                            unit={unitLabel}
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                )
              }
            </form.Subscribe>

            <form.Subscribe
              selector={(state) => {
                const isEnlargerMode = state.values
                  .isEnlargerHeightMode as boolean;
                const origWidth = state.values.originalWidth as number;
                const origLength = state.values.originalLength as number;
                const newW = state.values.newWidth as number;
                const newL = state.values.newLength as number;

                const isMatched = calculateAspectRatioMatch(
                  isEnlargerMode,
                  origWidth,
                  origLength,
                  newW,
                  newL
                );
                return {
                  isEnlargerMode,
                  isMatched,
                };
              }}
            >
              {({ isEnlargerMode, isMatched }) =>
                !isEnlargerMode && !isMatched ? (
                  <StatusAlert
                    message="The aspect ratios of the original and target prints do not match. Try to match the aspect ratio of the original print to the target print as close as possible."
                    action="warning"
                  />
                ) : null
              }
            </form.Subscribe>

            <div className="space-y-3">
              <h3
                className="text-sm font-semibold uppercase tracking-[0.25em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Original exposure
              </h3>
              <form.Field name="originalTime">
                {(field) => (
                  <CalculatorNumberField
                    label="Time"
                    value={String(field.state.value)}
                    onChange={(value) => {
                      const parsed = parseFloat(value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        field.handleChange(parsed);
                      }
                    }}
                    onBlur={field.handleBlur}
                    placeholder={DEFAULT_ORIGINAL_TIME}
                    step={0.5}
                    unit="seconds"
                    helperText="This is the exposure that worked for your original print."
                  />
                )}
              </form.Field>
            </div>
          </CalculatorCard>

          <form.Subscribe
            selector={(state) => {
              const isEnlargerMode = state.values
                .isEnlargerHeightMode as boolean;
              const origTime = state.values.originalTime as number;
              const origWidth = state.values.originalWidth as number;
              const origLength = state.values.originalLength as number;
              const newW = state.values.newWidth as number;
              const newL = state.values.newLength as number;
              const origHeight = state.values.originalHeight as number;
              const newH = state.values.newHeight as number;

              const { newTime, stopsDifference } = calculateExposureChanges(
                isEnlargerMode,
                origTime,
                origWidth,
                origLength,
                newW,
                newL,
                origHeight,
                newH
              );

              const stopsNumber = parseFloat(stopsDifference);
              const stopsHelper = Number.isFinite(stopsNumber)
                ? stopsNumber > 0
                  ? 'The new print is larger, add exposure.'
                  : stopsNumber < 0
                    ? 'The new print is smaller, remove exposure.'
                    : 'Same size print — keep your original exposure.'
                : undefined;

              return { newTime, stopsDifference, stopsHelper };
            }}
          >
            {({ newTime, stopsDifference, stopsHelper }) =>
              newTime ? (
                <CalculatorCard
                  title="Exposure result"
                  description="Dial these in on your timer and make a quick test strip to confirm."
                  accent="emerald"
                  padding="compact"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CalculatorStat
                      label="New time"
                      value={`${newTime} seconds`}
                      tone="default"
                      helperText="Based on your original exposure and target size."
                    />
                    <CalculatorStat
                      label="Stops difference"
                      value={`${stopsDifference || '0.00'} stops`}
                      tone="default"
                      helperText={stopsHelper}
                    />
                  </div>
                </CalculatorCard>
              ) : null
            }
          </form.Subscribe>
        </div>

        <div className="space-y-6">
          <InfoSection isEnlargerHeightMode={formValues.isEnlargerHeightMode} />
        </div>
      </div>
    </div>
  );
}
