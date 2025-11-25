import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useEffect, useRef, useMemo, type ChangeEvent, type FC } from 'react';
import {
  CalculatorCard,
  CalculatorPageHeader,
  CalculatorNumberField,
  CalculatorStat,
  ResultRow,
  splitGradeCalculatorSchema,
  createZodFormValidator,
  Select,
  ToggleSwitch,
} from '@dorkroom/ui';
import {
  SPLIT_GRADE_STORAGE_KEY,
  SPLIT_GRADE_PRESETS,
  SOFT_GRADE_OPTIONS,
  HARD_GRADE_OPTIONS,
  GRADE_FILTER_FACTORS,
  DEFAULT_SPLIT_GRADE_BASE_TIME,
  DEFAULT_SPLIT_GRADE_CONTRAST_BALANCE,
  DEFAULT_SPLIT_GRADE_SOFT_GRADE,
  DEFAULT_SPLIT_GRADE_HARD_GRADE,
  DEFAULT_SPLIT_GRADE_USE_FILTER_FACTORS,
  calculateSplitGrade,
  formatSplitGradeTime,
  getGradeInfo,
  debugWarn,
  type ContrastGrade,
  type SplitGradeFormState,
  type SplitGradePreset,
} from '@dorkroom/logic';
import { useTheme, themes } from '@dorkroom/ui';

const validateSplitGradeForm = createZodFormValidator(
  splitGradeCalculatorSchema
);

const HOW_TO_USE = [
  {
    title: 'Set your base exposure time',
    description:
      'Enter the total exposure time you want to work with. This is typically what you would use for a normal single-grade print.',
  },
  {
    title: 'Adjust the contrast balance',
    description:
      'Slide toward "Soft" for more shadow detail with less contrast, or toward "Hard" for punchier highlights with more contrast.',
  },
  {
    title: 'Make two exposures',
    description:
      'First expose at the soft grade for the calculated time, then change filters and expose at the hard grade.',
  },
];

const SPLIT_GRADE_INSIGHTS = [
  {
    title: 'Why split-grade?',
    description:
      'Split-grade printing gives you independent control over shadows and highlights. You can adjust one without affecting the other.',
  },
  {
    title: 'Shadow vs highlight control',
    description:
      'The soft exposure builds shadow detail and midtones. The hard exposure adds highlight separation and "snap" to the print.',
  },
  {
    title: 'Filter factors',
    description:
      'Different grade filters transmit different amounts of light. The calculator compensates for this automatically.',
  },
  {
    title: 'Fine-tuning',
    description:
      'After your initial split exposure, you can dodge/burn at specific grades for even more control over local contrast.',
  },
];

interface PresetButtonProps {
  preset: SplitGradePreset;
  onPress: (balance: number) => void;
  isActive: boolean;
  theme: ReturnType<typeof useTheme>;
}

const PresetButton: FC<PresetButtonProps> = ({
  preset,
  onPress,
  isActive,
  theme,
}) => {
  const currentTheme = themes[theme.resolvedTheme];

  return (
    <button
      type="button"
      onClick={() => onPress(preset.contrastBalance)}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors border"
      style={{
        backgroundColor: isActive ? currentTheme.primary : currentTheme.surface,
        borderColor: isActive
          ? currentTheme.primary
          : currentTheme.border.primary,
        color: isActive ? '#ffffff' : currentTheme.text.primary,
      }}
      title={preset.description}
    >
      {preset.label}
    </button>
  );
};

export default function SplitGradeCalculatorPage() {
  const theme = useTheme();
  const currentTheme = themes[theme.resolvedTheme];
  const hydrationRef = useRef(false);

  const form = useForm({
    defaultValues: {
      baseTime: DEFAULT_SPLIT_GRADE_BASE_TIME,
      contrastBalance: DEFAULT_SPLIT_GRADE_CONTRAST_BALANCE,
      softGrade: DEFAULT_SPLIT_GRADE_SOFT_GRADE,
      hardGrade: DEFAULT_SPLIT_GRADE_HARD_GRADE,
      useFilterFactors: DEFAULT_SPLIT_GRADE_USE_FILTER_FACTORS,
    } as SplitGradeFormState,
    validators: {
      onChange: validateSplitGradeForm,
    },
  });

  // Subscribe to form values
  const formValues = useStore(
    form.store,
    (state) => state.values as SplitGradeFormState
  );

  // Create a memoized snapshot of persistable state
  const persistableSnapshot = useMemo(
    () => ({
      baseTime: formValues.baseTime,
      contrastBalance: formValues.contrastBalance,
      softGrade: formValues.softGrade,
      hardGrade: formValues.hardGrade,
      useFilterFactors: formValues.useFilterFactors,
    }),
    [
      formValues.baseTime,
      formValues.contrastBalance,
      formValues.softGrade,
      formValues.hardGrade,
      formValues.useFilterFactors,
    ]
  );

  // Hydrate from persisted state on mount (runs exactly once)
  useEffect(() => {
    if (hydrationRef.current || typeof window === 'undefined') return;
    hydrationRef.current = true;

    try {
      const raw = window.localStorage.getItem(SPLIT_GRADE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      if (
        typeof parsed.baseTime === 'number' &&
        Number.isFinite(parsed.baseTime)
      ) {
        form.setFieldValue('baseTime', parsed.baseTime);
      }
      if (
        typeof parsed.contrastBalance === 'number' &&
        Number.isFinite(parsed.contrastBalance)
      ) {
        form.setFieldValue('contrastBalance', parsed.contrastBalance);
      }
      if (parsed.softGrade && SOFT_GRADE_OPTIONS.includes(parsed.softGrade)) {
        form.setFieldValue('softGrade', parsed.softGrade);
      }
      if (parsed.hardGrade && HARD_GRADE_OPTIONS.includes(parsed.hardGrade)) {
        form.setFieldValue('hardGrade', parsed.hardGrade);
      }
      if (typeof parsed.useFilterFactors === 'boolean') {
        form.setFieldValue('useFilterFactors', parsed.useFilterFactors);
      }
    } catch (error) {
      debugWarn('Failed to load split-grade calculator state', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist form state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        SPLIT_GRADE_STORAGE_KEY,
        JSON.stringify(persistableSnapshot)
      );
    } catch (error) {
      debugWarn('Failed to save split-grade calculator state', error);
    }
  }, [persistableSnapshot]);

  const handlePresetSelect = (balance: number) => {
    form.setFieldValue('contrastBalance', balance);
  };

  // Build grade options for select dropdowns
  const softGradeSelectOptions = SOFT_GRADE_OPTIONS.map((grade) => {
    const info = getGradeInfo(grade);
    return {
      value: grade,
      label: info?.label ?? `Grade ${grade}`,
    };
  });

  const hardGradeSelectOptions = HARD_GRADE_OPTIONS.map((grade) => {
    const info = getGradeInfo(grade);
    return {
      value: grade,
      label: info?.label ?? `Grade ${grade}`,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <CalculatorPageHeader
        eyebrow="Multigrade Printing"
        title="Split-Grade Calculator"
        description="Calculate split-grade exposures for B&W multigrade paper. Control shadows and highlights independently for superior print quality."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <CalculatorCard
            title="Exposure inputs"
            description="Set your base exposure time and adjust the contrast balance between soft and hard grades."
          >
            <form.Field name="baseTime">
              {(field) => (
                <CalculatorNumberField
                  label="Base exposure time"
                  value={String(field.state.value)}
                  onChange={(value: string) => {
                    const parsed = parseFloat(value);
                    const finiteValue = Number.isFinite(parsed) ? parsed : 0;
                    field.handleChange(finiteValue);
                  }}
                  onBlur={field.handleBlur}
                  placeholder="10"
                  step={0.5}
                  unit="seconds"
                  helperText="Total exposure time to split between soft and hard grades"
                />
              )}
            </form.Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                  Contrast balance
                </label>
                <form.Field name="contrastBalance">
                  {(field) => (
                    <span
                      className="text-sm font-mono"
                      style={{ color: currentTheme.text.secondary }}
                    >
                      {field.state.value}% hard
                    </span>
                  )}
                </form.Field>
              </div>

              <form.Field name="contrastBalance">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-medium whitespace-nowrap"
                        style={{ color: currentTheme.text.tertiary }}
                      >
                        Soft
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={field.state.value}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          field.handleChange(parseInt(e.target.value, 10));
                        }}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${currentTheme.primary} ${field.state.value}%, ${currentTheme.border.secondary} ${field.state.value}%)`,
                        }}
                      />
                      <span
                        className="text-xs font-medium whitespace-nowrap"
                        style={{ color: currentTheme.text.tertiary }}
                      >
                        Hard
                      </span>
                    </div>
                    <p className="text-xs text-center text-[color:var(--color-text-tertiary)]">
                      Lower values = more shadow detail, higher = more contrast
                    </p>
                  </div>
                )}
              </form.Field>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-2 justify-center pt-2">
                {SPLIT_GRADE_PRESETS.map((preset) => (
                  <form.Subscribe
                    key={preset.label}
                    selector={(state) => state.values.contrastBalance}
                  >
                    {(balance) => (
                      <PresetButton
                        preset={preset}
                        onPress={handlePresetSelect}
                        isActive={balance === preset.contrastBalance}
                        theme={theme}
                      />
                    )}
                  </form.Subscribe>
                ))}
              </div>
            </div>

            {/* Grade selection */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <form.Field name="softGrade">
                {(field) => (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                      Soft grade
                    </label>
                    <Select
                      selectedValue={field.state.value}
                      onValueChange={(value: string) =>
                        field.handleChange(value as ContrastGrade)
                      }
                      items={softGradeSelectOptions}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="hardGrade">
                {(field) => (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                      Hard grade
                    </label>
                    <Select
                      selectedValue={field.state.value}
                      onValueChange={(value: string) =>
                        field.handleChange(value as ContrastGrade)
                      }
                      items={hardGradeSelectOptions}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Filter factor compensation toggle */}
            <div
              className="rounded-xl p-4 mt-2"
              style={{
                backgroundColor: `${currentTheme.background}10`,
                borderWidth: 1,
                borderColor: currentTheme.border.secondary,
              }}
            >
              <form.Field name="useFilterFactors">
                {(field) => (
                  <div className="space-y-2">
                    <ToggleSwitch
                      label="Apply filter factor compensation"
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    />
                    <p
                      className="text-xs"
                      style={{ color: currentTheme.text.tertiary }}
                    >
                      {field.state.value
                        ? 'Using filter factors for under-lens filters. Times adjusted for each grade.'
                        : 'No compensation - for enlargers with built-in ND filters (color heads, Ilford MG heads).'}
                    </p>
                  </div>
                )}
              </form.Field>
            </div>
          </CalculatorCard>

          <form.Subscribe
            selector={(state) => {
              const {
                baseTime,
                contrastBalance,
                softGrade,
                hardGrade,
                useFilterFactors,
              } = state.values;
              return calculateSplitGrade(
                baseTime,
                contrastBalance,
                softGrade,
                hardGrade,
                useFilterFactors
              );
            }}
          >
            {(calculation) => (
              <CalculatorCard
                title="Split-grade exposures"
                description="Make these two exposures sequentially, changing filters between them."
                accent="emerald"
                padding="compact"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <CalculatorStat
                    label="Soft exposure"
                    value={formatSplitGradeTime(calculation.softTime)}
                    helperText={
                      <form.Subscribe
                        selector={(state) => state.values.softGrade}
                      >
                        {(softGrade) => {
                          return `Grade ${softGrade} • ${calculation.softPercentage.toFixed(
                            0
                          )}% of total`;
                        }}
                      </form.Subscribe>
                    }
                    tone="default"
                  />
                  <CalculatorStat
                    label="Hard exposure"
                    value={formatSplitGradeTime(calculation.hardTime)}
                    helperText={
                      <form.Subscribe
                        selector={(state) => state.values.hardGrade}
                      >
                        {(hardGrade) => {
                          return `Grade ${hardGrade} • ${calculation.hardPercentage.toFixed(
                            0
                          )}% of total`;
                        }}
                      </form.Subscribe>
                    }
                  />
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{
                    borderWidth: 1,
                    borderColor: currentTheme.border.secondary,
                    backgroundColor: `${currentTheme.background}20`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: currentTheme.text.tertiary }}
                    >
                      Exposure Sequence
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: currentTheme.primary,
                          color: '#ffffff',
                        }}
                      >
                        1
                      </span>
                      <form.Subscribe
                        selector={(state) => state.values.softGrade}
                      >
                        {(softGrade) => (
                          <span style={{ color: currentTheme.text.primary }}>
                            Expose at <strong>Grade {softGrade}</strong> for{' '}
                            <strong>
                              {formatSplitGradeTime(calculation.softTime)}
                            </strong>
                          </span>
                        )}
                      </form.Subscribe>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: currentTheme.primary,
                          color: '#ffffff',
                        }}
                      >
                        2
                      </span>
                      <form.Subscribe
                        selector={(state) => state.values.hardGrade}
                      >
                        {(hardGrade) => (
                          <span style={{ color: currentTheme.text.primary }}>
                            Expose at <strong>Grade {hardGrade}</strong> for{' '}
                            <strong>
                              {formatSplitGradeTime(calculation.hardTime)}
                            </strong>
                          </span>
                        )}
                      </form.Subscribe>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <ResultRow
                    label="Total exposure time"
                    value={formatSplitGradeTime(calculation.totalTime)}
                  />
                  <form.Subscribe selector={(state) => state.values.baseTime}>
                    {(baseTime) => (
                      <ResultRow
                        label="Base time input"
                        value={formatSplitGradeTime(baseTime)}
                      />
                    )}
                  </form.Subscribe>
                  <form.Subscribe
                    selector={(state) => state.values.contrastBalance}
                  >
                    {(balance) => (
                      <ResultRow
                        label="Contrast balance"
                        value={`${100 - balance}% soft / ${balance}% hard`}
                      />
                    )}
                  </form.Subscribe>
                </div>
              </CalculatorCard>
            )}
          </form.Subscribe>
        </div>

        <div className="space-y-6">
          <CalculatorCard
            title="How to use this calculator"
            description="A quick guide to split-grade printing for better B&W prints."
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
            title="Understanding split-grade printing"
            description="Why this technique gives you more control over your prints."
          >
            <ul className="space-y-3">
              {SPLIT_GRADE_INSIGHTS.map((item) => (
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

          <form.Subscribe selector={(state) => state.values.useFilterFactors}>
            {(useFilterFactors) =>
              useFilterFactors ? (
                <CalculatorCard
                  title="Filter factors reference"
                  description="Exposure compensation being applied for common multigrade filters."
                >
                  <div className="space-y-2">
                    {GRADE_FILTER_FACTORS.filter(
                      (f) =>
                        SOFT_GRADE_OPTIONS.includes(f.grade as ContrastGrade) ||
                        HARD_GRADE_OPTIONS.includes(f.grade as ContrastGrade)
                    ).map((factor) => (
                      <div
                        key={factor.grade}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                        style={{ borderColor: currentTheme.border.secondary }}
                      >
                        <div>
                          <span
                            className="text-sm font-medium"
                            style={{ color: currentTheme.text.primary }}
                          >
                            {factor.label}
                          </span>
                          <p
                            className="text-xs"
                            style={{ color: currentTheme.text.tertiary }}
                          >
                            {factor.description}
                          </p>
                        </div>
                        <span
                          className="text-sm font-mono"
                          style={{ color: currentTheme.text.secondary }}
                        >
                          ×{factor.factor}
                        </span>
                      </div>
                    ))}
                  </div>
                </CalculatorCard>
              ) : (
                <CalculatorCard
                  title="Compensated enlarger mode"
                  description="Filter factor compensation is disabled."
                >
                  <p
                    className="text-sm"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    You&apos;re using an enlarger with built-in exposure
                    compensation (like a color head or Ilford Multigrade head
                    with ND filters). The calculator will use equal times for
                    each grade based purely on your contrast balance setting.
                  </p>
                </CalculatorCard>
              )
            }
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}
