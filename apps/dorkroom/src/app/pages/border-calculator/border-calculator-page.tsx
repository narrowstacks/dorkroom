import {
  BorderCalculatorProvider,
  MobileBorderLayout,
  ResponsiveBorderLayout,
} from '@dorkroom/ui/border-calculator';
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

  return (
    <BorderCalculatorProvider value={contextValue}>
      {isDesktop ? <ResponsiveBorderLayout /> : <MobileBorderLayout />}
    </BorderCalculatorProvider>
  );
}
