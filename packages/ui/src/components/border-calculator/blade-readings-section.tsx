import type { BorderCalculation } from '@dorkroom/logic';
import { CalculatorCard, CalculatorStat, WarningAlert } from '../../index';
import type { FormatDimensionsOptions } from '../../lib/measurement';

interface BladeReadingsSectionProps {
  calculation: BorderCalculation;
  isLandscape: boolean;
  formatWithUnit: (value: number) => string;
  formatDimensions: (
    width: number,
    height: number,
    options?: FormatDimensionsOptions
  ) => string;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;
}

/**
 * Section displaying blade readings and calculated dimensions
 * Shows the final image size and all blade measurements
 */
export function BladeReadingsSection({
  calculation,
  isLandscape,
  formatWithUnit,
  formatDimensions,
  bladeWarning,
  minBorderWarning,
  paperSizeWarning,
}: BladeReadingsSectionProps) {
  // Swap blade readings when paper is in portrait orientation (not landscape)
  // This accounts for the easel being rotated 90° when the paper is vertical
  const shouldSwapBlades = !isLandscape;

  return (
    <CalculatorCard
      title="Blade Readings"
      description="Dial these values on your easel for a centered print."
      accent="emerald"
      padding="compact"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CalculatorStat
          label="Left Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.topBladeReading
              : calculation.leftBladeReading
          )}
          className="p-4"
        />
        <CalculatorStat
          label="Right Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.bottomBladeReading
              : calculation.rightBladeReading
          )}
          className="p-4"
        />
        <CalculatorStat
          label="Top Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.leftBladeReading
              : calculation.topBladeReading
          )}
          className="p-4"
        />
        <CalculatorStat
          label="Bottom Blade"
          value={formatWithUnit(
            shouldSwapBlades
              ? calculation.rightBladeReading
              : calculation.bottomBladeReading
          )}
          className="p-4"
        />
        <CalculatorStat
          label="Image Size"
          value={formatDimensions(
            calculation.printWidth,
            calculation.printHeight,
            { maxPrecision: 3 }
          )}
          helperText="Final image area within the borders."
          className="sm:col-span-2 p-4"
        />
      </div>

      {bladeWarning && (
        <div className="mt-4">
          <WarningAlert message={bladeWarning} action="error" />
        </div>
      )}
      {minBorderWarning && (
        <div className="mt-4">
          <WarningAlert message={minBorderWarning} action="error" />
        </div>
      )}
      {paperSizeWarning && (
        <div className="mt-4">
          <WarningAlert message={paperSizeWarning} action="warning" />
        </div>
      )}
    </CalculatorCard>
  );
}
