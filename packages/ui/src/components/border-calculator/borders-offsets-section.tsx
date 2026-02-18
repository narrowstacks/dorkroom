import {
  generateBorderSliderLabels,
  OFFSET_SLIDER_LABELS,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import { useMemo } from 'react';
import type { FieldApi } from '../../index';
import { LabeledSliderInput, StatusAlert, ToggleSwitch } from '../../index';
import { CalculatorCard } from '../calculator/calculator-card';
import { useBorderCalculator } from './border-calculator-context';

/**
 * Section for controlling border thickness and offset adjustments
 * Allows setting minimum borders and fine-tuning print placement
 */
export function BordersOffsetsSection() {
  const {
    form,
    formValues,
    maxAllowedMinBorder,
    quarterRoundedMinBorder,
    offsetWarning,
    handleRoundMinBorderToQuarter,
  } = useBorderCalculator();

  const { enableOffset } = formValues;

  const borderSliderLabels = useMemo(
    () => generateBorderSliderLabels(maxAllowedMinBorder),
    [maxAllowedMinBorder]
  );

  return (
    <CalculatorCard
      title="Borders & Offsets"
      description="Set border width and nudge the print position."
    >
      <div className="space-y-3.5">
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
              min={SLIDER_MIN_BORDER}
              max={maxAllowedMinBorder}
              step={SLIDER_STEP_BORDER}
              labels={borderSliderLabels}
              continuousUpdate
            />
          )}
        </form.Field>

        <button
          type="button"
          onClick={handleRoundMinBorderToQuarter}
          disabled={quarterRoundedMinBorder === null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
            color: 'var(--color-text-primary)',
          }}
          title="Round blade readings down to the nearest quarter inch"
        >
          Round to 1/4"
        </button>

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
            className="space-y-3 rounded-xl p-3 border"
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

            <div className="grid gap-3 sm:grid-cols-2">
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
                    min={OFFSET_SLIDER_MIN}
                    max={OFFSET_SLIDER_MAX}
                    step={OFFSET_SLIDER_STEP}
                    labels={OFFSET_SLIDER_LABELS}
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
                    min={OFFSET_SLIDER_MIN}
                    max={OFFSET_SLIDER_MAX}
                    step={OFFSET_SLIDER_STEP}
                    labels={OFFSET_SLIDER_LABELS}
                    warning={!!offsetWarning}
                    continuousUpdate
                  />
                )}
              </form.Field>
            </div>

            {offsetWarning && (
              <StatusAlert message={offsetWarning} action="warning" />
            )}
          </div>
        )}
      </div>
    </CalculatorCard>
  );
}
