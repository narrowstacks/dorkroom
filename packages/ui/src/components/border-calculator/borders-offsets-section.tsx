import type { FieldApi, FormInstance } from '../../index';
import { LabeledSliderInput, ToggleSwitch, WarningAlert } from '../../index';
import { CalculatorCard } from '../calculator/calculator-card';

interface BordersOffsetsSectionProps {
  form: FormInstance;
  sliderMinBorder: number;
  sliderMaxBorder: number;
  sliderStepBorder: number;
  borderSliderLabels: string[];
  offsetSliderMin: number;
  offsetSliderMax: number;
  offsetSliderStep: number;
  offsetSliderLabels: string[];
  offsetWarning: string | null;
  enableOffset: boolean;
  ignoreMinBorder: boolean;
  onRoundToQuarter?: () => void;
  roundToQuarterDisabled?: boolean;
}

/**
 * Section for controlling border thickness and offset adjustments
 * Allows setting minimum borders and fine-tuning print placement
 */
export function BordersOffsetsSection({
  form,
  sliderMinBorder,
  sliderMaxBorder,
  sliderStepBorder,
  borderSliderLabels,
  offsetSliderMin,
  offsetSliderMax,
  offsetSliderStep,
  offsetSliderLabels,
  offsetWarning,
  enableOffset,
  ignoreMinBorder: _ignoreMinBorder,
  onRoundToQuarter,
  roundToQuarterDisabled,
}: BordersOffsetsSectionProps) {
  return (
    <CalculatorCard
      title="Borders & Offsets"
      description="Control the border thickness and fine-tune print placement."
    >
      <div className="space-y-5">
        <form.Field name="minBorder">
          {(field: FieldApi<number>) => (
            <LabeledSliderInput
              label="Minimum border (inches)"
              value={field.state.value}
              onChange={(value: number) => {
                field.handleChange(value);
                form.setFieldValue('lastValidMinBorder', value);
              }}
              onSliderChange={(value: number) => {
                field.handleChange(value);
                form.setFieldValue('lastValidMinBorder', value);
              }}
              min={sliderMinBorder}
              max={sliderMaxBorder}
              step={sliderStepBorder}
              labels={borderSliderLabels}
              continuousUpdate
            />
          )}
        </form.Field>

        {onRoundToQuarter && (
          <button
            type="button"
            onClick={onRoundToQuarter}
            disabled={roundToQuarterDisabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
              color: 'var(--color-text-primary)',
            }}
            title="Round blade readings down to the nearest quarter inch"
          >
            Round to 1/4"
          </button>
        )}

        <form.Field name="enableOffset">
          {(field: FieldApi<boolean>) => (
            <ToggleSwitch
              label="Enable offsets"
              value={field.state.value}
              onValueChange={(value: boolean) => {
                field.handleChange(value);
              }}
            />
          )}
        </form.Field>

        {enableOffset && (
          <div
            className="space-y-4 rounded-2xl p-4 border"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
            }}
          >
            <form.Field name="ignoreMinBorder">
              {(field: FieldApi<boolean>) => (
                <>
                  <ToggleSwitch
                    label="Ignore min border"
                    value={field.state.value}
                    onValueChange={(value: boolean) => {
                      field.handleChange(value);
                    }}
                  />
                  {field.state.value && (
                    <p className="text-sm text-[color:var(--color-text-secondary)]">
                      Print can be positioned freely but will stay within the
                      paper edges.
                    </p>
                  )}
                </>
              )}
            </form.Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="horizontalOffset">
                {(field: FieldApi<number>) => (
                  <LabeledSliderInput
                    label="Horizontal offset"
                    value={field.state.value}
                    onChange={(value: number) => {
                      field.handleChange(value);
                    }}
                    onSliderChange={(value: number) => {
                      field.handleChange(value);
                    }}
                    min={offsetSliderMin}
                    max={offsetSliderMax}
                    step={offsetSliderStep}
                    labels={offsetSliderLabels}
                    warning={!!offsetWarning}
                    continuousUpdate
                  />
                )}
              </form.Field>
              <form.Field name="verticalOffset">
                {(field: FieldApi<number>) => (
                  <LabeledSliderInput
                    label="Vertical offset"
                    value={field.state.value}
                    onChange={(value: number) => {
                      field.handleChange(value);
                    }}
                    onSliderChange={(value: number) => {
                      field.handleChange(value);
                    }}
                    min={offsetSliderMin}
                    max={offsetSliderMax}
                    step={offsetSliderStep}
                    labels={offsetSliderLabels}
                    warning={!!offsetWarning}
                    continuousUpdate
                  />
                )}
              </form.Field>
            </div>

            {offsetWarning && (
              <WarningAlert message={offsetWarning} action="warning" />
            )}
          </div>
        )}
      </div>
    </CalculatorCard>
  );
}
