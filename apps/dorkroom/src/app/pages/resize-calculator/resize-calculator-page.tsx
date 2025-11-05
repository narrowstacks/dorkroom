import { useState, useEffect } from 'react';
import {
  ToggleSwitch,
  WarningAlert,
  CalculatorCard,
  CalculatorNumberField,
  CalculatorPageHeader,
  CalculatorStat,
  colorMixOr,
  useMeasurement,
  useMeasurementConverter,
} from '@dorkroom/ui';
import {
  useResizeCalculator,
  DEFAULT_ORIGINAL_WIDTH,
  DEFAULT_ORIGINAL_LENGTH,
  DEFAULT_NEW_WIDTH,
  DEFAULT_NEW_LENGTH,
  DEFAULT_ORIGINAL_TIME,
  DEFAULT_ORIGINAL_HEIGHT,
  DEFAULT_NEW_HEIGHT,
} from '@dorkroom/logic';

interface ModeToggleProps {
  isEnlargerHeightMode: boolean;
  setIsEnlargerHeightMode: (value: boolean) => void;
}

function ModeToggle({
  isEnlargerHeightMode,
  setIsEnlargerHeightMode,
}: ModeToggleProps) {
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
            onValueChange={setIsEnlargerHeightMode}
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

export default function ResizeCalculatorPage() {
  const { unit } = useMeasurement();
  const unitLabel = unit === 'imperial' ? 'in' : 'cm';
  const { toInches, toDisplay } = useMeasurementConverter();

  const {
    isEnlargerHeightMode,
    setIsEnlargerHeightMode,
    originalWidth,
    setOriginalWidth: setOriginalWidthInches,
    originalLength,
    setOriginalLength: setOriginalLengthInches,
    newWidth,
    setNewWidth: setNewWidthInches,
    newLength,
    setNewLength: setNewLengthInches,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
    originalHeight,
    setOriginalHeight: setOriginalHeightInches,
    newHeight,
    setNewHeight: setNewHeightInches,
  } = useResizeCalculator();

  // Local string state for dimension inputs (in display units)
  const [originalWidthInput, setOriginalWidthInput] = useState(
    String(toDisplay(Number(originalWidth)))
  );
  const [originalLengthInput, setOriginalLengthInput] = useState(
    String(toDisplay(Number(originalLength)))
  );
  const [newWidthInput, setNewWidthInput] = useState(
    String(toDisplay(Number(newWidth)))
  );
  const [newLengthInput, setNewLengthInput] = useState(
    String(toDisplay(Number(newLength)))
  );
  const [originalHeightInput, setOriginalHeightInput] = useState(
    String(toDisplay(Number(originalHeight)))
  );
  const [newHeightInput, setNewHeightInput] = useState(
    String(toDisplay(Number(newHeight)))
  );

  // Editing flags to prevent sync while user is typing
  const [isEditingOriginalWidth, setIsEditingOriginalWidth] = useState(false);
  const [isEditingOriginalLength, setIsEditingOriginalLength] = useState(false);
  const [isEditingNewWidth, setIsEditingNewWidth] = useState(false);
  const [isEditingNewLength, setIsEditingNewLength] = useState(false);
  const [isEditingOriginalHeight, setIsEditingOriginalHeight] = useState(false);
  const [isEditingNewHeight, setIsEditingNewHeight] = useState(false);

  // Sync local state when parent state or unit changes (but not while editing)
  useEffect(() => {
    if (!isEditingOriginalWidth) {
      setOriginalWidthInput(String(toDisplay(Number(originalWidth))));
    }
  }, [originalWidth, toDisplay, isEditingOriginalWidth]);

  useEffect(() => {
    if (!isEditingOriginalLength) {
      setOriginalLengthInput(String(toDisplay(Number(originalLength))));
    }
  }, [originalLength, toDisplay, isEditingOriginalLength]);

  useEffect(() => {
    if (!isEditingNewWidth) {
      setNewWidthInput(String(toDisplay(Number(newWidth))));
    }
  }, [newWidth, toDisplay, isEditingNewWidth]);

  useEffect(() => {
    if (!isEditingNewLength) {
      setNewLengthInput(String(toDisplay(Number(newLength))));
    }
  }, [newLength, toDisplay, isEditingNewLength]);

  useEffect(() => {
    if (!isEditingOriginalHeight) {
      setOriginalHeightInput(String(toDisplay(Number(originalHeight))));
    }
  }, [originalHeight, toDisplay, isEditingOriginalHeight]);

  useEffect(() => {
    if (!isEditingNewHeight) {
      setNewHeightInput(String(toDisplay(Number(newHeight))));
    }
  }, [newHeight, toDisplay, isEditingNewHeight]);

  // Helper to validate and convert input to inches
  const validateAndConvert = (value: string): string | null => {
    // Allow empty, whitespace, or trailing decimal point
    if (value === '' || /^\s*$/.test(value) || /^\d*\.$/.test(value)) {
      return null;
    }

    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return String(toInches(parsed));
    }

    return null;
  };

  // Create handlers for each input
  const handleOriginalWidthChange = (value: string) => {
    setIsEditingOriginalWidth(true);
    setOriginalWidthInput(value);
  };

  const handleOriginalWidthBlur = () => {
    setIsEditingOriginalWidth(false);
    const inches = validateAndConvert(originalWidthInput);
    if (inches !== null) {
      setOriginalWidthInches(inches);
    } else if (originalWidthInput === '' || /^\s*$/.test(originalWidthInput)) {
      setOriginalWidthInput(String(toDisplay(Number(originalWidth))));
    }
  };

  const handleOriginalLengthChange = (value: string) => {
    setIsEditingOriginalLength(true);
    setOriginalLengthInput(value);
  };

  const handleOriginalLengthBlur = () => {
    setIsEditingOriginalLength(false);
    const inches = validateAndConvert(originalLengthInput);
    if (inches !== null) {
      setOriginalLengthInches(inches);
    } else if (
      originalLengthInput === '' ||
      /^\s*$/.test(originalLengthInput)
    ) {
      setOriginalLengthInput(String(toDisplay(Number(originalLength))));
    }
  };

  const handleNewWidthChange = (value: string) => {
    setIsEditingNewWidth(true);
    setNewWidthInput(value);
  };

  const handleNewWidthBlur = () => {
    setIsEditingNewWidth(false);
    const inches = validateAndConvert(newWidthInput);
    if (inches !== null) {
      setNewWidthInches(inches);
    } else if (newWidthInput === '' || /^\s*$/.test(newWidthInput)) {
      setNewWidthInput(String(toDisplay(Number(newWidth))));
    }
  };

  const handleNewLengthChange = (value: string) => {
    setIsEditingNewLength(true);
    setNewLengthInput(value);
  };

  const handleNewLengthBlur = () => {
    setIsEditingNewLength(false);
    const inches = validateAndConvert(newLengthInput);
    if (inches !== null) {
      setNewLengthInches(inches);
    } else if (newLengthInput === '' || /^\s*$/.test(newLengthInput)) {
      setNewLengthInput(String(toDisplay(Number(newLength))));
    }
  };

  const handleOriginalHeightChange = (value: string) => {
    setIsEditingOriginalHeight(true);
    setOriginalHeightInput(value);
  };

  const handleOriginalHeightBlur = () => {
    setIsEditingOriginalHeight(false);
    const inches = validateAndConvert(originalHeightInput);
    if (inches !== null) {
      setOriginalHeightInches(inches);
    } else if (
      originalHeightInput === '' ||
      /^\s*$/.test(originalHeightInput)
    ) {
      setOriginalHeightInput(String(toDisplay(Number(originalHeight))));
    }
  };

  const handleNewHeightChange = (value: string) => {
    setIsEditingNewHeight(true);
    setNewHeightInput(value);
  };

  const handleNewHeightBlur = () => {
    setIsEditingNewHeight(false);
    const inches = validateAndConvert(newHeightInput);
    if (inches !== null) {
      setNewHeightInches(inches);
    } else if (newHeightInput === '' || /^\s*$/.test(newHeightInput)) {
      setNewHeightInput(String(toDisplay(Number(newHeight))));
    }
  };

  const stopsNumber = parseFloat(stopsDifference);
  const stopsHelper = Number.isFinite(stopsNumber)
    ? stopsNumber > 0
      ? 'The new print is larger, add exposure.'
      : stopsNumber < 0
      ? 'The new print is smaller, remove exposure.'
      : 'Same size print — keep your original exposure.'
    : undefined;

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
            <ModeToggle
              isEnlargerHeightMode={isEnlargerHeightMode}
              setIsEnlargerHeightMode={setIsEnlargerHeightMode}
            />

            {!isEnlargerHeightMode ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3
                    className="text-sm font-semibold uppercase tracking-[0.25em]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Original print
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CalculatorNumberField
                      label="Width"
                      value={originalWidthInput}
                      onChange={handleOriginalWidthChange}
                      onBlur={handleOriginalWidthBlur}
                      placeholder={String(
                        toDisplay(Number(DEFAULT_ORIGINAL_WIDTH))
                      )}
                      step={0.1}
                      unit={unitLabel}
                    />
                    <CalculatorNumberField
                      label="Height"
                      value={originalLengthInput}
                      onChange={handleOriginalLengthChange}
                      onBlur={handleOriginalLengthBlur}
                      placeholder={String(
                        toDisplay(Number(DEFAULT_ORIGINAL_LENGTH))
                      )}
                      step={0.1}
                      unit={unitLabel}
                    />
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
                    <CalculatorNumberField
                      label="Width"
                      value={newWidthInput}
                      onChange={handleNewWidthChange}
                      onBlur={handleNewWidthBlur}
                      placeholder={String(toDisplay(Number(DEFAULT_NEW_WIDTH)))}
                      step={0.1}
                      unit={unitLabel}
                    />
                    <CalculatorNumberField
                      label="Height"
                      value={newLengthInput}
                      onChange={handleNewLengthChange}
                      onBlur={handleNewLengthBlur}
                      placeholder={String(
                        toDisplay(Number(DEFAULT_NEW_LENGTH))
                      )}
                      step={0.1}
                      unit={unitLabel}
                    />
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
                  <CalculatorNumberField
                    label="Original height"
                    value={originalHeightInput}
                    onChange={handleOriginalHeightChange}
                    onBlur={handleOriginalHeightBlur}
                    placeholder={String(
                      toDisplay(Number(DEFAULT_ORIGINAL_HEIGHT))
                    )}
                    step={1}
                    unit={unitLabel}
                  />
                  <CalculatorNumberField
                    label="New height"
                    value={newHeightInput}
                    onChange={handleNewHeightChange}
                    onBlur={handleNewHeightBlur}
                    placeholder={String(toDisplay(Number(DEFAULT_NEW_HEIGHT)))}
                    step={1}
                    unit={unitLabel}
                  />
                </div>
              </div>
            )}

            {!isEnlargerHeightMode && !isAspectRatioMatched && (
              <WarningAlert
                message="The aspect ratios of the original and target prints do not match. Try to match the aspect ratio of the original print to the target print as close as possible."
                action="warning"
              />
            )}

            <div className="space-y-3">
              <h3
                className="text-sm font-semibold uppercase tracking-[0.25em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Original exposure
              </h3>
              <CalculatorNumberField
                label="Time"
                value={originalTime}
                onChange={setOriginalTime}
                placeholder={DEFAULT_ORIGINAL_TIME}
                step={0.5}
                unit="seconds"
                helperText="This is the exposure that worked for your original print."
              />
            </div>
          </CalculatorCard>

          {newTime && (
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
          )}
        </div>

        <div className="space-y-6">
          <InfoSection isEnlargerHeightMode={isEnlargerHeightMode} />
        </div>
      </div>
    </div>
  );
}
