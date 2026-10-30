import {
  BorderCalculatorProvider,
  MobileBorderLayout,
  ResponsiveBorderLayout,
} from '@dorkroom/ui/border-calculator';
import { ResultAnnouncer } from '@dorkroom/ui/calculator';
import { useCalculatorAnalytics } from '../../lib/analytics/use-calculator-analytics';
import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';

export default function BorderCalculatorPage() {
  const { isDesktop, ...contextValue } = useBorderCalculatorController();

  // The offsets toggle is the calculator's mode: with it off every border is
  // the same width, with it on the print is deliberately shifted on the paper.
  // Reading it here rather than defaulting to `default` is the whole reason
  // `symmetric`/`asymmetric` exist in the mode union.
  useCalculatorAnalytics({
    tool: 'border',
    mode: contextValue.formValues.enableOffset ? 'asymmetric' : 'symmetric',
  });

  const { calculation, formatWithUnit } = contextValue;

  return (
    <BorderCalculatorProvider value={contextValue}>
      {/* Mounted once, outside the layout switch, so only one live region
          exists whichever layout is showing. */}
      <ResultAnnouncer
        message={
          calculation
            ? `Blade readings left ${formatWithUnit(calculation.leftBladeReading)}, top ${formatWithUnit(calculation.topBladeReading)}, bottom ${formatWithUnit(calculation.bottomBladeReading)}, right ${formatWithUnit(calculation.rightBladeReading)}`
            : ''
        }
      />
      {isDesktop ? <ResponsiveBorderLayout /> : <MobileBorderLayout />}
    </BorderCalculatorProvider>
  );
}
