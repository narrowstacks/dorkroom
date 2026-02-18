import {
  BorderCalculatorProvider,
  MobileBorderLayout,
  ResponsiveBorderLayout,
} from '@dorkroom/ui';
import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';

export default function BorderCalculatorPage() {
  const { isDesktop, ...contextValue } = useBorderCalculatorController();

  return (
    <BorderCalculatorProvider value={contextValue}>
      {isDesktop ? <ResponsiveBorderLayout /> : <MobileBorderLayout />}
    </BorderCalculatorProvider>
  );
}
