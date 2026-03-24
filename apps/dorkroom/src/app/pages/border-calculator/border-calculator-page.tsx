import {
  BorderCalculatorProvider,
  MobileBorderLayout,
  ResponsiveBorderLayout,
} from '@dorkroom/ui/border-calculator';
import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';

export default function BorderCalculatorPage() {
  const { isDesktop, ...contextValue } = useBorderCalculatorController();

  return (
    <BorderCalculatorProvider value={contextValue}>
      {isDesktop ? <ResponsiveBorderLayout /> : <MobileBorderLayout />}
    </BorderCalculatorProvider>
  );
}
