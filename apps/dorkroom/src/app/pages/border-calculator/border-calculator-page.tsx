import {
  BorderCalculatorProvider,
  MobileBorderLayout,
  ResponsiveBorderLayout,
} from '@dorkroom/ui/border-calculator';
import { useCalculatorAnalytics } from '../../lib/analytics/use-calculator-analytics';
import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';

export default function BorderCalculatorPage() {
  const { isDesktop, ...contextValue } = useBorderCalculatorController();

  useCalculatorAnalytics({ tool: 'border' });

  return (
    <BorderCalculatorProvider value={contextValue}>
      {isDesktop ? <ResponsiveBorderLayout /> : <MobileBorderLayout />}
    </BorderCalculatorProvider>
  );
}
