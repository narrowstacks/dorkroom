import { CalculatorCard, CalculatorStat, StatusAlert } from '../../index';
import { useBorderCalculator } from './border-calculator-context';

/**
 * Section displaying blade readings and calculated dimensions
 * Shows the final image size and all blade measurements
 */
export function BladeReadingsSection() {
  const {
    calculation,
    formatWithUnit,
    formatDimensions,
    bladeWarning,
    minBorderWarning,
    paperSizeWarning,
  } = useBorderCalculator();

  if (!calculation) return null;

  // Determine actual paper orientation from calculated dimensions
  // This correctly handles custom paper sizes where width > height (already landscape)
  const isPaperActuallyLandscape =
    calculation.paperWidth > calculation.paperHeight;

  // Swap blade readings when paper is in portrait orientation (not landscape)
  // This accounts for the easel being rotated 90° when the paper is vertical
  const shouldSwapBlades = !isPaperActuallyLandscape;

  return (
    <CalculatorCard
      title="Blade Readings"
      description="Set your easel blades to these positions."
      accent="emerald"
      padding="compact"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <CalculatorStat
          label="Left Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.topBladeReading
              : calculation.leftBladeReading
          )}
        />
        <CalculatorStat
          label="Right Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.bottomBladeReading
              : calculation.rightBladeReading
          )}
        />
        <CalculatorStat
          label="Top Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.leftBladeReading
              : calculation.topBladeReading
          )}
        />
        <CalculatorStat
          label="Bottom Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.rightBladeReading
              : calculation.bottomBladeReading
          )}
        />
        <CalculatorStat
          label="Image Size"
          value={formatDimensions(
            calculation.printWidth,
            calculation.printHeight
          )}
          helperText="Final image area within the borders."
          className="sm:col-span-2"
        />
      </div>

      {bladeWarning && (
        <div className="mt-2">
          <StatusAlert message={bladeWarning} action="error" />
        </div>
      )}
      {minBorderWarning && (
        <div className="mt-2">
          <StatusAlert message={minBorderWarning} action="error" />
        </div>
      )}
      {paperSizeWarning && (
        <div className="mt-2">
          <StatusAlert message={paperSizeWarning} action="warning" />
        </div>
      )}
    </CalculatorCard>
  );
}
