import { RotateCw, RotateCcw, Square } from 'lucide-react';
import { useStore } from '@tanstack/react-store';
import type { BorderCalculation } from '@dorkroom/logic';
import type { FormInstance } from '../../index';
import { CalculatorCard } from '../calculator/calculator-card';

interface PreviewAndControlsSectionProps {
  form: FormInstance;
  calculation: BorderCalculation;
  AnimatedPreview: React.ComponentType<{
    calculation: BorderCalculation;
    showBlades: boolean;
    showBladeReadings: boolean;
    className?: string;
  }>;
  onResetToDefaults: () => void;
}

/**
 * Section for displaying the print preview and control buttons
 * Shows the animated preview with blade visualization and flip controls
 */
export function PreviewAndControlsSection({
  form,
  calculation,
  AnimatedPreview,
  onResetToDefaults,
}: PreviewAndControlsSectionProps) {
  const showBlades = useStore(form.store, (state) => state.values.showBlades);
  const showBladeReadings = useStore(
    form.store,
    (state) => state.values.showBladeReadings
  );
  const isLandscape = useStore(form.store, (state) => state.values.isLandscape);

  return (
    <CalculatorCard accent="violet" padding="compact">
      <div className="flex justify-center">
        <div className="relative">
          <AnimatedPreview
            calculation={calculation}
            showBlades={showBlades}
            showBladeReadings={showBladeReadings}
            className="max-w-full"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => {
            const newValue = !form.getFieldValue('isLandscape');
            form.setFieldValue('isLandscape', newValue);
            form.setFieldValue('hasManuallyFlippedPaper', true);
          }}
          className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
        >
          <RotateCw className="h-4 w-4" />
          Flip Paper
        </button>
        <button
          onClick={() => {
            const newValue = !form.getFieldValue('isRatioFlipped');
            form.setFieldValue('isRatioFlipped', newValue);
          }}
          className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
        >
          <Square className="h-4 w-4" />
          Flip Ratio
        </button>
      </div>
      <button
        onClick={onResetToDefaults}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 hover:brightness-110"
        style={{
          color: 'var(--color-accent)',
          borderColor: 'var(--color-accent)',
          borderWidth: 1,
          backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
        }}
      >
        <RotateCcw className="h-4 w-4" />
        Reset to defaults
      </button>

      {(() => {
        // Show message when paper orientation is vertical (portrait)
        // Show when NOT landscape (vertical orientation) and NOT 1:1 aspect ratio
        const isSquareAspectRatio =
          Math.abs(calculation.printWidth - calculation.printHeight) < 0.01;
        const shouldShow = !isLandscape && !isSquareAspectRatio;
        return (
          shouldShow && (
            <div
              className="mt-4 rounded-2xl px-4 py-3 text-center text-sm"
              style={{
                borderWidth: 1,
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-border-muted)',
                color: 'var(--color-text-primary)',
              }}
            >
              <strong className="font-semibold">Rotate your easel</strong>
              <br />
              Paper is in vertical orientation. Rotate your easel 90° to match
              the blade readings.
            </div>
          )
        );
      })()}

      {calculation.isNonStandardPaperSize && (
        <div
          className="mt-4 rounded-2xl px-4 py-3 text-center text-sm"
          style={{
            borderWidth: 1,
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-border-muted)',
            color: 'var(--color-text-primary)',
          }}
        >
          <strong className="font-semibold">Non-standard paper</strong>
          <br />
          Position paper in the {calculation.easelSizeLabel} slot all the way to
          the left.
        </div>
      )}
    </CalculatorCard>
  );
}
