import { CalculatorCard } from '../calculator/calculator-card';
import { CalculatorStat } from '../calculator/calculator-stat';
import { StatusAlert } from '../status-alert';
import { useBorderCalculator } from './border-calculator-context';
import { getEaselBladeReadings } from './easel-blade-readings';

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

  const blades = getEaselBladeReadings(calculation);

  return (
    <CalculatorCard
      title="Blade Readings"
      description="Set your easel blades to these positions."
      accent="indigo"
      padding="compact"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <CalculatorStat
          label="Left Blade"
          value={formatWithUnit(blades.left)}
        />
        <CalculatorStat
          label="Right Blade"
          value={formatWithUnit(blades.right)}
        />
        <CalculatorStat label="Top Blade" value={formatWithUnit(blades.top)} />
        <CalculatorStat
          label="Bottom Blade"
          value={formatWithUnit(blades.bottom)}
        />
        <CalculatorStat
          label="Image Size"
          value={formatDimensions(
            calculation.printWidth,
            calculation.printHeight,
            { maxPrecision: 2 }
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
