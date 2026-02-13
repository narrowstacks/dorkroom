import type { BorderCalculation } from '@dorkroom/logic';
import { useStore } from '@tanstack/react-store';
import { RotateCcw, RotateCw, Square } from 'lucide-react';
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
  const aspectRatio = useStore(form.store, (state) => state.values.aspectRatio);
  const isEvenBordersSelected = aspectRatio === 'even-borders';
  const flipControlBaseClasses =
    'flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)]';
  const enabledFlipClasses =
    'hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]';

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
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            const newValue = !form.getFieldValue('isLandscape');
            form.setFieldValue('isLandscape', newValue);
            form.setFieldValue('hasManuallyFlippedPaper', true);
          }}
          className={`${flipControlBaseClasses} ${enabledFlipClasses}`}
        >
          <RotateCw className="h-4 w-4" />
          Flip Paper
        </button>
        <button
          type="button"
          onClick={() => {
            if (isEvenBordersSelected) return;
            const newValue = !form.getFieldValue('isRatioFlipped');
            form.setFieldValue('isRatioFlipped', newValue);
          }}
          className={`${flipControlBaseClasses} ${
            isEvenBordersSelected
              ? 'cursor-not-allowed opacity-50'
              : enabledFlipClasses
          }`}
          disabled={isEvenBordersSelected}
          aria-disabled={isEvenBordersSelected}
          title={
            isEvenBordersSelected
              ? 'Even borders automatically match your paper orientation; flipping is disabled.'
              : undefined
          }
        >
          <Square className="h-4 w-4" />
          Flip Ratio
        </button>
      </div>
      <button
        type="button"
        onClick={onResetToDefaults}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 hover:brightness-110"
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
        // Determine actual paper orientation from calculated dimensions
        // This correctly handles custom paper sizes where width > height (already landscape)
        const isPaperActuallyLandscape =
          calculation.paperWidth > calculation.paperHeight;
        // Show message when paper orientation is vertical (portrait)
        // Show when NOT landscape (vertical orientation) and NOT 1:1 aspect ratio
        const isSquareAspectRatio =
          Math.abs(calculation.printWidth - calculation.printHeight) < 0.01;
        const shouldShow = !isPaperActuallyLandscape && !isSquareAspectRatio;
        return (
          shouldShow && (
            <div
              className="mt-2 rounded-xl px-3 py-2 text-center text-xs"
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
          className="mt-2 rounded-xl px-3 py-2 text-center text-xs"
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
