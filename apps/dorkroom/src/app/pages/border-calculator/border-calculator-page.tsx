import { MobileBorderLayout, ResponsiveBorderLayout } from '@dorkroom/ui';
import { useBorderCalculatorController } from './hooks/use-border-calculator-controller';

export default function BorderCalculatorPage() {
  const controller = useBorderCalculatorController();

  if (!controller.isDesktop) {
    return <MobileBorderLayout {...controller} />;
  }

  return <ResponsiveBorderLayout {...controller} />;
}
